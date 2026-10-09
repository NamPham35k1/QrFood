import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { regenerateTableQrSecret, generateQrPng } from '@/lib/services/table.service';
import { getDb } from '@/lib/db';
import { TableItem, DiningArea } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'tables:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const db = getDb();
    const areas = db
      .prepare(`SELECT * FROM dining_areas WHERE restaurant_id = ? ORDER BY display_order ASC`)
      .all(payload.restaurantId) as DiningArea[];

    const tables = db
      .prepare(
        `SELECT t.*, a.name as area_name,
                (SELECT session_token FROM table_sessions WHERE table_id = t.id AND is_active = 1 LIMIT 1) as active_session_token,
                (SELECT COUNT(*) FROM orders WHERE table_id = t.id AND status NOT IN ('COMPLETED', 'CANCELLED')) as active_order_count
         FROM tables t
         LEFT JOIN dining_areas a ON t.area_id = a.id
         WHERE t.restaurant_id = ?
         ORDER BY t.code ASC`
      )
      .all(payload.restaurantId) as TableItem[];

    return NextResponse.json({ success: true, areas, tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải danh sách bàn.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'tables:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền tạo bàn.' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, capacity, areaId } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'Mã bàn và tên bàn là bắt buộc.' }, { status: 400 });
    }

    const db = getDb();
    const id = `tbl_${crypto.randomBytes(8).toString('hex')}`;
    const qrSecret = `sec_${code.toLowerCase()}_${crypto.randomBytes(6).toString('hex')}`;

    db.prepare(`
      INSERT INTO tables (id, restaurant_id, area_id, code, name, capacity, status, is_active, qr_secret_token)
      VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', 1, ?)
    `).run(id, payload.restaurantId, areaId || null, code.trim(), name.trim(), Number(capacity) || 4, qrSecret);

    return NextResponse.json({ success: true, message: 'Thêm bàn mới thành công.' });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tạo bàn (có thể mã bàn đã tồn tại).' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'tables:manage')) {
      return NextResponse.json({ success: false, error: 'Không có quyền cập nhật bàn.' }, { status: 403 });
    }

    const body = await request.json();
    const { tableId, status, regenerateQr } = body;

    if (!tableId) {
      return NextResponse.json({ success: false, error: 'Thiếu ID bàn.' }, { status: 400 });
    }

    const db = getDb();

    if (regenerateQr) {
      const newSecret = regenerateTableQrSecret(payload.restaurantId, tableId);
      return NextResponse.json({ success: true, message: 'Đã tạo lại mã bí mật QR.', newSecret });
    }

    if (status) {
      db.prepare(`UPDATE tables SET status = ? WHERE id = ? AND restaurant_id = ?`).run(
        status,
        tableId,
        payload.restaurantId
      );
      return NextResponse.json({ success: true, message: 'Đã cập nhật trạng thái bàn.' });
    }

    return NextResponse.json({ success: false, error: 'Không có thay đổi nào.' }, { status: 400 });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json({ success: false, error: 'Lỗi cập nhật bàn.' }, { status: 500 });
  }
}
