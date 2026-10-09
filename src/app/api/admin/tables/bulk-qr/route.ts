import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { generateQrPng } from '@/lib/services/table.service';
import { getDb } from '@/lib/db';
import { Restaurant, TableItem } from '@/lib/db/types';

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
    const restaurant = db
      .prepare(`SELECT * FROM restaurants WHERE id = ?`)
      .get(payload.restaurantId) as Restaurant | undefined;

    if (!restaurant) return NextResponse.json({ success: false, error: 'Nhà hàng không tồn tại.' }, { status: 404 });

    const tables = db
      .prepare(
        `SELECT t.*, a.name as area_name
         FROM tables t
         LEFT JOIN dining_areas a ON t.area_id = a.id
         WHERE t.restaurant_id = ? AND t.is_active = 1
         ORDER BY t.code ASC`
      )
      .all(payload.restaurantId) as TableItem[];

    const { searchParams } = new URL(request.url);
    const hostParam = searchParams.get('host');
    const baseUrl = hostParam || process.env.NEXT_PUBLIC_APP_URL || 'http://192.168.1.53:3000';

    const cards = await Promise.all(
      tables.map(async (table) => {
        const qrUrl = `${baseUrl}/menu/${restaurant.slug}?table=${table.code}&token=${table.qr_secret_token}`;
        const qrPng = await generateQrPng(qrUrl);
        return {
          id: table.id,
          code: table.code,
          name: table.name,
          areaName: table.area_name || 'Khu chung',
          capacity: table.capacity,
          qrUrl,
          qrPng,
        };
      })
    );

    return NextResponse.json({
      success: true,
      restaurant: {
        name: restaurant.name,
        slug: restaurant.slug,
        logoUrl: restaurant.logo_url,
      },
      cards,
    });
  } catch (error) {
    console.error('Error generating bulk QR:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tạo mã QR in hàng loạt.' }, { status: 500 });
  }
}
