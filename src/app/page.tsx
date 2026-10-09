import Link from 'next/link';
import {
  QrCode,
  ChefHat,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  ArrowRight,
  UtensilsCrossed,
  Receipt,
  Users,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-orange-600/20 via-amber-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-base text-white tracking-tight">QRFood Platform</span>
              <span className="block text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                Hệ Thống Nhà Hàng Thông Minh
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Cổng Quản Trị
            </Link>
            <Link
              href="/menu/huong-sen?table=B01&token=sec_b01_hs_8821"
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Quét QR Bàn 01</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Nền tảng Gọi Món & Thanh Toán Tại Bàn 4.0</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Hiện Đại Hóa Nhà Hàng Với <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">QR Code Thông Minh</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Khách hàng quét mã xem thực đơn, tùy biến món và thanh toán VietQR ngay tại bàn. Đồng bộ tức thời
            (Realtime) tới màn hình bếp KDS và hệ thống quản trị trung tâm.
          </p>
        </div>

        {/* Portal Entry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Customer View */}
          <div className="group relative bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 hover:border-orange-500/50 shadow-2xl transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">1. Khách Hàng Gọi Món (Customer App)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mô phỏng trải nghiệm khách quét mã QR tại bàn Bàn 01. Xem thực đơn Hương Sen, chọn topping, tùy biến gia vị, áp mã giảm giá và gửi đơn.
              </p>
            </div>

            <div className="mt-8 space-y-2">
              <Link
                href="/menu/huong-sen?table=B01&token=sec_b01_hs_8821"
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all"
              >
                <span>Mở Menu Bàn 01 (Demo)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/menu/huong-sen?table=B02&token=sec_b02_hs_9934"
                className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <span>Mở Menu Bàn 02</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Kitchen KDS View */}
          <div className="group relative bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 hover:border-amber-500/50 shadow-2xl transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">2. Màn Hình Điều Phối Bếp (KDS)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Màn hình cảm ứng chuyên biệt cho đầu bếp: nhận vé theo thời gian thực (SSE), cảnh báo món chờ lâu, đánh dấu từng món xong và chuông âm thanh.
              </p>
            </div>

            <div className="mt-8">
              <Link
                href="/admin/kitchen"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
              >
                <span>Mở Màn Hình Bếp</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Admin Dashboard */}
          <div className="group relative bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 hover:border-blue-500/50 shadow-2xl transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">3. Cổng Quản Trị (Admin Portal)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Quản lý doanh thu biểu đồ Recharts, Kanban đơn hàng, sơ đồ bàn và in tem QR, quản lý menu món ăn, phân quyền 5 vai trò (RBAC) và kiểm toán.
              </p>
            </div>

            <div className="mt-8">
              <Link
                href="/admin/login"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                <span>Đăng Nhập Quản Trị</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="pt-10 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Realtime Hai Chiều</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Khách gửi đơn là màn hình quản lý và bếp nhận ngay lập tức qua Server-Sent Events (SSE).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Trust Payment</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              VietQR động tự động điền số tiền và mã đơn. Xác thực thanh toán bằng webhook có chữ ký số.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Phân Quyền RBAC</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              5 vai trò: Owner, Manager, Cashier, Kitchen, Staff. Kiểm tra bảo mật chặt chẽ phía server.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Receipt className="w-4 h-4" />
              <span>Phiên Bàn & In Ấn</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mỗi bàn có mã bí mật và phiên bàn cách ly. Xuất mã QR in tem dán bàn hàng loạt chuẩn in ấn.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
