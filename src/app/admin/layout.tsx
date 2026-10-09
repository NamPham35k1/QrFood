'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  Grid,
  UtensilsCrossed,
  Receipt,
  TicketPercent,
  Users,
  BarChart3,
  ScrollText,
  LogOut,
  Volume2,
  VolumeX,
  Bell,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import { StaffRole } from '@/lib/db/types';

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  restaurantId: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<StaffUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [restaurantName, setRestaurantName] = useState<string>('Nhà Hàng Hương Sen');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Toast Notification
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'order' | 'request';
  } | null>(null);

  // Exclude login page from admin shell
  const isLoginPage = pathname === '/admin/login';

  // Check auth
  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/me');
        const data = await res.json();
        if (!res.ok || !data.success) {
          router.push('/admin/login');
        } else {
          setUser(data.user);
          setPermissions(data.permissions || []);
          if (data.restaurant) {
            setRestaurantName(data.restaurant.name);
          }
        }
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [isLoginPage, router]);

  // Realtime SSE Notifications
  useEffect(() => {
    if (!user) return;

    const channels = [`restaurant:${user.restaurantId}:all`, `restaurant:${user.restaurantId}:orders`];
    const sse = new EventSource(`/api/realtime?channels=${encodeURIComponent(channels.join(','))}`);

    sse.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'order:created' || payload.type === 'kitchen:new_ticket') {
          setToastNotification({
            id: String(Date.now()),
            title: 'Có Đơn Hàng Mới!',
            message: `Đơn ${payload.data?.orderNumber || 'mới'} vừa gửi từ Bàn ${payload.data?.table_code || 'bàn'}.`,
            type: 'order',
          });

          // Play subtle tone if sound enabled
          if (soundEnabled) {
            try {
              const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
              osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.4);
            } catch {
              // Ignore audio context block
            }
          }
        } else if (payload.type === 'service_request:new') {
          setToastNotification({
            id: String(Date.now()),
            title: 'Khách Yêu Cầu Phục Vụ!',
            message: `Bàn ${payload.data?.tableCode || ''}: ${payload.data?.note || 'gọi nhân viên'}`,
            type: 'request',
          });
        }
      } catch (e) {
        console.error('SSE layout error:', e);
      }
    });

    return () => {
      sse.close();
    };
  }, [user, soundEnabled]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastNotification) return;
    const t = setTimeout(() => setToastNotification(null), 5000);
    return () => clearTimeout(t);
  }, [toastNotification]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
        <p className="text-xs font-bold text-slate-400">Đang khởi tạo phiên làm việc...</p>
      </div>
    );
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Tổng Quan', icon: LayoutDashboard, perm: 'dashboard:view' },
    { href: '/admin/orders', label: 'Quản Lý Đơn Hàng', icon: ClipboardList, perm: 'orders:view' },
    { href: '/admin/kitchen', label: 'Màn Hình Bếp (KDS)', icon: ChefHat, perm: 'kitchen:view' },
    { href: '/admin/tables', label: 'Sơ Đồ Bàn & QR', icon: Grid, perm: 'tables:view' },
    { href: '/admin/menu', label: 'Thực Đơn & Món', icon: UtensilsCrossed, perm: 'menu:view' },
    { href: '/admin/payments', label: 'Thu Ngân & Hóa Đơn', icon: Receipt, perm: 'payments:view' },
    { href: '/admin/promotions', label: 'Khuyến Mãi & Coupon', icon: TicketPercent, perm: 'coupons:view' },
    { href: '/admin/staff', label: 'Nhân Viên & Phân Quyền', icon: Users, perm: 'staff:view' },
    { href: '/admin/reports', label: 'Báo Cáo Doanh Thu', icon: BarChart3, perm: 'reports:view' },
    { href: '/admin/audit-logs', label: 'Nhật Ký Thao Tác', icon: ScrollText, perm: 'audit:view' },
  ];

  const allowedNavItems = navItems.filter((item) => permissions.includes(item.perm));

  return (
    <div className="min-h-screen bg-slate-100/70 flex text-slate-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col shrink-0 border-r border-slate-800">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/30">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h2 className="text-sm font-black text-white truncate leading-snug">{restaurantName}</h2>
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Hệ Thống QRFood</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-xs font-bold text-white truncate">{user?.fullName}</div>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-950/60 text-orange-400 border border-orange-500/20">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-72 max-w-[80vw] h-full bg-slate-900 text-white flex flex-col p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold text-white truncate">{restaurantName}</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {allowedNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold ${
                      isActive ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-slate-800 text-rose-400 text-xs font-bold flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 lg:hidden rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {allowedNavItems.find((i) => i.href === pathname)?.label || 'Cổng Quản Trị'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Chi nhánh: {restaurantName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                soundEnabled ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-slate-100 text-slate-400'
              }`}
              title={soundEnabled ? 'Âm thanh thông báo đang BẬT' : 'Âm thanh thông báo đang TẮT'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline text-[11px]">{soundEnabled ? 'Chuông Bật' : 'Chuông Tắt'}</span>
            </button>

            {/* Role pill for mobile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
              <div className="text-right hidden sm:block">
                <div className="font-bold text-slate-900 leading-none">{user?.fullName}</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">{user?.role}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                {user?.fullName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Realtime Toast Banner */}
        {toastNotification && (
          <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-orange-500/30 flex items-start gap-3 animate-fade-in">
            <div className="p-2 rounded-xl bg-orange-600 text-white">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1 text-xs">
              <h4 className="font-black text-orange-400">{toastNotification.title}</h4>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{toastNotification.message}</p>
            </div>
            <button onClick={() => setToastNotification(null)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
