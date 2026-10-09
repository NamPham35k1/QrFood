import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'reports:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập báo cáo.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // 'today', '7d', '30d'
    const format = searchParams.get('format');

    const db = getDb();
    let dateFilter = `created_at >= datetime('now', '-7 days')`;
    if (range === 'today') {
      dateFilter = `date(created_at) = date('now')`;
    } else if (range === '30d') {
      dateFilter = `created_at >= datetime('now', '-30 days')`;
    }

    // 1. Financial summary
    const summary = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) as net_revenue,
           COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN subtotal ELSE 0 END), 0) as gross_subtotal,
           COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN discount_amount ELSE 0 END), 0) as total_discounts,
           COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN tax_amount ELSE 0 END), 0) as total_tax,
           COUNT(*) as total_orders,
           SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_orders,
           SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders
         FROM orders
         WHERE restaurant_id = ? AND ${dateFilter}`
      )
      .get(payload.restaurantId) as {
        net_revenue: number;
        gross_subtotal: number;
        total_discounts: number;
        total_tax: number;
        total_orders: number;
        completed_orders: number;
        cancelled_orders: number;
      };

    // 2. Sales by item
    const itemSales = db
      .prepare(
        `SELECT oi.product_name_snapshot as item_name,
                SUM(oi.quantity) as total_qty,
                SUM(oi.line_total) as total_sales
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.restaurant_id = ? AND o.${dateFilter} AND o.payment_status = 'PAID'
         GROUP BY oi.product_name_snapshot
         ORDER BY total_sales DESC
         LIMIT 20`
      )
      .all(payload.restaurantId);

    // 3. Daily timeline
    const timeline = db
      .prepare(
        `SELECT strftime('%Y-%m-%d', created_at) as date,
                COALESCE(SUM(total_amount), 0) as revenue,
                COUNT(*) as orders
         FROM orders
         WHERE restaurant_id = ? AND ${dateFilter} AND payment_status = 'PAID'
         GROUP BY date
         ORDER BY date ASC`
      )
      .all(payload.restaurantId);

    if (format === 'csv') {
      let csv = 'Ngay,DoanhThu,SoDonHang\n';
      for (const row of timeline as { date: string; revenue: number; orders: number }[]) {
        csv += `${row.date},${row.revenue},${row.orders}\n`;
      }
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=bao-cao-doanh-thu-${range}.csv`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      summary,
      itemSales,
      timeline,
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json({ success: false, error: 'Lỗi xuất báo cáo.' }, { status: 500 });
  }
}
