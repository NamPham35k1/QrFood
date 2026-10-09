-- ============================================================================
-- QRFOOD PLATFORM - POSTGRESQL PRODUCTION DDL SCHEMA
-- Multi-tenant, Strict Foreign Keys, Decimal Currencies & Performance Indexes
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. RESTAURANTS & CONFIGURATIONS
CREATE TABLE IF NOT EXISTS restaurants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    cover_image_url TEXT,
    phone VARCHAR(20),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'VND',
    tax_rate DECIMAL(5,2) DEFAULT 8.00,
    service_charge DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_settings (
    restaurant_id VARCHAR(36) PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    bank_bin VARCHAR(20) DEFAULT '970422',
    bank_account_number VARCHAR(50) DEFAULT '12345678999',
    bank_account_name VARCHAR(100) DEFAULT 'NHA HANG HUONG SEN',
    momo_partner_code VARCHAR(100) DEFAULT 'MOMO_SANDBOX_DEMO',
    vnpay_tmn_code VARCHAR(100) DEFAULT 'VNPAY_SANDBOX_DEMO',
    enable_online_payment BOOLEAN DEFAULT TRUE,
    enable_cash_payment BOOLEAN DEFAULT TRUE,
    auto_confirm_orders BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS & RBAC
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'STAFF', -- 'OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'STAFF'
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. DINING AREAS, TABLES & SESSIONS
CREATE TABLE IF NOT EXISTS dining_areas (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tables (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    area_id VARCHAR(36) REFERENCES dining_areas(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    capacity INT DEFAULT 4,
    status VARCHAR(30) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'WAITING_FOR_SERVICE', 'AWAITING_PAYMENT', 'CLEANING', 'DISABLED'
    is_active BOOLEAN DEFAULT TRUE,
    qr_secret_token VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_table_code_per_restaurant UNIQUE (restaurant_id, code)
);

CREATE TABLE IF NOT EXISTS table_sessions (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id VARCHAR(36) NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    session_token VARCHAR(64) UNIQUE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. MENU: CATEGORIES, PRODUCTS & MODIFIERS
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL,
    discount_price DECIMAL(12,2),
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    preparation_time_minutes INT DEFAULT 15,
    tags TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modifier_groups (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    min_selection INT DEFAULT 0,
    max_selection INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS modifiers (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_delta DECIMAL(12,2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_modifier_groups (
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_group_id VARCHAR(36) NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, modifier_group_id)
);

-- 6. ORDERS & ORDER ITEMS
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id VARCHAR(36) NOT NULL REFERENCES tables(id),
    table_session_id VARCHAR(36) NOT NULL REFERENCES table_sessions(id),
    order_number VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    payment_status VARCHAR(30) DEFAULT 'UNPAID',
    subtotal DECIMAL(14,2) NOT NULL,
    discount_amount DECIMAL(14,2) DEFAULT 0.00,
    tax_amount DECIMAL(14,2) DEFAULT 0.00,
    service_charge DECIMAL(14,2) DEFAULT 0.00,
    total_amount DECIMAL(14,2) NOT NULL,
    note TEXT,
    idempotency_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    modifiers_snapshot TEXT DEFAULT '[]',
    note TEXT,
    status VARCHAR(30) DEFAULT 'PENDING',
    line_total DECIMAL(14,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_status_history (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id VARCHAR(36) REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PAYMENTS & TRANSACTIONS
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id VARCHAR(36) REFERENCES orders(id) ON DELETE CASCADE,
    table_session_id VARCHAR(36) REFERENCES table_sessions(id),
    provider VARCHAR(30) NOT NULL,
    provider_transaction_id VARCHAR(100),
    amount DECIMAL(14,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    status VARCHAR(30) DEFAULT 'UNPAID',
    idempotency_key VARCHAR(64) UNIQUE,
    metadata TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SERVICE REQUESTS & PROMOTIONS
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id VARCHAR(36) NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    table_session_id VARCHAR(36) NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    note TEXT,
    status VARCHAR(30) DEFAULT 'PENDING',
    handled_by_user_id VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_value DECIMAL(12,2) DEFAULT 0.00,
    max_discount_value DECIMAL(12,2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_coupon_per_restaurant UNIQUE (restaurant_id, code)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table_session ON orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_category ON products(restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(restaurant_id, status);
