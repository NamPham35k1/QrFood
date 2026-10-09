# 🍽️ NỀN TẢNG GỌI MÓN & THANH TOÁN TẠI BÀN QRFOOD (MODERN RESTAURANT PLATFORM)

> **QRFood** là hệ thống Web Application hoàn chỉnh cho nhà hàng, cho phép khách hàng quét mã QR Code tại bàn để xem thực đơn, tùy biến món ăn, gửi đơn tới nhà bếp và thanh toán VietQR / Sandbox. Đồng thời, hệ thống cung cấp cổng quản trị đa vai trò (RBAC) với màn hình điều phối bếp (KDS), sơ đồ bàn ăn, in mã QR hàng loạt, quản lý thực đơn và báo cáo doanh thu trực quan.

> 📖 **HƯỚNG DẪN CÀI ĐẶT CHO NGƯỜI MỚI (CLONE TỪ GIT):**  
> Vui lòng xem tài liệu chi tiết từ A - Z tại: [**SETUP_GUIDE.md**](./SETUP_GUIDE.md)

---

## 🌟 5 ĐẶC ĐIỂM CỐT LÕI (CORE HIGHLIGHTS)

1. **Bảo Mật Phiên Bàn (Table Session Token Isolation):**  
   Mỗi bàn có một mã bảo mật QR riêng (`qr_secret_token`). Khách quét mã sẽ được cấp phiên bàn có hạn sử dụng (`table_sessions`). Khách bàn B01 tuyệt đối không thể xem hoặc can thiệp đơn hàng của bàn B02.
2. **Đồng Bộ Thời Gian Thực Hai Chiều (Bi-directional Realtime SSE):**  
   Khách hàng gửi đơn -> Màn hình bếp KDS và thu ngân/quản lý nhận thông báo ngay lập tức mà không cần tải lại trang. Đầu bếp báo "Món đã xong" -> Trạng thái trên điện thoại khách hàng cập nhật tức thì.
3. **Thanh Toán Zero-Trust Phía Server:**  
   Hỗ trợ **VietQR** động (tự động điền số tiền và mã chuyển khoản `QRF <mã_đơn>`), **Sandbox Webhook**, và tiền mặt tại quầy. Server kiểm tra chữ ký số HMAC SHA-256 và xử lý lặp Idempotent chống double-credit.
4. **Phân Quyền Phía Server (Strict RBAC):**  
   5 vai trò phân định rõ quyền hạn: `OWNER` (Chủ), `MANAGER` (Quản lý), `CASHIER` (Thu ngân), `KITCHEN` (Bếp KDS), `STAFF` (Phục vụ). Nhân viên bếp không thể xem doanh thu hay sửa tài khoản.
5. **Kiến Trúc Multi-Tenant Tách Biệt Dữ Liệu:**  
   Mọi bảng dữ liệu nghiệp vụ đều sở hữu `restaurant_id`, chuẩn bị sẵn sàng mở rộng cho mô hình SaaS chuỗi nhà hàng.

---

## 🏗️ CÔNG NGHỆ ÁP DỤNG

- **Frontend & Backend:** Next.js (App Router, Turbopack, React 19, TypeScript)
- **Styling & Design System:** Tailwind CSS v4, Lucide Icons, Mobile-first UX, Print Stylesheet
- **Cơ sở dữ liệu:**
  - *Production:* PostgreSQL (DDL migration chuẩn tại `src/lib/db/schema.sql`)
  - *Local Dev:* SQLite nhúng (Better-SQLite3) chạy ngay lập tức không cần cài đặt Docker/Postgres ngoài.
- **Biểu đồ & Thống kê:** Recharts (AreaChart, BarChart)
- **Realtime:** Server-Sent Events (SSE) với In-memory Event Bus & Polling Fallback
- **Mã QR:** Thư viện `qrcode` hỗ trợ tạo DataURL PNG và SVG, chế độ in thẻ bàn hàng loạt
- **Kiểm thử tự động:** Node.js Native Test Runner (`node:test`) + `tsx`

---

## 📁 CẤU TRÚC DỰ ÁN

```
QRFood/
├── data/                       # Thư mục lưu trữ database SQLite local (qrfood.db)
├── scripts/
│   └── seed.ts                 # Script nạp Seed Data nhà hàng mẫu Hương Sen
├── test/
│   └── business_logic.test.ts  # Test suite kiểm thử 8 kịch bản nghiệp vụ & bảo mật
├── src/
│   ├── app/
│   │   ├── page.tsx            # Trang chủ cổng điều hướng (Portal Landing)
│   │   ├── layout.tsx          # Root Layout với metadata tiếng Việt
│   │   ├── globals.css         # Styling hệ thống, tokens, custom scrollbar, print
│   │   ├── menu/[restaurantSlug]/page.tsx # Customer App: Thực đơn gọi món tại bàn
│   │   ├── orders/[orderId]/   # Customer App: Theo dõi tiến độ đơn hàng Realtime
│   │   │   ├── page.tsx
│   │   │   └── payment/page.tsx # Customer App: Thanh toán VietQR & Sandbox
│   │   ├── admin/
│   │   │   ├── login/page.tsx  # Màn hình đăng nhập kèm Demo Account Switcher
│   │   │   ├── layout.tsx     # Admin Layout, Sidebar RBAC, Bell alert, Realtime Toast
│   │   │   ├── dashboard/page.tsx # Dashboard KPIs & biểu đồ Recharts
│   │   │   ├── orders/page.tsx    # Quản lý đơn hàng (Kanban + Table view)
│   │   │   ├── kitchen/page.tsx   # Màn hình điều phối bếp (KDS) cảm ứng
│   │   │   ├── tables/page.tsx    # Sơ đồ bàn, in tem QR, đổi trạng thái
│   │   │   ├── menu/page.tsx      # Quản lý món ăn, bật tắt hết món
│   │   │   ├── payments/page.tsx  # Quản lý thu ngân & in phiếu thu
│   │   │   ├── promotions/page.tsx# Quản lý mã giảm giá Coupon
│   │   │   ├── staff/page.tsx     # Quản lý nhân viên & vai trò
│   │   │   ├── reports/page.tsx   # Báo cáo doanh thu & xuất CSV
│   │   │   └── audit-logs/page.tsx# Nhật ký kiểm toán thao tác hệ thống
│   │   └── api/                # 15+ Route Handlers cho Public, Admin, Webhook, SSE
│   ├── components/             # Reusable UI components
│   └── lib/
│       ├── db/                 # DB Client, PostgreSQL Schema DDL, Types
│       ├── services/           # Business Logic: Auth, Table, Menu, Order, Payment
│       ├── realtime.ts         # Singleton Event Bus cho Realtime SSE
│       └── format.ts           # Định dạng tiền tệ VND (45.000 ₫), thời gian, badges
└── package.json
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY (LOCAL DEVELOPMENT)

### 1. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 2. Nạp dữ liệu mẫu (Seed Data)
Khởi tạo nhà hàng "Ẩm Thực Hương Sen", 18 món ăn, nhóm topping, bàn ăn, tài khoản và các đơn mẫu:
```bash
npm run seed
```

### 3. Chạy kiểm thử tự động (Unit & Integration Tests)
```bash
npm run test
```
*Kết quả sẽ chạy qua 8 bài kiểm thử: Tính giá topping, Tính thuế VAT & Coupon, Idempotency chống trùng đơn, Chặn món hết hàng, Phân quyền RBAC, Bảo mật mã QR, Xử lý Webhook thanh toán lặp, và Luồng trạng thái đơn hàng.*

### 4. Khởi động Web Server
```bash
npm run dev
# hoặc chạy production bundle:
# npm run build
# npm run start
```
Truy cập: **http://localhost:3000**

---

## 🔑 TÀI KHOẢN ĐĂNG NHẬP THỬ NGHIỆM (DEMO ACCOUNTS)

Trên màn hình đăng nhập quản trị (`/admin/login`), bạn có thể **click chọn trực tiếp** từng tài khoản:

| Vai trò | Email | Mật khẩu | Phạm vi quyền hạn |
| :--- | :--- | :--- | :--- |
| **Owner (Chủ)** | `owner@huongsen.vn` | `Owner@123456` | Toàn quyền hệ thống, xem doanh thu, cấu hình |
| **Manager (Quản lý)** | `manager@huongsen.vn` | `Manager@123456` | Vận hành đơn, sơ đồ bàn, duyệt menu, khuyến mãi |
| **Cashier (Thu ngân)** | `cashier@huongsen.vn` | `Cashier@123456` | Xem đơn, xác nhận thu tiền mặt, in hóa đơn |
| **Kitchen (Bếp KDS)** | `kitchen@huongsen.vn` | `Kitchen@123456` | Chỉ hiển thị vé bếp KDS, cập nhật món xong |
| **Staff (Phục vụ)** | `staff@huongsen.vn` | `Staff@123456` | Xem sơ đồ bàn, xử lý gọi nước/gọi phục vụ |

---

## 📱 QUY TRÌNH TRẢI NGHIỆM NGHIỆP VỤ (END-TO-END DEMO)

### Bước 1: Khách quét QR gọi món tại bàn
1. Mở URL mô phỏng quét QR Bàn 01:  
   `http://localhost:3000/menu/huong-sen?table=B01&token=sec_b01_hs_8821`
2. Nhấn vào món **"Nem Rán Hà Nội"** hoặc **"Phở Bò Tái Lăn"** để mở modal tùy biến.
3. Chọn kích cỡ (Size Lớn), độ cay, thêm topping, ghi chú *"Nhiều hành lá"*.
4. Bấm **"Thêm Vào Giỏ"**, thanh giỏ hàng nổi xuất hiện ở đáy màn hình.
5. Mở giỏ hàng, nhập mã giảm giá `WELCOME10` (giảm 10%), bấm **"Xác Nhận Gọi Món"**.

### Bước 2: Bếp tiếp nhận đơn hàng Realtime
1. Mở cửa sổ thứ hai: `http://localhost:3000/admin/kitchen`
2. Phiếu gọi món mới của Bàn 01 ngay lập tức xuất hiện ở cột **"ĐƠN MỚI CHỜ NẤU"** kèm chuông âm thanh.
3. Đầu bếp bấm **"Nhận Nấu Đơn Này"** -> Đơn chuyển sang **"ĐANG CHẾ BIẾN"**.
4. Khi nấu xong, đầu bếp bấm **"Xong Toàn Bộ Vé (Báo Phục Vụ)"** -> Đơn chuyển sang **"SẴN SÀNG"**.

### Bước 3: Khách theo dõi & Thanh toán VietQR
1. Trên màn hình khách hàng (`/orders/[orderId]`), thanh tiến độ tự động chuyển sang **"Sẵn sàng phục vụ"** mà không cần F5.
2. Khách bấm **"Thanh toán ngay"** -> Mở trang thanh toán VietQR động.
3. Bấm nút **"Mô Phỏng Chuyển Khoản Thành Công (Bắn Webhook Sandbox)"**.
4. Webhook máy chủ xử lý, đơn hàng nhảy sang trạng thái **"ĐÃ THANH TOÁN"**, đồng thời màn hình thu ngân nhận thông báo ngay lập tức!

---

## 🚢 HƯỚNG DẪN TRIỂN KHAI PRODUCTION (DEPLOYMENT)

### Triển khai PostgreSQL lên Supabase / Neon / AWS RDS:
1. Tạo database PostgreSQL mới trên Supabase hoặc Neon.
2. Chạy file script SQL DDL tại `src/lib/db/schema.sql` trong SQL Editor của Supabase/Neon để tạo đầy đủ các bảng và indexes.
3. Cấu hình biến môi trường trên Vercel:
   - `DATABASE_URL=postgresql://...`
   - `NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app`
   - `AUTH_SECRET=[chuỗi_ngẫu_nhiên_32_ký_tự]`
   - `PAYMENT_WEBHOOK_SECRET=[chuỗi_ngẫu_nhiên_32_ký_tự]`
4. Triển khai code Next.js lên Vercel với lệnh `vercel --prod`.

---
*Dự án phát triển với tiêu chuẩn chất lượng cao, giao diện tối ưu hóa cho trải nghiệm nhà hàng cao cấp, tuân thủ nghiêm ngặt tính toàn vẹn dữ liệu tài chính.*
