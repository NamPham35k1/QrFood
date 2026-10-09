import { NextRequest, NextResponse } from 'next/server';
import { validateTableQR, getSessionContext } from '@/lib/services/table.service';
import { getDb } from '@/lib/db';
import { Order } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get('restaurantSlug');
    const tableCode = searchParams.get('tableCode');
    const token = searchParams.get('token') || undefined;
    const sessionToken = searchParams.get('sessionToken') || undefined;

    // 1. If session token provided directly, try to restore
    if (sessionToken) {
      const ctx = getSessionContext(sessionToken);
      if (ctx) {
        // Fetch active orders for this table session
        const db = getDb();
        const orders = db
          .prepare(`SELECT * FROM orders WHERE table_session_id = ? ORDER BY created_at DESC`)
          .all(ctx.session.id) as Order[];

        return NextResponse.json({
          success: true,
          restaurant: ctx.restaurant,
          table: ctx.table,
          session: ctx.session,
          activeOrders: orders,
        });
      }
    }

    // 2. Validate QR scanning
    if (!restaurantSlug || !tableCode) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin nhà hàng hoặc mã bàn.' },
        { status: 400 }
      );
    }

    const result = await validateTableQR(restaurantSlug, tableCode, token);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mã QR không hợp lệ, đã hết hạn hoặc bàn đang bị tạm khóa. Vui lòng liên hệ nhân viên phục vụ.',
        },
        { status: 403 }
      );
    }

    // Fetch existing orders for this session
    const db = getDb();
    const orders = db
      .prepare(`SELECT * FROM orders WHERE table_session_id = ? ORDER BY created_at DESC`)
      .all(result.session.id) as Order[];

    return NextResponse.json({
      success: true,
      restaurant: result.restaurant,
      table: result.table,
      session: result.session,
      activeOrders: orders,
    });
  } catch (error) {
    console.error('Error fetching table context:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ khi kiểm tra thông tin bàn.' },
      { status: 500 }
    );
  }
}
