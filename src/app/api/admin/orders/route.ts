import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';
import { Order, OrderItem } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'orders:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tableId = searchParams.get('tableId');
    const search = searchParams.get('search');

    const db = getDb();
    let query = `
      SELECT o.*, t.code as table_code, t.name as table_name, a.name as area_name
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      LEFT JOIN dining_areas a ON t.area_id = a.id
      WHERE o.restaurant_id = ?
    `;
    const params: unknown[] = [payload.restaurantId];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    if (tableId) {
      query += ` AND o.table_id = ?`;
      params.push(tableId);
    }
    if (search) {
      query += ` AND (o.order_number LIKE ? OR t.name LIKE ? OR t.code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY o.created_at DESC LIMIT 100`;

    const ordersRaw = db.prepare(query).all(...params) as Order[];

    const orders = ordersRaw.map((o) => {
      const itemsRaw = db
        .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC`)
        .all(o.id) as (Omit<OrderItem, 'modifiers_snapshot'> & { modifiers_snapshot: string })[];

      const items: OrderItem[] = itemsRaw.map((item) => {
        let mods = [];
        try {
          mods = JSON.parse(item.modifiers_snapshot || '[]');
        } catch {
          mods = [];
        }
        return { ...item, modifiers_snapshot: mods };
      });

      return { ...o, items };
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Error in orders API:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải danh sách đơn hàng.' }, { status: 500 });
  }
}
