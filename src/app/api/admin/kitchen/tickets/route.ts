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
    if (!payload || !hasPermission(payload.role, 'kitchen:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập màn hình bếp.' }, { status: 403 });
    }

    const db = getDb();
    const ordersRaw = db
      .prepare(
        `SELECT o.*, t.code as table_code, t.name as table_name, a.name as area_name,
                CAST((julianday('now') - julianday(o.created_at)) * 1440 AS INTEGER) as waiting_minutes
         FROM orders o
         JOIN tables t ON o.table_id = t.id
         LEFT JOIN dining_areas a ON t.area_id = a.id
         WHERE o.restaurant_id = ? AND o.status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY')
         ORDER BY o.created_at ASC`
      )
      .all(payload.restaurantId) as (Order & { waiting_minutes: number })[];

    const tickets = ordersRaw.map((o) => {
      const itemsRaw = db
        .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC`)
        .all(o.id) as (Omit<OrderItem, 'modifiers_snapshot'> & { modifiers_snapshot: string })[];

      const items = itemsRaw.map((it) => {
        let mods = [];
        try {
          mods = JSON.parse(it.modifiers_snapshot || '[]');
        } catch {
          mods = [];
        }
        return { ...it, modifiers_snapshot: mods };
      });

      return { ...o, items };
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error('Error in kitchen tickets API:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải vé bếp.' }, { status: 500 });
  }
}
