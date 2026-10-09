import { NextRequest, NextResponse } from 'next/server';
import { getOrderDetails } from '@/lib/services/order.service';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const order = getOrderDetails(orderId);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }

    const db = getDb();
    // Get status history
    const history = db
      .prepare(`SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`)
      .all(orderId);

    // Get payment if any
    const payment = db
      .prepare(`SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(orderId);

    return NextResponse.json({
      success: true,
      order,
      history,
      payment,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải đơn hàng.' }, { status: 500 });
  }
}
