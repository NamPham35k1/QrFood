# 📖 HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY DỰ ÁN QRFOOD (TỪ A - Z)
> **Dành cho thành viên mới, giảng viên chấm đồ án, hoặc lập trình viên vừa clone mã nguồn về máy.**

Tài liệu này hướng dẫn chi tiết từng bước để cài đặt, cấu hình và chạy dự án **QRFood** trên máy tính cá nhân (Localhost) và đưa lên đám mây (Production).

---

## 📌 MỤC LỤC
1. [Yêu Cầu Môi Trường Cài Đặt (Prerequisites)](#1-yêu-cầu-môi-trường-cài-đặt)
2. [Bước 1: Clone Mã Nguồn Từ Git](#bước-1-clone-mã-nguồn-từ-git)
3. [Bước 2: Cài Đặt Các Gói Thư Viện (Dependencies)](#bước-2-cài-đặt-các-gói-thư-viện)
4. [Bước 3: Cấu Hình Biến Môi Trường (.env)](#bước-3-cấu-hình-biến-môi-trường)
5. [Bước 4: Nạp Dữ Liệu Ban Đầu (Seed Data)](#bước-4-nạp-dữ-liệu-ban-đầu)
6. [Bước 5: Chạy Kiểm Thử Hệ Thống (Automated Tests)](#bước-5-chạy-kiểm-thử-hệ-thống)
7. [Bước 6: Khởi Động Ứng Dụng](#bước-6-khởi-động-ứng-dụng)
8. [Tài Khoản & Đường Dẫn Trải Nghiệm Mẫu](#8-tài-khoản--đường-dẫn-trải-nghiệm-mẫu)
9. [Hướng Dẫn Kết Nối Điện Thoại Thật (Test Quét QR Qua Wi-Fi)](#9-hướng-dẫn-kết-nối-điện-thoại-thật)
10. [Hướng Dẫn Triển Khai Lên Vercel & Supabase](#10-hướng-dẫn-triển-khai-lên-vercel--supabase)
11. [Xử Lý Lỗi Thường Gặp (Troubleshooting / FAQ)](#11-xử-lý-lỗi-thường-gặp)

---

## 1. Yêu Cầu Môi Trường Cài Đặt

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

* **Node.js**: Phiên bản **v18.18+** hoặc **v20+ (Khuyên dùng v20 LTS)**  
  *Kiểm tra:* `node -v`
* **npm**: Phiên bản **v9+** hoặc **v10+** (đi kèm Node.js)  
  *Kiểm tra:* `npm -v`
* **Git**: Phiên bản bất kỳ  
  *Kiểm tra:* `git --version`
* *(Không bắt buộc)*: Trình soạn thảo mã nguồn **VS Code**, **Cursor** hoặc **Antigravity IDE**.

> 💡 *Dự án sử dụng cơ sở dữ liệu SQLite nhúng sẵn (`better-sqlite3`), do đó bạn **KHÔNG CẦN** cài đặt PostgreSQL, MySQL hay Docker phức tạp khi chạy ở môi trường máy cá nhân (Local).*

---

## Bước 1: Clone Mã Nguồn Từ Git

Mở Terminal (hoặc PowerShell / Command Prompt trên Windows) và gõ lệnh:

```bash
# Clone dự án về máy
git clone https://github.com/NamPham35k1/QrFood.git

# Di chuyển vào thư mục dự án
cd QrFood
```

---

## Bước 2: Cài Đặt Các Gói Thư Viện

Chạy lệnh sau để cài đặt toàn bộ dependencies (Next.js 16, React 19, Tailwind CSS v4, Lucide Icons, SQLite, Recharts, v.v.):

```bash
npm install
```

> ⚠️ **Lưu ý trên Windows:** Nếu gặp thông báo liên quan đến `node-gyp` hay `better-sqlite3`, hãy đảm bảo máy tính đã cài đặt Python và Visual Studio Build Tools (hoặc chạy lệnh `npm install --legacy-peer-deps`).

---

## Bước 3: Cấu Hình Biến Môi Trường

Dự án đã chuẩn bị sẵn file cấu hình mẫu `.env.example`. Bạn chỉ cần nhân bản thành file `.env`:

* **Trên Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
* **Trên Windows (CMD):**
  ```cmd
  copy .env.example .env
  ```
* **Trên macOS / Linux:**
  ```bash
  cp .env.example .env
  ```

Nội dung file `.env` mặc định phục vụ chạy trên máy của bạn:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=qrfood_super_secure_jwt_secret_production_2026_change_me
PAYMENT_WEBHOOK_SECRET=qrfood_webhook_signature_secret_production_2026_change_me
DEFAULT_BANK_BIN=970422
DEFAULT_BANK_ACCOUNT=0908123456888
DEFAULT_BANK_ACCOUNT_NAME=NHA HANG HUONG SEN
```

---

## Bước 4: Nạp Dữ Liệu Ban Đầu (Seed Data)

Chạy lệnh nạp dữ liệu mẫu để tạo cấu trúc nhà hàng, món ăn, bàn ăn và tài khoản nhân viên:

```bash
npm run seed
```

Khi chạy xong, hệ thống sẽ thông báo:
```text
🌱 Bắt đầu nạp Seed Data cho QRFood...
✅ Seed Data hoàn tất thành công!
- Nhà hàng: rest_huong_sen_01 (Ẩm Thực Hương Sen)
- Đã tạo: 18 món ăn, 10 bàn ăn, 5 tài khoản nhân viên, mã giảm giá WELCOME10
```
File dữ liệu sẽ được lưu tự động tại thư mục [data/qrfood.db](file:///d:/DoAn/QRFood/data/qrfood.db).

---

## Bước 5: Chạy Kiểm Thử Hệ Thống

Để kiểm tra chắc chắn mã nguồn hoạt động chính xác và không có lỗi logic nghiệp vụ:

```bash
npm run test
```

Hệ thống sẽ tự động chạy qua **8 bài kiểm thử nghiệp vụ then chốt**:
1. ✔ Tính giá món ăn & Topping chính xác phía Server
2. ✔ Tính thuế VAT (8%), chiết khấu mã giảm giá (Coupon) và tổng tiền
3. ✔ Chống gửi trùng đơn bằng Idempotency Key
4. ✔ Chặn gọi món khi món ăn đã hết hàng (Out of Stock)
5. ✔ Phân quyền RBAC nghiêm ngặt giữa 5 vai trò
6. ✔ Xác thực mã QR và bảo mật Phiên Bàn (Table Session Isolation)
7. ✔ Xử lý Webhook thanh toán lặp một cách Idempotent (Chống double-credit)
8. ✔ Luồng chuyển trạng thái đơn hàng (Order Lifecycle & Audit Trail)

---

## Bước 6: Khởi Động Ứng Dụng

### Lựa chọn A: Chế độ phát triển (Development Mode)
Khuyên dùng khi cần sửa code, tự động reload khi lưu file:
```bash
npm run dev
```

### Lựa chọn B: Chế độ Production (Tối ưu hóa tốc độ cao nhất)
```bash
npm run build
npm run start
```

Mở trình duyệt web và truy cập địa chỉ:
👉 **`http://localhost:3000`**

---

## 8. Tài Khoản & Đường Dẫn Trải Nghiệm Mẫu

### 🌐 Các Cổng Giao Diện Chính:
* **Cổng điều hướng tổng hợp (Landing Portal):** `http://localhost:3000`
* **Giao diện Khách quét QR gọi món (Bàn 01):**  
  `http://localhost:3000/menu/huong-sen?table=B01&token=demo_session_b01`
* **Màn hình Điều phối Bếp (KDS):** `http://localhost:3000/admin/kitchen`
* **Quản lý Đơn hàng & Kanban:** `http://localhost:3000/admin/orders`
* **Sơ đồ Bàn ăn & In mã QR:** `http://localhost:3000/admin/tables`
* **Trang Đăng Nhập Quản Trị:** `http://localhost:3000/admin/login`

---

### 🔑 Danh Sách Tài Khoản Đăng Nhập (5 Vai Trò RBAC):
Tại trang `/admin/login`, bạn có thể **click chuột vào nút chọn tài khoản mẫu** để tự động điền mà không cần gõ phím:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Owner (Chủ)** | `owner@huongsen.vn` | `Owner@123456` | Toàn quyền, xem biểu đồ doanh thu, cấu hình ngân hàng |
| **Manager (Quản lý)** | `manager@huongsen.vn` | `Manager@123456` | Quản lý đơn, sơ đồ bàn, duyệt menu, tạo mã giảm giá |
| **Cashier (Thu ngân)** | `cashier@huongsen.vn` | `Cashier@123456` | Xem đơn, thu tiền mặt, in hóa đơn tạm tính |
| **Kitchen (Bếp KDS)** | `kitchen@huongsen.vn` | `Kitchen@123456` | Màn hình bếp KDS cảm ứng, báo xong món, chuông reo |
| **Staff (Phục vụ)** | `staff@huongsen.vn` | `Staff@123456` | Xem bàn, hỗ trợ khách, tiếp nhận gọi phục vụ |

---

## 9. Hướng Dẫn Kết Nối Điện Thoại Thật (Test Quét QR Qua Wi-Fi)

Để lấy điện thoại thông minh thật quét mã QR trên bàn:

1. **Kết nối chung mạng Wi-Fi:** Đảm bảo điện thoại và máy tính đang cùng kết nối vào 1 cục Wi-Fi trong nhà.
2. **Tìm địa chỉ IP nội bộ của máy tính:**
   * Mở PowerShell / Command Prompt, gõ: `ipconfig`
   * Tìm dòng `IPv4 Address`, ví dụ: `192.168.1.53`
3. **Lấy mã QR chuẩn IP:**
   * Mở trình duyệt trên máy tính: `http://localhost:3000/admin/tables`
   * Bấm vào **Bàn 01** ➔ Chọn nút **"📱 Wi-Fi (192.168.1.53)"**
   * Hoặc điền vào ô địa chỉ: `http://192.168.1.53:3000`
4. **Quét mã bằng điện thoại:**
   * Mở Camera điện thoại hoặc Zalo quét mã QR trên màn hình máy tính.
   * Điện thoại sẽ mở ra thực đơn Bàn 01. Khi bấm **"Đặt món"**, màn hình Bếp trên máy tính sẽ reo chuông và hiển thị đơn hàng tức thì!

---

## 10. Hướng Dẫn Triển Khai Lên Vercel & Supabase

Khi muốn đưa dự án lên mạng Internet công khai 24/7 để bất kỳ mạng nào (4G, 5G) cũng quét được:

### Bước 1: Tạo Database trên Supabase
1. Đăng ký tài khoản miễn phí tại [supabase.com](https://supabase.com).
2. Tạo 1 Project mới.
3. Vào mục **SQL Editor**, mở file [src/lib/db/schema.sql](file:///d:/DoAn/QRFood/src/lib/db/schema.sql) trong dự án, copy toàn bộ nội dung dán vào và bấm **Run** để khởi tạo các bảng dữ liệu.
4. Bấm nút **Connect** (ở góc trên màn hình Supabase) ➔ chọn tab **URI** ➔ Copy chuỗi kết nối:
   `postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`

### Bước 2: Deploy lên Vercel
1. Đẩy mã nguồn lên tài khoản GitHub của bạn.
2. Đăng nhập [vercel.com](https://vercel.com), bấm **Add New Project** ➔ Import repository `QrFood`.
3. Mở mục **Environment Variables** và điền:
   * `DATABASE_URL`: *Chuỗi kết nối Supabase ở Bước 1*
   * `AUTH_SECRET`: `qrfood_super_secure_jwt_secret_production_2026`
   * `PAYMENT_WEBHOOK_SECRET`: `qrfood_webhook_signature_secret_production_2026`
4. Bấm **Deploy**. Sau 1 - 2 phút, bạn sẽ nhận được đường link web chính thức có đuôi `.vercel.app`.

---

## 11. Xử Lý Lỗi Thường Gặp (Troubleshooting / FAQ)

### Q1: Bị báo lỗi cổng 3000 đang được sử dụng (`Port 3000 is in use`)
* **Cách xử lý:** Chạy Next.js ở cổng khác bằng lệnh:
  ```bash
  npx next dev -p 3001
  ```
  Hoặc tắt tiến trình đang chiếm cổng 3000 trên Windows:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
  ```

### Q2: Điện thoại không tải được trang khi quét IP `192.168.x.x`
* **Nguyên nhân:** Tường lửa (Windows Defender Firewall) đang chặn cổng 3000 hoặc điện thoại đang bật 4G chứ chưa kết nối chung Wi-Fi.
* **Cách xử lý:** 
  1. Kiểm tra chắc chắn điện thoại và máy tính kết nối cùng tên mạng Wi-Fi.
  2. Tạm thời tắt Windows Firewall hoặc cho phép Node.js nhận kết nối mạng riêng (Private Network).

### Q3: Sau khi sửa đổi database, muốn đặt lại dữ liệu gốc như mới?
* **Cách xử lý:** Chỉ cần xóa file [data/qrfood.db](file:///d:/DoAn/QRFood/data/qrfood.db) và chạy lại lệnh:
  ```bash
  npm run seed
  ```

---

*Tài liệu được soạn thảo và kiểm thử tương thích 100% với phiên bản mới nhất của QRFood.*  
*Chúc bạn có trải nghiệm tuyệt vời với nền tảng gọi món nhà hàng thông minh QRFood! 🚀*
