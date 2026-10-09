import crypto from 'crypto';
import { getDb } from '../db';
import {
  Order,
  OrderItem,
  OrderStatus,
  OrderItemStatus,
  ModifierSnapshot,
  Coupon,
  Restaurant,
} from '../db/types';
import { publishRealtimeEvent } from '../realtime';

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  modifierIds?: string[];
  note?: string;
}

export interface CreateOrderInput {
  restaurantId: string;
  tableSessionToken: string;
  items: CreateOrderItemInput[];
  note?: string;
  couponCode?: string;
  idempotencyKey?: string;
}

export function createOrderAtTable(input: CreateOrderInput): {
  success: boolean;
  order?: Order;
  error?: string;
} {
  const db = getDb();

  // 1. Idempotency check
  if (input.idempotencyKey) {
    const existing = db
      .prepare(`SELECT * FROM orders WHERE idempotency_key = ?`)
      .get(input.idempotencyKey) as Order | undefined;

    if (existing) {
      const items = db
        .prepare(`SELECT * FROM order_items WHERE order_id = ?`)
        .all(existing.id) as OrderItem[];
      return { success: true, order: { ...existing, items } };
    }
  }

  // 2. Validate session and table
  const session = db
    .prepare(
      `SELECT s.*, t.code as table_code, t.name as table_name
       FROM table_sessions s
       JOIN tables t ON s.table_id = t.id
       WHERE s.session_token = ? AND s.restaurant_id = ? AND s.is_active = 1`
    )
    .get(input.tableSessionToken, input.restaurantId) as
    | { id: string; table_id: string; table_code: string; table_name: string }
    | undefined;

  if (!session) {
    return { success: false, error: 'Phiên bàn không hợp lệ hoặc đã kết thúc. Vui lòng quét lại mã QR tại bàn.' };
  }

  // 3. Get restaurant settings (tax, service charge)
  const restaurant = db
    .prepare(`SELECT * FROM restaurants WHERE id = ?`)
    .get(input.restaurantId) as Restaurant | undefined;

  if (!restaurant) {
    return { success: false, error: 'Nhà hàng không tồn tại.' };
  }

  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'Vui lòng chọn ít nhất 1 món ăn trong giỏ hàng.' };
  }

  // 4. Server-Side Price Calculation & Product Availability Validation
  let subtotal = 0;
  const processedItems: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    modifiersSnapshot: ModifierSnapshot[];
    note: string | null;
    lineTotal: number;
  }[] = [];

  for (const itemInput of input.items) {
    if (itemInput.quantity <= 0) continue;

    // Fetch product fresh from DB
    const product = db
      .prepare(`SELECT * FROM products WHERE id = ? AND restaurant_id = ?`)
      .get(itemInput.productId, input.restaurantId) as
      | { id: string; name: string; base_price: number; discount_price: number | null; is_available: number }
      | undefined;

    if (!product) {
      return { success: false, error: `Món ăn với ID ${itemInput.productId} không tồn tại.` };
    }

    if (!product.is_available) {
      return { success: false, error: `Rất tiếc, món "${product.name}" hiện tại đã hết hàng.` };
    }

    const effectiveBasePrice =
      product.discount_price !== null && product.discount_price > 0
        ? product.discount_price
        : product.base_price;

    let modifiersExtraPerItem = 0;
    const modifiersSnapshot: ModifierSnapshot[] = [];

    if (itemInput.modifierIds && itemInput.modifierIds.length > 0) {
      for (const modId of itemInput.modifierIds) {
        const mod = db
          .prepare(
            `SELECT m.*, g.name as group_name
             FROM modifiers m
             JOIN modifier_groups g ON m.group_id = g.id
             WHERE m.id = ? AND g.restaurant_id = ? AND m.is_available = 1`
          )
          .get(modId, input.restaurantId) as
          | { id: string; group_id: string; group_name: string; name: string; price_delta: number }
          | undefined;

        if (mod) {
          modifiersExtraPerItem += mod.price_delta;
          modifiersSnapshot.push({
            groupId: mod.group_id,
            groupName: mod.group_name,
            modifierId: mod.id,
            name: mod.name,
            priceDelta: mod.price_delta,
          });
        }
      }
    }

    const unitPrice = effectiveBasePrice + modifiersExtraPerItem;
    const lineTotal = unitPrice * itemInput.quantity;
    subtotal += lineTotal;

    processedItems.push({
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity: itemInput.quantity,
      modifiersSnapshot,
      note: itemInput.note ? itemInput.note.trim() : null,
      lineTotal,
    });
  }

  if (processedItems.length === 0) {
    return { success: false, error: 'Không có món ăn hợp lệ trong đơn hàng.' };
  }

  // 5. Calculate Coupon Discount
  let discountAmount = 0;
  if (input.couponCode) {
    const coupon = db
      .prepare(`SELECT * FROM coupons WHERE code = ? AND restaurant_id = ? AND is_active = 1`)
      .get(input.couponCode.trim().toUpperCase(), input.restaurantId) as Coupon | undefined;

    if (coupon) {
      if (subtotal >= coupon.min_order_value) {
        if (coupon.discount_type === 'PERCENT') {
          let calculated = (subtotal * coupon.discount_value) / 100;
          if (coupon.max_discount_value && calculated > coupon.max_discount_value) {
            calculated = coupon.max_discount_value;
          }
          discountAmount = Math.round(calculated);
        } else {
          discountAmount = Math.min(coupon.discount_value, subtotal);
        }
      }
    }
  }

  // 6. Tax and Service charge
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((taxableAmount * (restaurant.tax_rate || 0)) / 100);
  const serviceCharge = Math.round((taxableAmount * (restaurant.service_charge || 0)) / 100);
  const totalAmount = Math.round(taxableAmount + taxAmount + serviceCharge);

  // 7. Generate order number
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM orders WHERE restaurant_id = ?`)
    .get(input.restaurantId) as { cnt: number };
  const orderNumber = `ORD-${todayStr}-${String(countRow.cnt + 1).padStart(3, '0')}`;
  const orderId = `ord_${crypto.randomBytes(8).toString('hex')}`;

  // 8. Transactional insert
  const insertOrderStmt = db.prepare(`
    INSERT INTO orders (
      id, restaurant_id, table_id, table_session_id, order_number, status, payment_status,
      subtotal, discount_amount, tax_amount, service_charge, total_amount, note, idempotency_key
    ) VALUES (?, ?, ?, ?, ?, 'PENDING', 'UNPAID', ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItemStmt = db.prepare(`
    INSERT INTO order_items (
      id, order_id, product_id, product_name_snapshot, unit_price, quantity, modifiers_snapshot, note, status, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const insertHistoryStmt = db.prepare(`
    INSERT INTO order_status_history (id, order_id, previous_status, new_status, reason)
    VALUES (?, ?, NULL, 'PENDING', 'Khách hàng gửi đơn từ bàn')
  `);

  const createdItems: OrderItem[] = [];

  const runTransaction = db.transaction(() => {
    insertOrderStmt.run(
      orderId,
      input.restaurantId,
      session.table_id,
      session.id,
      orderNumber,
      subtotal,
      discountAmount,
      taxAmount,
      serviceCharge,
      totalAmount,
      input.note || null,
      input.idempotencyKey || null
    );

    for (const item of processedItems) {
      const itemId = `item_${crypto.randomBytes(8).toString('hex')}`;
      insertItemStmt.run(
        itemId,
        orderId,
        item.productId,
        item.productName,
        item.unitPrice,
        item.quantity,
        JSON.stringify(item.modifiersSnapshot),
        item.note,
        item.lineTotal
      );

      createdItems.push({
        id: itemId,
        order_id: orderId,
        product_id: item.productId,
        product_name_snapshot: item.productName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        modifiers_snapshot: item.modifiersSnapshot,
        note: item.note,
        status: 'PENDING',
        line_total: item.lineTotal,
        created_at: new Date().toISOString(),
      });
    }

    insertHistoryStmt.run(`hist_${crypto.randomBytes(8).toString('hex')}`, orderId);

    // Increment coupon usage if applied
    if (input.couponCode) {
      db.prepare(`UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ? AND restaurant_id = ?`).run(
        input.couponCode.trim().toUpperCase(),
        input.restaurantId
      );
    }
  });

  runTransaction();

  const createdOrder: Order = {
    id: orderId,
    restaurant_id: input.restaurantId,
    table_id: session.table_id,
    table_code: session.table_code,
    table_name: session.table_name,
    table_session_id: session.id,
    order_number: orderNumber,
    status: 'PENDING',
    payment_status: 'UNPAID',
    subtotal,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    service_charge: serviceCharge,
    total_amount: totalAmount,
    note: input.note || null,
    idempotency_key: input.idempotencyKey || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    items: createdItems,
  };

  // 9. Realtime SSE Broadcast to Kitchen, Orders board, and Table
  publishRealtimeEvent(`restaurant:${input.restaurantId}:orders`, 'order:created', createdOrder);
  publishRealtimeEvent(`restaurant:${input.restaurantId}:kitchen`, 'kitchen:new_ticket', createdOrder);
  publishRealtimeEvent(`table:${input.tableSessionToken}`, 'order:created', createdOrder);

  return { success: true, order: createdOrder };
}

export function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId?: string,
  reason?: string
): { success: boolean; order?: Order; error?: string } {
  const db = getDb();
  const current = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as Order | undefined;
  if (!current) return { success: false, error: 'Đơn hàng không tồn tại.' };

  const isCompleted = newStatus === 'COMPLETED';
  const completedAt = isCompleted ? "datetime('now')" : null;

  db.prepare(
    `UPDATE orders
     SET status = ?,
         completed_at = ${isCompleted ? "datetime('now')" : 'completed_at'},
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(newStatus, orderId);

  // Record history
  db.prepare(
    `INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_user_id, reason)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(`hist_${crypto.randomBytes(8).toString('hex')}`, orderId, current.status, newStatus, userId || null, reason || null);

  const updated = getOrderDetails(orderId);
  if (updated) {
    publishRealtimeEvent(`restaurant:${updated.restaurant_id}:orders`, 'order:updated', updated);
    publishRealtimeEvent(`restaurant:${updated.restaurant_id}:kitchen`, 'order:updated', updated);
    if (updated.table_session_id) {
      const session = db
        .prepare(`SELECT session_token FROM table_sessions WHERE id = ?`)
        .get(updated.table_session_id) as { session_token: string } | undefined;
      if (session) {
        publishRealtimeEvent(`table:${session.session_token}`, 'order:updated', updated);
      }
    }
  }

  return { success: true, order: updated || undefined };
}

export function updateOrderItemStatus(
  orderItemId: string,
  status: OrderItemStatus
): { success: boolean; error?: string } {
  const db = getDb();
  const item = db.prepare(`SELECT * FROM order_items WHERE id = ?`).get(orderItemId) as OrderItem | undefined;
  if (!item) return { success: false, error: 'Món trong đơn không tồn tại.' };

  db.prepare(`UPDATE order_items SET status = ? WHERE id = ?`).run(status, orderItemId);

  const order = getOrderDetails(item.order_id);
  if (order) {
    publishRealtimeEvent(`restaurant:${order.restaurant_id}:kitchen`, 'kitchen:item_updated', {
      orderItemId,
      status,
      orderId: item.order_id,
    });
  }

  return { success: true };
}

export function getOrderDetails(orderId: string): Order | null {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT o.*, t.code as table_code, t.name as table_name, a.name as area_name
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       LEFT JOIN dining_areas a ON t.area_id = a.id
       WHERE o.id = ?`
    )
    .get(orderId) as Order | undefined;

  if (!order) return null;

  const rawItems = db
    .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC`)
    .all(orderId) as (Omit<OrderItem, 'modifiers_snapshot'> & { modifiers_snapshot: string })[];

  const items: OrderItem[] = rawItems.map((item) => {
    let mods: ModifierSnapshot[] = [];
    try {
      mods = JSON.parse(item.modifiers_snapshot || '[]');
    } catch {
      mods = [];
    }
    return { ...item, modifiers_snapshot: mods };
  });

  return { ...order, items };
}
