import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission } from '@/lib/services/auth.service';
import { getDb } from '@/lib/db';
import { AuditLog } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('qrfood_token')?.value;
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'audit:view')) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập nhật ký.' }, { status: 403 });
    }

    const db = getDb();
    const logsRaw = db
      .prepare(
        `SELECT a.*, u.full_name as user_name
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.restaurant_id = ?
         ORDER BY a.created_at DESC LIMIT 50`
      )
      .all(payload.restaurantId) as (Omit<AuditLog, 'details'> & { details: string })[];

    const logs = logsRaw.map((l) => {
      let details = null;
      try {
        details = JSON.parse(l.details || '{}');
      } catch {
        details = null;
      }
      return { ...l, details };
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải nhật ký hệ thống.' }, { status: 500 });
  }
}
