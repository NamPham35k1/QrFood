import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { RequestType, TableSession } from '@/lib/db/types';
import { publishRealtimeEvent } from '@/lib/realtime';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, type, note } = body as {
      sessionToken: string;
      type: RequestType;
      note?: string;
    };

    if (!sessionToken || !type) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin phiên bàn hoặc loại yêu cầu.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const session = db
      .prepare(
        `SELECT s.*, t.code as table_code, t.name as table_name
         FROM table_sessions s
         JOIN tables t ON s.table_id = t.id
         WHERE s.session_token = ? AND s.is_active = 1`
      )
      .get(sessionToken) as (TableSession & { table_code: string; table_name: string }) | undefined;

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Phiên bàn không hợp lệ hoặc đã kết thúc.' },
        { status: 403 }
      );
    }

    // Rate-limit check: check if a pending request was submitted within the last 30 seconds
    const recent = db
      .prepare(
        `SELECT COUNT(*) as count FROM service_requests
         WHERE table_session_id = ? AND status = 'PENDING'
         AND datetime(created_at, '+30 seconds') > datetime('now')`
      )
      .get(session.id) as { count: number };

    if (recent.count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Yêu cầu của bạn đã được gửi. Nhân viên đang đến, vui lòng chờ trong giây lát.',
        },
        { status: 429 }
      );
    }

    const reqId = `req_${crypto.randomBytes(8).toString('hex')}`;
    db.prepare(`
      INSERT INTO service_requests (id, restaurant_id, table_id, table_session_id, type, note, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(reqId, session.restaurant_id, session.table_id, session.id, type, note || null);

    // Update table status to WAITING_FOR_SERVICE if currently OCCUPIED
    db.prepare(`
      UPDATE tables SET status = 'WAITING_FOR_SERVICE'
      WHERE id = ? AND status = 'OCCUPIED'
    `).run(session.table_id);

    const payload = {
      id: reqId,
      restaurantId: session.restaurant_id,
      tableId: session.table_id,
      tableCode: session.table_code,
      tableName: session.table_name,
      type,
      note,
      createdAt: new Date().toISOString(),
    };

    publishRealtimeEvent(`restaurant:${session.restaurant_id}:orders`, 'service_request:new', payload);
    publishRealtimeEvent(`restaurant:${session.restaurant_id}:all`, 'service_request:new', payload);

    return NextResponse.json({ success: true, request: payload });
  } catch (error) {
    console.error('Service request error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi gửi yêu cầu phục vụ.' }, { status: 500 });
  }
}
