import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment } from '@/lib/services/payment.service';
import { PaymentProvider } from '@/lib/db/types';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const body = await request.json();
    const provider = (body.provider || 'VIETQR') as PaymentProvider;
    const idempotencyKey = body.idempotencyKey || undefined;

    const result = initiatePayment(orderId, provider, idempotencyKey);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payment: result.payment,
      qrData: result.qrData,
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khởi tạo thanh toán.' }, { status: 500 });
  }
}
