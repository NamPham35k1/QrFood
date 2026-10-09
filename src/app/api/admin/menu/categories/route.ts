import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';
import { Category } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'menu:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const db = getDb();
    const categories = db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
         FROM categories c
         WHERE c.restaurant_id = ?
         ORDER BY c.display_order ASC`
      )
      .all(payload.restaurantId) as Category[];

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải danh mục.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'menu:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền quản lý danh mục.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, imageUrl, displayOrder } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Tên danh mục là bắt buộc.' }, { status: 400 });
    }

    const db = getDb();
    const id = `cat_${crypto.randomBytes(8).toString('hex')}`;

    db.prepare(`
      INSERT INTO categories (id, restaurant_id, name, description, image_url, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, payload.restaurantId, name.trim(), description || null, imageUrl || null, Number(displayOrder) || 0);

    return NextResponse.json({ success: true, message: 'Thêm danh mục thành công.' });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tạo danh mục.' }, { status: 500 });
  }
}
