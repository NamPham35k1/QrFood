import bcrypt from 'bcryptjs';
import { getDb } from '../src/lib/db';

export async function runSeed() {
  console.log('🌱 Bắt đầu nạp Seed Data cho QRFood...');
  const db = getDb();

  // 1. Clean existing demo tables in order
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM coupons;
    DELETE FROM service_requests;
    DELETE FROM payments;
    DELETE FROM order_status_history;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM product_modifier_groups;
    DELETE FROM modifiers;
    DELETE FROM modifier_groups;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM table_sessions;
    DELETE FROM tables;
    DELETE FROM dining_areas;
    DELETE FROM users;
    DELETE FROM restaurant_settings;
    DELETE FROM restaurants;
  `);

  // 2. Insert Restaurant
  const restaurantId = 'rest_huong_sen_01';
  db.prepare(`
    INSERT INTO restaurants (id, name, slug, logo_url, cover_image_url, phone, address, currency, tax_rate, service_charge, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    restaurantId,
    'Nhà Hàng Ẩm Thực Hương Sen',
    'huong-sen',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    '0908 123 456',
    'Số 128 Nguyễn Du, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    'VND',
    8.0,
    0.0
  );

  // 3. Insert Settings (VietQR & Sandbox)
  db.prepare(`
    INSERT INTO restaurant_settings (restaurant_id, bank_bin, bank_account_number, bank_account_name, momo_partner_code, vnpay_tmn_code, enable_online_payment, enable_cash_payment, auto_confirm_orders)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0)
  `).run(
    restaurantId,
    '970422', // MBBank
    '0908123456888',
    'NHA HANG HUONG SEN',
    'MOMO_SANDBOX_HS',
    'VNPAY_SANDBOX_HS'
  );

  // 4. Insert Users / Staff with hashed passwords
  const salt = bcrypt.genSaltSync(10);
  const passwordOwner = bcrypt.hashSync('Owner@123456', salt);
  const passwordManager = bcrypt.hashSync('Manager@123456', salt);
  const passwordCashier = bcrypt.hashSync('Cashier@123456', salt);
  const passwordKitchen = bcrypt.hashSync('Kitchen@123456', salt);
  const passwordStaff = bcrypt.hashSync('Staff@123456', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (id, restaurant_id, email, password_hash, full_name, role, avatar_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertUser.run('usr_owner_01', restaurantId, 'owner@huongsen.vn', passwordOwner, 'Trần Minh Tuấn (Chủ)', 'OWNER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
  insertUser.run('usr_manager_01', restaurantId, 'manager@huongsen.vn', passwordManager, 'Lê Hoàng Yến (Quản lý)', 'MANAGER', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80');
  insertUser.run('usr_cashier_01', restaurantId, 'cashier@huongsen.vn', passwordCashier, 'Phạm Quỳnh Nga (Thu ngân)', 'CASHIER', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80');
  insertUser.run('usr_kitchen_01', restaurantId, 'kitchen@huongsen.vn', passwordKitchen, 'Bếp Trưởng Nguyễn Văn Hùng', 'KITCHEN', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80');
  insertUser.run('usr_staff_01', restaurantId, 'staff@huongsen.vn', passwordStaff, 'Đỗ Khắc Nam (Phục vụ)', 'STAFF', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80');

  // 5. Insert Dining Areas
  const insertArea = db.prepare(`INSERT INTO dining_areas (id, restaurant_id, name, display_order) VALUES (?, ?, ?, ?)`);
  insertArea.run('area_01', restaurantId, 'Tầng 1 - Phòng Máy Lạnh', 1);
  insertArea.run('area_02', restaurantId, 'Tầng 2 - Sân Vườn View Phố', 2);
  insertArea.run('area_03', restaurantId, 'Khu VIP Hương Sen', 3);

  // 6. Insert Tables
  const insertTable = db.prepare(`
    INSERT INTO tables (id, restaurant_id, area_id, code, name, capacity, status, is_active, qr_secret_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  insertTable.run('tbl_01', restaurantId, 'area_01', 'B01', 'Bàn 01', 4, 'OCCUPIED', 'sec_b01_hs_8821');
  insertTable.run('tbl_02', restaurantId, 'area_01', 'B02', 'Bàn 02', 4, 'OCCUPIED', 'sec_b02_hs_9934');
  insertTable.run('tbl_03', restaurantId, 'area_01', 'B03', 'Bàn 03', 2, 'WAITING_FOR_SERVICE', 'sec_b03_hs_1022');
  insertTable.run('tbl_04', restaurantId, 'area_01', 'B04', 'Bàn 04', 6, 'AWAITING_PAYMENT', 'sec_b04_hs_3490');
  insertTable.run('tbl_05', restaurantId, 'area_01', 'B05', 'Bàn 05', 4, 'AVAILABLE', 'sec_b05_hs_5512');

  insertTable.run('tbl_06', restaurantId, 'area_02', 'B06', 'Bàn Sân Vườn 06', 4, 'AVAILABLE', 'sec_b06_hs_7721');
  insertTable.run('tbl_07', restaurantId, 'area_02', 'B07', 'Bàn Sân Vườn 07', 4, 'AVAILABLE', 'sec_b07_hs_4431');
  insertTable.run('tbl_08', restaurantId, 'area_02', 'B08', 'Bàn Sân Vườn 08', 8, 'AVAILABLE', 'sec_b08_hs_2289');

  insertTable.run('tbl_09', restaurantId, 'area_03', 'VIP01', 'Phòng VIP Hoa Sen', 10, 'OCCUPIED', 'sec_vip01_hs_9901');
  insertTable.run('tbl_10', restaurantId, 'area_03', 'VIP02', 'Phòng VIP Hoàng Mai', 12, 'AVAILABLE', 'sec_vip02_hs_9902');

  // 7. Insert Active Table Sessions
  const insertSession = db.prepare(`
    INSERT INTO table_sessions (id, restaurant_id, table_id, session_token, started_at, is_active)
    VALUES (?, ?, ?, ?, datetime('now', '-2 hours'), 1)
  `);
  insertSession.run('sess_b01', restaurantId, 'tbl_01', 'demo_session_b01');
  insertSession.run('sess_b02', restaurantId, 'tbl_02', 'demo_session_b02');
  insertSession.run('sess_b03', restaurantId, 'tbl_03', 'demo_session_b03');
  insertSession.run('sess_b04', restaurantId, 'tbl_04', 'demo_session_b04');
  insertSession.run('sess_vip01', restaurantId, 'tbl_09', 'demo_session_vip01');

  // 8. Insert Categories
  const insertCat = db.prepare(`
    INSERT INTO categories (id, restaurant_id, name, description, image_url, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insertCat.run('cat_01', restaurantId, 'Món Khai Vị & Ăn Nhẹ', 'Kích thích vị giác với các món gỏi, nem truyền thống đậm vị Việt', 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=500&auto=format&fit=crop&q=80', 1);
  insertCat.run('cat_02', restaurantId, 'Món Chính & Đặc Sản', 'Món ăn gia đình đậm đà hương vị đồng quê ba miền', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80', 2);
  insertCat.run('cat_03', restaurantId, 'Cơm & Mì Nước', 'Cơm niêu nóng hổi, phở bò truyền thống nấu từ nước hầm xương 24h', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=80', 3);
  insertCat.run('cat_04', restaurantId, 'Đồ Uống & Trà Thảo Mộc', 'Trà sen vàng, nước ép trái cây tươi và cà phê hạt pha phin', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80', 4);
  insertCat.run('cat_05', restaurantId, 'Món Tráng Miệng', 'Chè hạt sen long nhãn mát lành, bánh flan sữa béo ngậy', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80', 5);

  // 9. Insert Modifier Groups
  const insertModGroup = db.prepare(`
    INSERT INTO modifier_groups (id, restaurant_id, name, is_required, min_selection, max_selection)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertModGroup.run('grp_size', restaurantId, 'Kích cỡ (Size)', 1, 1, 1);
  insertModGroup.run('grp_spicy', restaurantId, 'Độ cay mong muốn', 0, 0, 1);
  insertModGroup.run('grp_toppings_main', restaurantId, 'Topping thêm', 0, 0, 3);
  insertModGroup.run('grp_drink_sugar', restaurantId, 'Độ ngọt / Đường', 1, 1, 1);
  insertModGroup.run('grp_drink_ice', restaurantId, 'Lượng đá', 1, 1, 1);

  // 10. Insert Modifiers
  const insertMod = db.prepare(`
    INSERT INTO modifiers (id, group_id, name, price_delta, is_default, is_available)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  // Size
  insertMod.run('mod_size_s', 'grp_size', 'Tiêu chuẩn (Vừa)', 0, 1);
  insertMod.run('mod_size_l', 'grp_size', 'Phần lớn (+Topping)', 15000, 0);

  // Spicy
  insertMod.run('mod_spicy_none', 'grp_spicy', 'Không cay', 0, 1);
  insertMod.run('mod_spicy_mild', 'grp_spicy', 'Cay nhẹ', 0, 0);
  insertMod.run('mod_spicy_hot', 'grp_spicy', 'Cay nhiều', 0, 0);

  // Toppings
  insertMod.run('mod_top_egg', 'grp_toppings_main', 'Trứng ốp la lòng đào', 10000, 0);
  insertMod.run('mod_top_pork', 'grp_toppings_main', 'Thịt nướng xiên thêm', 25000, 0);
  insertMod.run('mod_top_roll', 'grp_toppings_main', 'Chả ram tôm đất (2 cuốn)', 20000, 0);

  // Sugar
  insertMod.run('mod_sugar_100', 'grp_drink_sugar', '100% Ngọt bình thường', 0, 1);
  insertMod.run('mod_sugar_50', 'grp_drink_sugar', '50% Ít ngọt', 0, 0);
  insertMod.run('mod_sugar_0', 'grp_drink_sugar', 'Không đường', 0, 0);

  // Ice
  insertMod.run('mod_ice_100', 'grp_drink_ice', 'Đá bình thường', 0, 1);
  insertMod.run('mod_ice_50', 'grp_drink_ice', 'Ít đá', 0, 0);
  insertMod.run('mod_ice_none', 'grp_drink_ice', 'Không đá', 0, 0);

  // 11. Insert Products
  const insertProd = db.prepare(`
    INSERT INTO products (id, restaurant_id, category_id, name, description, base_price, discount_price, image_url, is_available, is_featured, preparation_time_minutes, tags, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `);

  // Product helper mapping
  const linkProdMod = db.prepare(`
    INSERT INTO product_modifier_groups (product_id, modifier_group_id)
    VALUES (?, ?)
  `);

  // Category 1: Khai vị
  insertProd.run('prod_01', restaurantId, 'cat_01', 'Nem Rán Hà Nội Truyền Thống', 'Nhân thịt băm, nấm hương, mộc nhĩ giòn rụm chấm nước mắm tỏi ớt chua ngọt', 65000, 59000, 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80', 1, 10, '["bestseller"]', 1);
  linkProdMod.run('prod_01', 'grp_spicy');

  insertProd.run('prod_02', restaurantId, 'cat_01', 'Gỏi Ngó Sen Tôm Thịt', 'Ngó sen tươi giòn quyện cùng tôm sú biển, thịt ba chỉ và rau răm thơm lừng', 85000, null, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80', 1, 12, '["bestseller"]', 2);
  linkProdMod.run('prod_02', 'grp_spicy');

  insertProd.run('prod_03', restaurantId, 'cat_01', 'Chả Giò Hải Sản Sốt Mayo', 'Bọc bánh tráng bò bía giòn tan, nhân tôm mực tươi sốt mayonnaise béo thơm', 75000, null, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', 0, 10, '[]', 3);

  // Category 2: Món chính & Đặc sản
  insertProd.run('prod_04', restaurantId, 'cat_02', 'Cá Kho Tộ Miền Tây', 'Cá bống tươi kho niêu đất thơm ngậy với nước dừa tươi và hạt tiêu sọ', 125000, null, 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80', 1, 20, '["bestseller"]', 1);
  linkProdMod.run('prod_04', 'grp_spicy');

  insertProd.run('prod_05', restaurantId, 'cat_02', 'Thịt Ba Chỉ Cháy Cạnh', 'Thịt heo tươi giòn cháy cạnh sốt mắm đường caramel keo sánh thơm phức', 95000, null, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', 0, 15, '[]', 2);
  linkProdMod.run('prod_05', 'grp_spicy');

  insertProd.run('prod_06', restaurantId, 'cat_02', 'Canh Chua Cá Hồi Bông Điên Điển', 'Hương vị thanh mát giải nhiệt với bạc hà, đậu bắp, dứa thơm và cá hồi béo ngậy', 110000, 99000, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80', 1, 15, '["bestseller"]', 3);

  insertProd.run('prod_07', restaurantId, 'cat_02', 'Rau Muống Xào Tỏi Cháy', 'Rau muống non xanh mướt phi tỏi thơm lừng dậy mùi bếp Việt', 45000, null, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80', 0, 8, '["vegetarian"]', 4);

  insertProd.run('prod_08', restaurantId, 'cat_02', 'Gà Ta Nướng Mắc Khén Tây Bắc', 'Gà thả vườn ướp gia vị mắc khén, hạt dổi nướng than hoa vàng giòn da thơm ngọt thịt', 185000, null, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80', 1, 25, '["bestseller", "spicy"]', 5);

  // Category 3: Cơm & Mì
  insertProd.run('prod_09', restaurantId, 'cat_03', 'Phở Bò Tái Lăn Hương Sen', 'Nước dùng ninh xương bò 24 giờ thơm mùi hoa hồi, thảo quả kèm thịt bò xào tái lăn mềm mọng', 75000, 69000, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80', 1, 12, '["bestseller"]', 1);
  linkProdMod.run('prod_09', 'grp_size');
  linkProdMod.run('prod_09', 'grp_spicy');

  insertProd.run('prod_10', restaurantId, 'cat_03', 'Bún Chả Hà Nội Nướng Than Hoa', 'Chả miếng và chả viên nướng xém cạnh, ăn kèm bún tươi, rau sống và nước chấm đu đủ xanh', 70000, null, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&auto=format&fit=crop&q=80', 1, 12, '["bestseller"]', 2);
  linkProdMod.run('prod_10', 'grp_size');
  linkProdMod.run('prod_10', 'grp_toppings_main');

  insertProd.run('prod_11', restaurantId, 'cat_03', 'Cơm Niêu Đập Cháy Giòn', 'Cơm niêu nấu chậm với lớp cháy giòn rụm vàng óng chấm kho quẹt tôm thịt', 55000, null, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80', 0, 15, '[]', 3);
  linkProdMod.run('prod_11', 'grp_toppings_main');

  insertProd.run('prod_12', restaurantId, 'cat_03', 'Bún Bò Huế Chả Cua Đặc Biệt', 'Bún sợi to, bắp bò hoa giòn, chả cua Huế chuẩn vị với nước lèo sả ớt cay nồng ấm bụng', 80000, null, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80', 1, 15, '["spicy"]', 4);
  linkProdMod.run('prod_12', 'grp_size');
  linkProdMod.run('prod_12', 'grp_spicy');

  // Category 4: Đồ uống
  insertProd.run('prod_13', restaurantId, 'cat_04', 'Trà Sen Vàng Kem Macchiato', 'Trà Ô long ướp hoa sen tươi thượng hạng kết hợp củ sen giòn và lớp bọt kem phô mai béo ngậy', 45000, 39000, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80', 1, 5, '["bestseller"]', 1);
  linkProdMod.run('prod_13', 'grp_drink_sugar');
  linkProdMod.run('prod_13', 'grp_drink_ice');

  insertProd.run('prod_14', restaurantId, 'cat_04', 'Cà Phê Trứng Hà Nội', 'Cà phê Robusta Đắk Lắk đậm đà phủ lớp kem trứng đánh bông mịn như mây thơm béo không tanh', 48000, null, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 1, 8, '["bestseller"]', 2);
  linkProdMod.run('prod_14', 'grp_drink_sugar');

  insertProd.run('prod_15', restaurantId, 'cat_04', 'Nước Ép Dưa Hấu Chanh Tươi', 'Dưa hấu tươi mát ép nguyên chất hòa chút chanh tạo vị chua thanh sảng khoái', 38000, null, 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&auto=format&fit=crop&q=80', 0, 5, '[]', 3);
  linkProdMod.run('prod_15', 'grp_drink_sugar');
  linkProdMod.run('prod_15', 'grp_drink_ice');

  insertProd.run('prod_16', restaurantId, 'cat_04', 'Trà Tắc Xí Muội Thảo Mộc', 'Vị chua thanh mát của tắc tươi quyện cùng vị ngọt mặn lắng đọng của xí muội giải nhiệt', 32000, null, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80', 0, 5, '[]', 4);
  linkProdMod.run('prod_16', 'grp_drink_sugar');
  linkProdMod.run('prod_16', 'grp_drink_ice');

  // Category 5: Tráng miệng
  insertProd.run('prod_17', restaurantId, 'cat_05', 'Chè Hạt Sen Long Nhãn Cố Đô', 'Hạt sen Huế bùi bùi lồng khéo léo trong cùi nhãn ngọt giòn với nước đường phèn hoa bưởi thanh khiết', 38000, null, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80', 1, 5, '["vegetarian"]', 1);

  insertProd.run('prod_18', restaurantId, 'cat_05', 'Bánh Flan Caramen Cốt Dừa', 'Bánh flan mềm mịn tan trong miệng ngập tràn sốt cà phê caramel và nước cốt dừa béo bùi', 28000, null, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80', 0, 5, '[]', 2);

  // 12. Insert Sample Orders
  const insertOrder = db.prepare(`
    INSERT INTO orders (id, restaurant_id, table_id, table_session_id, order_number, status, payment_status, subtotal, discount_amount, tax_amount, service_charge, total_amount, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, product_name_snapshot, unit_price, quantity, modifiers_snapshot, note, status, line_total, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  // Order 1: Bàn 01 - PENDING
  insertOrder.run('ord_001', restaurantId, 'tbl_01', 'sess_b01', 'ORD-202610-001', 'PENDING', 'UNPAID', 173000, 0, 13840, 186840, 'Làm cay vừa giúp khách ạ', '-5 minutes', '-5 minutes');
  insertItem.run('item_001', 'ord_001', 'prod_01', 'Nem Rán Hà Nội Truyền Thống', 59000, 1, JSON.stringify([{ groupName: 'Độ cay', name: 'Cay nhẹ', priceDelta: 0 }]), 'Chấm ít tương', 'PENDING', 59000, '-5 minutes');
  insertItem.run('item_002', 'ord_001', 'prod_09', 'Phở Bò Tái Lăn Hương Sen', 69000, 1, JSON.stringify([{ groupName: 'Kích cỡ', name: 'Phần lớn (+Topping)', priceDelta: 15000 }]), 'Nhiều hành lá', 'PENDING', 84000, '-5 minutes');
  insertItem.run('item_003', 'ord_001', 'prod_13', 'Trà Sen Vàng Kem Macchiato', 39000, 1, JSON.stringify([{ groupName: 'Độ ngọt', name: '50% Ít ngọt', priceDelta: 0 }]), null, 'PENDING', 39000, '-5 minutes');

  // Order 2: Bàn 02 - PREPARING
  insertOrder.run('ord_002', restaurantId, 'tbl_02', 'sess_b02', 'ORD-202610-002', 'PREPARING', 'UNPAID', 249000, 0, 19920, 268920, 'Bàn gia đình có trẻ em', '-18 minutes', '-12 minutes');
  insertItem.run('item_004', 'ord_002', 'prod_04', 'Cá Kho Tộ Miền Tây', 125000, 1, '[]', 'Ít tiêu cho bé', 'PREPARING', 125000, '-18 minutes');
  insertItem.run('item_005', 'ord_002', 'prod_11', 'Cơm Niêu Đập Cháy Giòn', 55000, 2, '[]', null, 'PREPARING', 110000, '-18 minutes');
  insertItem.run('item_006', 'ord_002', 'prod_15', 'Nước Ép Dưa Hấu Chanh Tươi', 38000, 1, '[]', 'Không đường', 'READY', 38000, '-18 minutes');

  // Order 3: Bàn 04 - READY
  insertOrder.run('ord_003', restaurantId, 'tbl_04', 'sess_b04', 'ORD-202610-003', 'READY', 'UNPAID', 224000, 0, 17920, 241920, null, '-35 minutes', '-5 minutes');
  insertItem.run('item_007', 'ord_003', 'prod_08', 'Gà Ta Nướng Mắc Khén Tây Bắc', 185000, 1, '[]', null, 'READY', 185000, '-35 minutes');
  insertItem.run('item_008', 'ord_003', 'prod_13', 'Trà Sen Vàng Kem Macchiato', 39000, 1, '[]', null, 'SERVED', 39000, '-35 minutes');

  // Order 4: VIP01 - COMPLETED & PAID
  insertOrder.run('ord_004', restaurantId, 'tbl_09', 'sess_vip01', 'ORD-202610-004', 'COMPLETED', 'PAID', 585000, 50000, 42800, 577800, 'Khách đặt trước', '-90 minutes', '-20 minutes');
  insertItem.run('item_009', 'ord_004', 'prod_08', 'Gà Ta Nướng Mắc Khén Tây Bắc', 185000, 2, '[]', null, 'SERVED', 370000, '-90 minutes');
  insertItem.run('item_010', 'ord_004', 'prod_06', 'Canh Chua Cá Hồi Bông Điên Điển', 99000, 1, '[]', null, 'SERVED', 99000, '-90 minutes');
  insertItem.run('item_011', 'ord_004', 'prod_14', 'Cà Phê Trứng Hà Nội', 48000, 2, '[]', null, 'SERVED', 96000, '-90 minutes');

  // Payment for Order 4
  db.prepare(`
    INSERT INTO payments (id, restaurant_id, order_id, table_session_id, provider, provider_transaction_id, amount, currency, status, idempotency_key, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'VND', 'PAID', ?, datetime('now', '-20 minutes'))
  `).run(
    'pay_001',
    restaurantId,
    'ord_004',
    'sess_vip01',
    'VIETQR',
    'FT261009988123',
    577800,
    'idemp_pay_001'
  );

  // 13. Coupons
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (id, restaurant_id, code, discount_type, discount_value, min_order_value, max_discount_value, usage_limit, usage_count, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `);
  insertCoupon.run('coup_01', restaurantId, 'WELCOME10', 'PERCENT', 10.0, 100000, 50000, 100);
  insertCoupon.run('coup_02', restaurantId, 'HUONGSEN20', 'FIXED', 20000, 150000, 20000, 50);

  // 14. Service requests
  const insertReq = db.prepare(`
    INSERT INTO service_requests (id, restaurant_id, table_id, table_session_id, type, note, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);
  insertReq.run('req_01', restaurantId, 'tbl_03', 'sess_b03', 'WATER', 'Bàn 03 xin thêm 1 ca nước đá và 2 ly rỗng', 'PENDING', '-4 minutes');
  insertReq.run('req_02', restaurantId, 'tbl_04', 'sess_b04', 'BILL', 'Bàn 04 yêu cầu mang hóa đơn và máy quẹt thẻ', 'PENDING', '-2 minutes');

  // 15. Audit logs
  db.prepare(`
    INSERT INTO audit_logs (id, restaurant_id, user_id, action, entity_name, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-25 minutes'))
  `).run(
    'audit_01',
    restaurantId,
    'usr_cashier_01',
    'PAYMENT_CONFIRMED',
    'orders',
    'ord_004',
    JSON.stringify({ method: 'VIETQR', amount: 577800, bankTxId: 'FT261009988123' }),
    '127.0.0.1'
  );

  console.log('✅ Seed Data hoàn tất thành công!');
  console.log(`- Nhà hàng: ${restaurantId} (slug: huong-sen)`);
  console.log('- Tài khoản đăng nhập mẫu:');
  console.log('  * Owner: owner@huongsen.vn / Owner@123456');
  console.log('  * Manager: manager@huongsen.vn / Manager@123456');
  console.log('  * Cashier: cashier@huongsen.vn / Cashier@123456');
  console.log('  * Kitchen: kitchen@huongsen.vn / Kitchen@123456');
  console.log('  * Staff: staff@huongsen.vn / Staff@123456');
  console.log('- Bàn test QR: Bàn 01 (token: demo_session_b01), Bàn 02 (token: demo_session_b02)');
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('Lỗi nạp seed:', err);
    process.exit(1);
  });
}
