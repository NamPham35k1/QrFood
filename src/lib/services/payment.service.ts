import crypto from 'crypto';
import { getDb } from '../db';
import { Payment, PaymentProvider, PaymentStatus, RestaurantSettings } from '../db/types';
import { publishRealtimeEvent } from '../realtime';
import { getOrderDetails } from './order.service';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'qrfood_webhook_signature_secret_2026';

export interface VietQrData {
  qrImageUrl: string;
  bankBin: string;
  bankAccount: string;
  accountName: string;
  amount: number;
  transferContent: string;
  orderNumber: string;
}

export function generateVietQrInfo(orderId: string): VietQrData | null {
  const db = getDb();
  const order = getOrderDetails(orderId);
  if (!order) return null;

  const settings = db
    .prepare(`SELECT * FROM restaurant_settings WHERE restaurant_id = ?`)
    .get(order.restaurant_id) as RestaurantSettings | undefined;

  const bankBin = settings?.bank_bin || '970422'; // Default MBBank
  const bankAccount = settings?.bank_account_number || '0908123456888';
  const accountName = settings?.bank_account_name || 'NHA HANG HUONG SEN';
  const cleanOrderNum = order.order_number.replace(/[^A-Za-z0-9]/g, '');
  const transferContent = `QRF ${cleanOrderNum}`;

  // VietQR QuickLink image URL standard
  const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${order.total_amount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;

  return {
    qrImageUrl,
    bankBin,
    bankAccount,
    accountName,
    amount: order.total_amount,
    transferContent,
    orderNumber: order.order_number,
  };
}

export function initiatePayment(
  orderId: string,
  provider: PaymentProvider,
  idempotencyKey?: string
): { success: boolean; payment?: Payment; qrData?: VietQrData; error?: string } {
  const db = getDb();
  const order = getOrderDetails(orderId);
  if (!order) return { success: false, error: 'Đơn hàng không tồn tại.' };

  if (order.payment_status === 'PAID') {
    return { success: false, error: 'Đơn hàng này đã được thanh toán hoàn tất.' };
  }

  // Check existing payment for this order
  let payment = db
    .prepare(`SELECT * FROM payments WHERE order_id = ? AND status = 'PAID'`)
    .get(orderId) as Payment | undefined;

  if (payment) {
    return { success: true, payment };
  }

  const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
  const key = idempotencyKey || `idemp_${crypto.randomBytes(8).toString('hex')}`;

  db.prepare(`
    INSERT INTO payments (
      id, restaurant_id, order_id, table_session_id, provider, amount, currency, status, idempotency_key
    ) VALUES (?, ?, ?, ?, ?, ?, 'VND', 'UNPAID', ?)
  `).run(
    paymentId,
    order.restaurant_id,
    order.id,
    order.table_session_id,
    provider,
    order.total_amount,
    key
  );

  payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId) as Payment;

  let qrData: VietQrData | undefined;
  if (provider === 'VIETQR') {
    qrData = generateVietQrInfo(orderId) || undefined;
  }

  return { success: true, payment, qrData };
}

export function processPaymentWebhook(
  provider: PaymentProvider,
  payload: {
    orderId: string;
    transactionId: string;
    amount: number;
    signature?: string;
  }
): { success: boolean; message: string; alreadyPaid?: boolean } {
  const db = getDb();

  // Signature verification (if signature provided)
  if (payload.signature) {
    const rawData = `${payload.orderId}:${payload.transactionId}:${payload.amount}`;
    const expectedSig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawData).digest('hex');
    if (payload.signature !== expectedSig) {
      return { success: false, message: 'Chữ ký webhook không hợp lệ (Signature mismatch).' };
    }
  }

  const order = getOrderDetails(payload.orderId);
  if (!order) {
    return { success: false, message: 'Không tìm thấy đơn hàng tương ứng.' };
  }

  // Idempotency: Check if already paid
  if (order.payment_status === 'PAID') {
    return { success: true, message: 'Đơn hàng đã được ghi nhận thanh toán trước đó (Idempotent OK).', alreadyPaid: true };
  }

  const txId = payload.transactionId || `TX_${Date.now()}`;

  const runTx = db.transaction(() => {
    // 1. Update or Insert Payment
    const existingPayment = db
      .prepare(`SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(order.id) as Payment | undefined;

    if (existingPayment) {
      db.prepare(`
        UPDATE payments
        SET status = 'PAID',
            provider = ?,
            provider_transaction_id = ?,
            paid_at = datetime('now')
        WHERE id = ?
      `).run(provider, txId, existingPayment.id);
    } else {
      db.prepare(`
        INSERT INTO payments (
          id, restaurant_id, order_id, table_session_id, provider, provider_transaction_id, amount, status, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', datetime('now'))
      `).run(
        `pay_${crypto.randomBytes(8).toString('hex')}`,
        order.restaurant_id,
        order.id,
        order.table_session_id,
        provider,
        txId,
        order.total_amount
      );
    }

    // 2. Update Order payment_status
    db.prepare(`
      UPDATE orders
      SET payment_status = 'PAID',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(order.id);

    // 3. Log Audit
    db.prepare(`
      INSERT INTO audit_logs (id, restaurant_id, action, entity_name, entity_id, details)
      VALUES (?, ?, 'PAYMENT_CONFIRMED', 'orders', ?, ?)
    `).run(
      `audit_${crypto.randomBytes(8).toString('hex')}`,
      order.restaurant_id,
      order.id,
      JSON.stringify({ provider, txId, amount: payload.amount })
    );
  });

  runTx();

  const updatedOrder = getOrderDetails(order.id);

  // Broadcast realtime event to cashier and table
  publishRealtimeEvent(`restaurant:${order.restaurant_id}:orders`, 'payment:confirmed', {
    orderId: order.id,
    orderNumber: order.order_number,
    amount: order.total_amount,
    provider,
    txId,
  });

  if (order.table_session_id) {
    const session = db
      .prepare(`SELECT session_token FROM table_sessions WHERE id = ?`)
      .get(order.table_session_id) as { session_token: string } | undefined;
    if (session) {
      publishRealtimeEvent(`table:${session.session_token}`, 'payment:confirmed', {
        orderId: order.id,
        orderNumber: order.order_number,
        amount: order.total_amount,
      });
    }
  }

  return { success: true, message: 'Thanh toán đã được xác nhận thành công phía server.' };
}

// Cashier counter settlement
export function cashierConfirmPayment(
  orderId: string,
  method: 'CASH' | 'POS_CARD',
  cashierUserId: string
): { success: boolean; error?: string } {
  return processPaymentWebhook(method === 'CASH' ? 'CASH' : 'PAY_LATER', {
    orderId,
    transactionId: `CASHIER_${cashierUserId}_${Date.now()}`,
    amount: 0,
  });
}
