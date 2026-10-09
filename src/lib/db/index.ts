import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'qrfood.db');
  dbInstance = new Database(dbPath);

  // Enable foreign keys and WAL mode for maximum performance & concurrent reads
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initTables(dbInstance);

  return dbInstance;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      cover_image_url TEXT,
      phone TEXT,
      address TEXT,
      currency TEXT DEFAULT 'VND',
      tax_rate REAL DEFAULT 8.00,
      service_charge REAL DEFAULT 0.00,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restaurant_settings (
      restaurant_id TEXT PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
      bank_bin TEXT DEFAULT '970422',
      bank_account_number TEXT DEFAULT '12345678999',
      bank_account_name TEXT DEFAULT 'NHA HANG HUONG SEN',
      momo_partner_code TEXT DEFAULT 'MOMO_SANDBOX_DEMO',
      vnpay_tmn_code TEXT DEFAULT 'VNPAY_SANDBOX_DEMO',
      enable_online_payment INTEGER DEFAULT 1,
      enable_cash_payment INTEGER DEFAULT 1,
      auto_confirm_orders INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STAFF',
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dining_areas (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      area_id TEXT REFERENCES dining_areas(id) ON DELETE SET NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'AVAILABLE',
      is_active INTEGER DEFAULT 1,
      qr_secret_token TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(restaurant_id, code)
    );

    CREATE TABLE IF NOT EXISTS table_sessions (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      base_price REAL NOT NULL,
      discount_price REAL,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      preparation_time_minutes INTEGER DEFAULT 15,
      tags TEXT DEFAULT '[]',
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS modifier_groups (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_required INTEGER DEFAULT 0,
      min_selection INTEGER DEFAULT 0,
      max_selection INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS modifiers (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_delta REAL DEFAULT 0.00,
      is_default INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS product_modifier_groups (
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      modifier_group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, modifier_group_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      table_id TEXT NOT NULL REFERENCES tables(id),
      table_session_id TEXT NOT NULL REFERENCES table_sessions(id),
      order_number TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      payment_status TEXT DEFAULT 'UNPAID',
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0.00,
      tax_amount REAL DEFAULT 0.00,
      service_charge REAL DEFAULT 0.00,
      total_amount REAL NOT NULL,
      note TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name_snapshot TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      modifiers_snapshot TEXT DEFAULT '[]',
      note TEXT,
      status TEXT DEFAULT 'PENDING',
      line_total REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by_user_id TEXT REFERENCES users(id),
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
      table_session_id TEXT REFERENCES table_sessions(id),
      provider TEXT NOT NULL,
      provider_transaction_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'VND',
      status TEXT DEFAULT 'UNPAID',
      idempotency_key TEXT UNIQUE,
      metadata TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      table_session_id TEXT NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      note TEXT,
      status TEXT DEFAULT 'PENDING',
      handled_by_user_id TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      min_order_value REAL DEFAULT 0.00,
      max_discount_value REAL,
      usage_limit INTEGER,
      usage_count INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      UNIQUE(restaurant_id, code)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_table_session ON orders(table_session_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_products_restaurant_category ON products(restaurant_id, category_id);
    CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(restaurant_id, status);
  `);
}
