import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../db';
import { StaffRole, User } from '../db/types';

const AUTH_SECRET = process.env.AUTH_SECRET || 'qrfood_super_secure_jwt_secret_2026';

export interface AuthSessionPayload {
  userId: string;
  restaurantId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  exp: number;
}

// Permission Definitions
export type PermissionAction =
  | 'dashboard:view'
  | 'orders:view'
  | 'orders:manage'
  | 'kitchen:view'
  | 'kitchen:manage'
  | 'tables:view'
  | 'tables:manage'
  | 'menu:view'
  | 'menu:manage'
  | 'payments:view'
  | 'payments:manage'
  | 'coupons:view'
  | 'coupons:manage'
  | 'staff:view'
  | 'staff:manage'
  | 'reports:view'
  | 'settings:manage'
  | 'audit:view';

const ROLE_PERMISSIONS: Record<StaffRole, PermissionAction[]> = {
  OWNER: [
    'dashboard:view',
    'orders:view',
    'orders:manage',
    'kitchen:view',
    'kitchen:manage',
    'tables:view',
    'tables:manage',
    'menu:view',
    'menu:manage',
    'payments:view',
    'payments:manage',
    'coupons:view',
    'coupons:manage',
    'staff:view',
    'staff:manage',
    'reports:view',
    'settings:manage',
    'audit:view',
  ],
  MANAGER: [
    'dashboard:view',
    'orders:view',
    'orders:manage',
    'kitchen:view',
    'kitchen:manage',
    'tables:view',
    'tables:manage',
    'menu:view',
    'menu:manage',
    'payments:view',
    'payments:manage',
    'coupons:view',
    'coupons:manage',
    'staff:view',
    'reports:view',
    'settings:manage',
    'audit:view',
  ],
  CASHIER: [
    'dashboard:view',
    'orders:view',
    'orders:manage',
    'tables:view',
    'payments:view',
    'payments:manage',
  ],
  KITCHEN: [
    'kitchen:view',
    'kitchen:manage',
    'orders:view',
  ],
  STAFF: [
    'orders:view',
    'tables:view',
    'tables:manage',
  ],
};

export function hasPermission(role: StaffRole, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return !!permissions && permissions.includes(action);
}

// Simple signed token implementation (HMAC-SHA256)
export function signToken(payload: Omit<AuthSessionPayload, 'exp'>, expiresInSeconds = 86400 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload: AuthSessionPayload = { ...payload, exp };
  const base64Data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(base64Data).digest('base64url');
  return `${base64Data}.${signature}`;
}

export function verifyToken(token: string): AuthSessionPayload | null {
  try {
    const [base64Data, signature] = token.split('.');
    if (!base64Data || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(base64Data).digest('base64url');
    if (signature !== expectedSig) return null;
    const jsonStr = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as AuthSessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

export async function authenticateStaff(email: string, passwordPlain: string): Promise<{ user: User; token: string } | null> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM users WHERE email = ? AND is_active = 1`).get(email) as User | undefined;
  if (!row) return null;

  const isMatch = await bcrypt.compare(passwordPlain, row.password_hash);
  if (!isMatch) return null;

  // Update last login
  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(row.id);

  const token = signToken({
    userId: row.id,
    restaurantId: row.restaurant_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  });

  return { user: row, token };
}
