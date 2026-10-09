import crypto from 'crypto';
import QRCode from 'qrcode';
import { getDb } from '../db';
import { Restaurant, TableItem, TableSession } from '../db/types';

export interface TableContextResult {
  restaurant: Restaurant;
  table: TableItem;
  session: TableSession;
}

export async function validateTableQR(
  restaurantSlug: string,
  tableCode: string,
  secretToken?: string
): Promise<TableContextResult | null> {
  const db = getDb();

  // 1. Get restaurant
  const restaurant = db
    .prepare(`SELECT * FROM restaurants WHERE slug = ? AND is_active = 1`)
    .get(restaurantSlug) as Restaurant | undefined;

  if (!restaurant) return null;

  // 2. Get table
  const table = db
    .prepare(
      `SELECT t.*, a.name as area_name
       FROM tables t
       LEFT JOIN dining_areas a ON t.area_id = a.id
       WHERE t.restaurant_id = ? AND t.code = ? AND t.is_active = 1`
    )
    .get(restaurant.id, tableCode) as TableItem | undefined;

  if (!table) return null;

  // 3. Verify secretToken if provided (or fallback if matched)
  if (secretToken && table.qr_secret_token !== secretToken) {
    // Secret does not match - possible tamper or expired QR print
    return null;
  }

  // 4. Find active session or create new one
  let session = db
    .prepare(
      `SELECT * FROM table_sessions
       WHERE restaurant_id = ? AND table_id = ? AND is_active = 1
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(restaurant.id, table.id) as TableSession | undefined;

  if (!session) {
    const sessionId = `sess_${crypto.randomBytes(8).toString('hex')}`;
    const sessionToken = `st_${crypto.randomBytes(16).toString('hex')}`;

    db.prepare(
      `INSERT INTO table_sessions (id, restaurant_id, table_id, session_token, is_active)
       VALUES (?, ?, ?, ?, 1)`
    ).run(sessionId, restaurant.id, table.id, sessionToken);

    session = db
      .prepare(`SELECT * FROM table_sessions WHERE id = ?`)
      .get(sessionId) as TableSession;

    // Set table status to OCCUPIED if it was AVAILABLE
    if (table.status === 'AVAILABLE') {
      db.prepare(`UPDATE tables SET status = 'OCCUPIED' WHERE id = ?`).run(table.id);
      table.status = 'OCCUPIED';
    }
  }

  return {
    restaurant,
    table,
    session,
  };
}

export function getSessionContext(sessionToken: string): {
  restaurant: Restaurant;
  table: TableItem;
  session: TableSession;
} | null {
  const db = getDb();
  const session = db
    .prepare(`SELECT * FROM table_sessions WHERE session_token = ? AND is_active = 1`)
    .get(sessionToken) as TableSession | undefined;

  if (!session) return null;

  const restaurant = db
    .prepare(`SELECT * FROM restaurants WHERE id = ?`)
    .get(session.restaurant_id) as Restaurant | undefined;

  const table = db
    .prepare(
      `SELECT t.*, a.name as area_name
       FROM tables t
       LEFT JOIN dining_areas a ON t.area_id = a.id
       WHERE t.id = ?`
    )
    .get(session.table_id) as TableItem | undefined;

  if (!restaurant || !table) return null;

  return { restaurant, table, session };
}

export async function generateQrPng(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 320,
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
  });
}

export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
  });
}

export function regenerateTableQrSecret(restaurantId: string, tableId: string): string {
  const db = getDb();
  const newSecret = `sec_${crypto.randomBytes(12).toString('hex')}`;
  db.prepare(`UPDATE tables SET qr_secret_token = ? WHERE id = ? AND restaurant_id = ?`).run(
    newSecret,
    tableId,
    restaurantId
  );
  return newSecret;
}
