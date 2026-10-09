import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaff } from '@/lib/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 });
    }

    const auth = await authenticateStaff(email.trim().toLowerCase(), password);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Email hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        fullName: auth.user.full_name,
        role: auth.user.role,
        restaurantId: auth.user.restaurant_id,
        avatarUrl: auth.user.avatar_url,
      },
      token: auth.token,
    });

    response.cookies.set({
      name: 'qrfood_token',
      value: auth.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi đăng nhập hệ thống.' }, { status: 500 });
  }
}
