export type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'STAFF';

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'WAITING_FOR_SERVICE'
  | 'AWAITING_PAYMENT'
  | 'CLEANING'
  | 'DISABLED';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING_VERIFICATION'
  | 'PAID'
  | 'REFUNDED'
  | 'FAILED';

export type OrderItemStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'CANCELLED';

export type PaymentProvider =
  | 'VIETQR'
  | 'MOMO'
  | 'VNPAY'
  | 'CASH'
  | 'PAY_LATER';

export type RequestType = 'CALL_STAFF' | 'WATER' | 'BILL' | 'ASSISTANCE';
export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  tax_rate: number;
  service_charge: number;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantSettings {
  restaurant_id: string;
  bank_bin: string;
  bank_account_number: string;
  bank_account_name: string;
  momo_partner_code: string;
  vnpay_tmn_code: string;
  enable_online_payment: number | boolean;
  enable_cash_payment: number | boolean;
  auto_confirm_orders: number | boolean;
  updated_at: string;
}

export interface User {
  id: string;
  restaurant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: StaffRole;
  avatar_url: string | null;
  is_active: number | boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface DiningArea {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
}

export interface TableItem {
  id: string;
  restaurant_id: string;
  area_id: string | null;
  area_name?: string;
  code: string;
  name: string;
  capacity: number;
  status: TableStatus;
  is_active: number | boolean;
  qr_secret_token: string;
  created_at: string;
  active_session_token?: string | null;
  active_order_count?: number;
}

export interface TableSession {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_token: string;
  started_at: string;
  ended_at: string | null;
  is_active: number | boolean;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: number | boolean;
  product_count?: number;
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_default: number | boolean;
  is_available: number | boolean;
}

export interface ModifierGroup {
  id: string;
  restaurant_id: string;
  name: string;
  is_required: number | boolean;
  min_selection: number;
  max_selection: number;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  category_name?: string;
  name: string;
  description: string | null;
  base_price: number;
  discount_price: number | null;
  image_url: string | null;
  is_available: number | boolean;
  is_featured: number | boolean;
  preparation_time_minutes: number;
  tags: string[]; // parsed from JSON
  display_order: number;
  created_at: string;
  modifier_groups?: ModifierGroup[];
}

export interface ModifierSnapshot {
  groupId: string;
  groupName: string;
  modifierId: string;
  name: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price: number;
  quantity: number;
  modifiers_snapshot: ModifierSnapshot[];
  note: string | null;
  status: OrderItemStatus;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_code?: string;
  table_name?: string;
  area_name?: string;
  table_session_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  note: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items?: OrderItem[];
}

export interface Payment {
  id: string;
  restaurant_id: string;
  order_id: string;
  table_session_id: string | null;
  provider: PaymentProvider;
  provider_transaction_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotency_key: string | null;
  metadata: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  order_number?: string;
  table_code?: string;
}

export interface ServiceRequest {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_code?: string;
  table_name?: string;
  table_session_id: string;
  type: RequestType;
  note: string | null;
  status: RequestStatus;
  handled_by_user_id: string | null;
  handled_by_name?: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  restaurant_id: string;
  code: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  min_order_value: number;
  max_discount_value: number | null;
  usage_limit: number | null;
  usage_count: number;
  start_date: string | null;
  end_date: string | null;
  is_active: number | boolean;
}

export interface AuditLog {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  user_name?: string;
  action: string;
  entity_name: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
