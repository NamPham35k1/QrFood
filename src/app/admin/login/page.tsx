'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  UtensilsCrossed,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { StaffRole } from '@/lib/db/types';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@huongsen.vn');
  const [password, setPassword] = useState('Owner@123456');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const demoAccounts: { role: StaffRole; label: string; email: string; pass: string; badge: string }[] = [
    { role: 'OWNER', label: 'Chủ Nhà Hàng (Owner)', email: 'owner@huongsen.vn', pass: 'Owner@123456', badge: 'bg-purple-100 text-purple-800' },
    { role: 'MANAGER', label: 'Quản Lý (Manager)', email: 'manager@huongsen.vn', pass: 'Manager@123456', badge: 'bg-blue-100 text-blue-800' },
    { role: 'CASHIER', label: 'Thu Ngân (Cashier)', email: 'cashier@huongsen.vn', pass: 'Cashier@123456', badge: 'bg-emerald-100 text-emerald-800' },
    { role: 'KITCHEN', label: 'Bếp Trưởng (Kitchen KDS)', email: 'kitchen@huongsen.vn', pass: 'Kitchen@123456', badge: 'bg-orange-100 text-orange-800' },
    { role: 'STAFF', label: 'Phục Vụ (Staff)', email: 'staff@huongsen.vn', pass: 'Staff@123456', badge: 'bg-slate-100 text-slate-800' },
  ];

  const handleSelectDemo = (acc: (typeof demoAccounts)[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Email hoặc mật khẩu không chính xác.');
      } else {
        // Route according to role
        if (data.user.role === 'KITCHEN') {
          router.push('/admin/kitchen');
        } else {
          router.push('/admin/dashboard');
        }
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-orange-500 selection:text-white">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-orange-950/30 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-orange-600/20">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">QRFood Management</h1>
          <p className="text-xs text-slate-400">Cổng Quản Trị & Vận Hành Nhà Hàng Hương Sen</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Tài khoản Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@huongsen.vn"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 text-xs sm:text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực bảo mật...</span>
                </>
              ) : (
                <>
                  <span>Đăng Nhập Quản Trị</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-3">
              <UserCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Tài Khoản Thử Nghiệm Nhanh (Click để chọn)</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  className={`px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between border transition-all ${
                    email === acc.email
                      ? 'bg-slate-800 border-orange-500 text-white font-bold'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="truncate">{acc.label}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${acc.badge}`}>
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="text-center text-slate-500 text-[11px] flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Phiên đăng nhập được mã hóa HMAC SHA-256 an toàn</span>
        </div>
      </div>
    </div>
  );
}
