import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';
import { User, StaffRole } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'staff:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const db = getDb();
    const staff = db
      .prepare(
        `SELECT id, restaurant_id, email, full_name, role, avatar_url, is_active, last_login_at, created_at
         FROM users WHERE restaurant_id = ? ORDER BY created_at ASC`
      )
      .all(payload.restaurantId) as Omit<User, 'password_hash'>[];

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải danh sách nhân viên.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'staff:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền thêm nhân viên.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, fullName, role } = body as {
      email: string;
      password: string;
      fullName: string;
      role: StaffRole;
    };

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ success: false, error: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email này đã tồn tại trong hệ thống.' }, { status: 400 });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const id = `usr_${crypto.randomBytes(8).toString('hex')}`;

    db.prepare(`
      INSERT INTO users (id, restaurant_id, email, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, payload.restaurantId, email.trim().toLowerCase(), passwordHash, fullName.trim(), role);

    return NextResponse.json({ success: true, message: 'Tạo tài khoản nhân viên thành công.' });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tạo nhân viên.' }, { status: 500 });
  }
}
