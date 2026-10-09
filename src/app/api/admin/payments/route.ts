import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { cashierConfirmPayment } from '@/lib/services/payment.service';
import { getDb } from '@/lib/db';
import { Payment } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'payments:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const db = getDb();
    const payments = db
      .prepare(
        `SELECT p.*, o.order_number, t.code as table_code
         FROM payments p
         LEFT JOIN orders o ON p.order_id = o.id
         LEFT JOIN tables t ON o.table_id = t.id
         WHERE p.restaurant_id = ?
         ORDER BY p.created_at DESC LIMIT 100`
      )
      .all(payload.restaurantId) as Payment[];

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải danh sách thanh toán.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'payments:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền xác nhận thu tiền.' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, method } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Thiếu ID đơn hàng.' }, { status: 400 });
    }

    const result = cashierConfirmPayment(orderId, method || 'CASH', payload.userId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Đã xác nhận thu tiền thành công.' });
  } catch (error) {
    console.error('Error in payment settlement:', error);
    return NextResponse.json({ success: false, error: 'Lỗi xử lý xác nhận thanh toán.' }, { status: 500 });
  }
}
