import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/lib/services/payment.service';
import { PaymentProvider } from '@/lib/db/types';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await context.params;
    const body = await request.json();

    const orderId = body.orderId;
    const transactionId = body.transactionId || body.txId || `TX_${Date.now()}`;
    const amount = Number(body.amount) || 0;
    const signature = body.signature || request.headers.get('x-payment-signature') || undefined;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu trường orderId trong webhook payload' },
        { status: 400 }
      );
    }

    const result = processPaymentWebhook(provider.toUpperCase() as PaymentProvider, {
      orderId,
      transactionId,
      amount,
      signature,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      alreadyPaid: result.alreadyPaid,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi xử lý webhook thanh toán.' },
      { status: 500 }
    );
  }
}
