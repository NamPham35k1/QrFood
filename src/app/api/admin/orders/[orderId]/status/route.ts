import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { updateOrderStatus, updateOrderItemStatus } from '@/lib/services/order.service';
import { OrderStatus, OrderItemStatus } from '@/lib/db/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'orders:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền cập nhật đơn hàng.' }, { status: 403 });
    }

    const body = await request.json();
    const { status, itemId, itemStatus, reason } = body;

    // 1. Update individual item status if itemId is specified
    if (itemId && itemStatus) {
      const res = updateOrderItemStatus(itemId, itemStatus as OrderItemStatus);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Đã cập nhật trạng thái món ăn.' });
    }

    // 2. Update whole order status
    if (status) {
      const res = updateOrderStatus(orderId, status as OrderStatus, payload.userId, reason);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, order: res.order });
    }

    return NextResponse.json({ success: false, error: 'Không có trạng thái mới.' }, { status: 400 });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ success: false, error: 'Lỗi cập nhật trạng thái đơn.' }, { status: 500 });
  }
}
