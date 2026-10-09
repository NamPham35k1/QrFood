import { NextRequest, NextResponse } from 'next/server';
import { createOrderAtTable, CreateOrderInput } from '@/lib/services/order.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: CreateOrderInput = {
      restaurantId: body.restaurantId,
      tableSessionToken: body.tableSessionToken,
      items: body.items,
      note: body.note,
      couponCode: body.couponCode,
      idempotencyKey: body.idempotencyKey || request.headers.get('x-idempotency-key') || undefined,
    };

    if (!input.restaurantId || !input.tableSessionToken || !input.items) {
      return NextResponse.json(
        { success: false, error: 'Thiếu dữ liệu đơn hàng bắt buộc.' },
        { status: 400 }
      );
    }

    const result = createOrderAtTable(input);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, order: result.order });
  } catch (error) {
    console.error('Error submitting order:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi tạo đơn hàng.' },
      { status: 500 }
    );
  }
}
