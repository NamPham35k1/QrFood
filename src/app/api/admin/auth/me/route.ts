import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission, PermissionAction } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';
import { User, Restaurant } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Phiên làm việc đã hết hạn.' }, { status: 401 });
    }

    const db = getDb();
    const user = db.prepare(`SELECT * FROM users WHERE id = ? AND is_active = 1`).get(payload.userId) as User | undefined;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị khóa.' }, { status: 401 });
    }

    const restaurant = db.prepare(`SELECT * FROM restaurants WHERE id = ?`).get(user.restaurant_id) as Restaurant | undefined;

    const allActions: PermissionAction[] = [
      'dashboard:view',
      'orders:view',
      'orders:manage',
      'kitchen:view',
      'kitchen:manage',
      'tables:view',
      'tables:manage',
      'menu:view',
      'menu:manage',
      'payments:view',
      'payments:manage',
      'coupons:view',
      'coupons:manage',
      'staff:view',
      'staff:manage',
      'reports:view',
      'settings:manage',
      'audit:view',
    ];

    const permissions = allActions.filter((act) => hasPermission(user.role, act));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        restaurantId: user.restaurant_id,
        avatarUrl: user.avatar_url,
      },
      restaurant,
      permissions,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi xác thực người dùng.' }, { status: 500 });
  }
}
