import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';
import { Coupon } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'coupons:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const db = getDb();
    const coupons = db
      .prepare(`SELECT * FROM coupons WHERE restaurant_id = ? ORDER BY is_active DESC, code ASC`)
      .all(payload.restaurantId) as Coupon[];

    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải danh sách mã giảm giá.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'coupons:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền tạo khuyến mãi.' }, { status: 403 });
    }

    const body = await request.json();
    const { code, discountType, discountValue, minOrderValue, maxDiscountValue, usageLimit } = body;

    if (!code || !discountValue) {
      return NextResponse.json({ success: false, error: 'Mã và giá trị giảm là bắt buộc.' }, { status: 400 });
    }

    const db = getDb();
    const id = `coup_${crypto.randomBytes(8).toString('hex')}`;

    db.prepare(`
      INSERT INTO coupons (
        id, restaurant_id, code, discount_type, discount_value, min_order_value, max_discount_value, usage_limit, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      payload.restaurantId,
      code.trim().toUpperCase(),
      discountType || 'PERCENT',
      Number(discountValue),
      Number(minOrderValue) || 0,
      maxDiscountValue ? Number(maxDiscountValue) : null,
      usageLimit ? Number(usageLimit) : null
    );

    return NextResponse.json({ success: true, message: 'Thêm mã giảm giá thành công.' });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tạo mã giảm giá.' }, { status: 500 });
  }
}
