import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';
import { Product } from '@/lib/db/types';

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
    const productsRaw = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.restaurant_id = ?
         ORDER BY p.display_order ASC, p.created_at DESC`
      )
      .all(payload.restaurantId) as (Omit<Product, 'tags'> & { tags: string })[];

    const products = productsRaw.map((p) => {
      let tags = [];
      try {
        tags = JSON.parse(p.tags || '[]');
      } catch {
        tags = [];
      }
      return { ...p, tags };
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải danh sách món ăn.' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Không có quyền thêm món.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, categoryId, basePrice, discountPrice, imageUrl, description, preparationTimeMinutes, tags } = body;

    if (!name || basePrice === undefined) {
      return NextResponse.json({ success: false, error: 'Tên món và giá bán là bắt buộc.' }, { status: 400 });
    }

    const db = getDb();
    const id = `prod_${crypto.randomBytes(8).toString('hex')}`;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

    db.prepare(`
      INSERT INTO products (
        id, restaurant_id, category_id, name, description, base_price, discount_price,
        image_url, is_available, is_featured, preparation_time_minutes, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `).run(
      id,
      payload.restaurantId,
      categoryId || null,
      name.trim(),
      description || null,
      Number(basePrice),
      discountPrice ? Number(discountPrice) : null,
      imageUrl || null,
      Number(preparationTimeMinutes) || 15,
      tagsJson
    );

    return NextResponse.json({ success: true, message: 'Thêm món ăn thành công.' });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tạo món ăn.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'menu:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền sửa món.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, isAvailable, isFeatured, basePrice, name, description, categoryId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID món ăn.' }, { status: 400 });
    }

    const db = getDb();

    if (isAvailable !== undefined) {
      db.prepare(`UPDATE products SET is_available = ? WHERE id = ? AND restaurant_id = ?`).run(
        isAvailable ? 1 : 0,
        id,
        payload.restaurantId
      );
    }
    if (isFeatured !== undefined) {
      db.prepare(`UPDATE products SET is_featured = ? WHERE id = ? AND restaurant_id = ?`).run(
        isFeatured ? 1 : 0,
        id,
        payload.restaurantId
      );
    }
    if (basePrice !== undefined) {
      db.prepare(`UPDATE products SET base_price = ? WHERE id = ? AND restaurant_id = ?`).run(
        Number(basePrice),
        id,
        payload.restaurantId
      );
    }
    if (name) {
      db.prepare(`UPDATE products SET name = ?, description = ?, category_id = ? WHERE id = ? AND restaurant_id = ?`).run(
        name.trim(),
        description || null,
        categoryId || null,
        id,
        payload.restaurantId
      );
    }

    return NextResponse.json({ success: true, message: 'Cập nhật món thành công.' });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ success: false, error: 'Lỗi cập nhật món ăn.' }, { status: 500 });
  }
}
