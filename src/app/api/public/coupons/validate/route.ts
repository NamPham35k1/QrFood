import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Coupon } from '@/lib/db/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, code, subtotal } = body as {
      restaurantId: string;
      code: string;
      subtotal: number;
    };

    if (!restaurantId || !code) {
      return NextResponse.json({ success: false, error: 'Thiếu mã giảm giá.' }, { status: 400 });
    }

    const db = getDb();
    const coupon = db
      .prepare(`SELECT * FROM coupons WHERE code = ? AND restaurant_id = ? AND is_active = 1`)
      .get(code.trim().toUpperCase(), restaurantId) as Coupon | undefined;

    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' }, { status: 404 });
    }

    if (subtotal < coupon.min_order_value) {
      return NextResponse.json(
        {
          success: false,
          error: `Mã áp dụng cho đơn từ ${coupon.min_order_value.toLocaleString('vi-VN')} ₫ trở lên.`,
        },
        { status: 400 }
      );
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ success: false, error: 'Mã giảm giá đã hết lượt sử dụng.' }, { status: 400 });
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'PERCENT') {
      let calculated = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount_value && calculated > coupon.max_discount_value) {
        calculated = coupon.max_discount_value;
      }
      discountAmount = Math.round(calculated);
    } else {
      discountAmount = Math.min(coupon.discount_value, subtotal);
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountAmount,
      },
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ success: false, error: 'Lỗi kiểm tra mã giảm giá.' }, { status: 500 });
  }
}
