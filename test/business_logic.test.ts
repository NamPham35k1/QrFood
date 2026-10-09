import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { runSeed } from '../scripts/seed';
import { getDb } from '../src/lib/db';
import { createOrderAtTable, updateOrderStatus, getOrderDetails } from '../src/lib/services/order.service';
import { hasPermission } from '../src/lib/services/auth.service';
import { validateTableQR, getSessionContext } from '../src/lib/services/table.service';
import { processPaymentWebhook } from '../src/lib/services/payment.service';

describe('QRFood Business Logic & Security Tests', async () => {
  // Ensure seed data is fresh
  await runSeed();
  const db = getDb();
  const restaurantId = 'rest_huong_sen_01';

  it('1. Tính giá món ăn và Topping chính xác phía Server', async () => {
    // prod_09: Phở Bò Tái Lăn (69.000đ), mod_size_l: Size lớn (+15.000đ)
    // Tổng 1 phần = 84.000đ. Đặt số lượng 2 = 168.000đ.
    const res = createOrderAtTable({
      restaurantId,
      tableSessionToken: 'demo_session_b01',
      items: [
        {
          productId: 'prod_09',
          quantity: 2,
          modifierIds: ['mod_size_l'],
        },
      ],
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.order);
    assert.strictEqual(res.order.subtotal, 168000);
    assert.strictEqual(res.order.items?.length, 1);
    assert.strictEqual(res.order.items[0].unit_price, 84000);
    assert.strictEqual(res.order.items[0].line_total, 168000);
  });

  it('2. Tính thuế VAT (8%), chiết khấu mã giảm giá (Coupon) và tổng tiền', async () => {
    // Coupon WELCOME10: Giảm 10%, max 50.000đ cho đơn >= 100.000đ
    // Subtotal: 200.000đ -> Giảm: 20.000đ -> Sau giảm: 180.000đ -> VAT 8%: 14.400đ -> Tổng: 194.400đ
    const res = createOrderAtTable({
      restaurantId,
      tableSessionToken: 'demo_session_b01',
      items: [
        {
          productId: 'prod_08', // Gà Ta Nướng: 185.000đ
          quantity: 1,
        },
        {
          productId: 'prod_16', // Trà Tắc: 32.000đ
          quantity: 1,
        },
      ],
      couponCode: 'WELCOME10',
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.order);
    // Subtotal = 185000 + 32000 = 217000
    assert.strictEqual(res.order.subtotal, 217000);
    // 10% of 217000 = 21700
    assert.strictEqual(res.order.discount_amount, 21700);
    // Taxable = 217000 - 21700 = 195300. VAT 8% = 15624
    assert.strictEqual(res.order.tax_amount, 15624);
    // Total = 195300 + 15624 = 210924
    assert.strictEqual(res.order.total_amount, 210924);
  });

  it('3. Chống gửi trùng đơn bằng Idempotency Key', async () => {
    const idempKey = `test_idemp_${Date.now()}`;
    const payload = {
      restaurantId,
      tableSessionToken: 'demo_session_b01',
      items: [{ productId: 'prod_01', quantity: 1 }],
      idempotencyKey: idempKey,
    };

    const firstSubmit = createOrderAtTable(payload);
    assert.strictEqual(firstSubmit.success, true);

    // Re-submit identical idempotency key (e.g. user double clicked rapidly)
    const secondSubmit = createOrderAtTable(payload);
    assert.strictEqual(secondSubmit.success, true);
    // Must return the exact same order ID without adding another database row
    assert.strictEqual(firstSubmit.order?.id, secondSubmit.order?.id);
  });

  it('4. Chặn gọi món khi món ăn đã hết hàng (Out of Stock)', async () => {
    // prod_03: Chả Giò Hải Sản Sốt Mayo (is_available = 0)
    db.prepare(`UPDATE products SET is_available = 0 WHERE id = 'prod_03'`).run();

    const res = createOrderAtTable({
      restaurantId,
      tableSessionToken: 'demo_session_b01',
      items: [{ productId: 'prod_03', quantity: 1 }],
    });

    assert.strictEqual(res.success, false);
    assert.match(res.error || '', /hết hàng/);
  });

  it('5. Phân quyền RBAC nghiêm ngặt giữa các vai trò', () => {
    // Owner có mọi quyền
    assert.strictEqual(hasPermission('OWNER', 'reports:view'), true);
    assert.strictEqual(hasPermission('OWNER', 'settings:manage'), true);
    assert.strictEqual(hasPermission('OWNER', 'staff:manage'), true);

    // Manager quản lý menu & đơn, nhưng không có quyền root nếu không cấp
    assert.strictEqual(hasPermission('MANAGER', 'menu:manage'), true);
    assert.strictEqual(hasPermission('MANAGER', 'kitchen:view'), true);

    // Kitchen CHỈ xem bếp và đơn, tuyệt đối KHÔNG xem báo cáo doanh thu hay cài đặt
    assert.strictEqual(hasPermission('KITCHEN', 'kitchen:view'), true);
    assert.strictEqual(hasPermission('KITCHEN', 'reports:view'), false);
    assert.strictEqual(hasPermission('KITCHEN', 'payments:view'), false);
    assert.strictEqual(hasPermission('KITCHEN', 'settings:manage'), false);

    // Cashier có quyền thu ngân nhưng không có quyền sửa menu
    assert.strictEqual(hasPermission('CASHIER', 'payments:manage'), true);
    assert.strictEqual(hasPermission('CASHIER', 'menu:manage'), false);
  });

  it('6. Xác thực mã QR và bảo mật Phiên Bàn (Table Session Isolation)', async () => {
    // Bàn 01 hợp lệ với đúng secret token
    const validResult = await validateTableQR('huong-sen', 'B01', 'sec_b01_hs_8821');
    assert.ok(validResult);
    assert.strictEqual(validResult.table.code, 'B01');
    assert.ok(validResult.session.session_token);

    // Quét với secret token sai hoặc giả mạo -> Bị từ chối (null)
    const invalidSecretResult = await validateTableQR('huong-sen', 'B01', 'tampered_fake_token');
    assert.strictEqual(invalidSecretResult, null);

    // Bàn không tồn tại -> Bị từ chối
    const nonExistentTable = await validateTableQR('huong-sen', 'B999', 'sec_fake');
    assert.strictEqual(nonExistentTable, null);
  });

  it('7. Xử lý Webhook thanh toán lặp một cách Idempotent (Chống double-credit)', async () => {
    // Lấy order 1
    const order = getOrderDetails('ord_001');
    assert.ok(order);
    assert.strictEqual(order.payment_status, 'UNPAID');

    // Lần 1: Webhook gửi xác nhận
    const firstWebhook = processPaymentWebhook('VIETQR', {
      orderId: order.id,
      transactionId: 'TX_WEBHOOK_001',
      amount: order.total_amount,
    });
    assert.strictEqual(firstWebhook.success, true);

    // Kiểm tra order trong DB đã chuyển sang PAID
    const updatedOrder = getOrderDetails('ord_001');
    assert.strictEqual(updatedOrder?.payment_status, 'PAID');

    // Lần 2: Webhook gửi lại cùng transaction hoặc lặp callback
    const secondWebhook = processPaymentWebhook('VIETQR', {
      orderId: order.id,
      transactionId: 'TX_WEBHOOK_001',
      amount: order.total_amount,
    });
    assert.strictEqual(secondWebhook.success, true);
    assert.strictEqual(secondWebhook.alreadyPaid, true);
  });

  it('8. Luồng chuyển trạng thái đơn hàng (Order State Lifecycle & Audit Trail)', () => {
    const orderId = 'ord_002';
    // Đang PREPARING -> chuyển sang READY
    const step1 = updateOrderStatus(orderId, 'READY', 'usr_kitchen_01', 'Đầu bếp đã hoàn thành món');
    assert.strictEqual(step1.success, true);
    assert.strictEqual(step1.order?.status, 'READY');

    // READY -> chuyển sang DELIVERED
    const step2 = updateOrderStatus(orderId, 'DELIVERED', 'usr_staff_01', 'Phục vụ đã mang ra bàn');
    assert.strictEqual(step2.success, true);
    assert.strictEqual(step2.order?.status, 'DELIVERED');

    // Kiểm tra lịch sử order_status_history
    const history = db.prepare(`SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC`).all(orderId);
    assert.ok(history.length >= 2);
  });
});
