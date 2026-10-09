'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Grid,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { formatVND, getOrderStatusBadge } from '@/lib/format';
import { Order } from '@/lib/db/types';

interface DashboardData {
  stats: {
    todayRevenue: number;
    todayOrders: number;
    avgOrderValue: number;
    occupiedTables: number;
    totalTables: number;
    pendingOrders: number;
    preparingOrders: number;
  };
  recentOrders: Order[];
  topProducts: { name: string; quantity_sold: number; revenue: number }[];
  paymentMethods: { provider: string; count: number; total_amount: number }[];
  revenueChart: { day: string; revenue: number; orders: number }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
        <p className="text-xs font-semibold">Đang tổng hợp dữ liệu thời gian thực...</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Tổng Quan Hoạt Động</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Dữ liệu doanh thu và lưu lượng đơn hàng được tính toán trực tiếp từ máy chủ
          </p>
        </div>
        <button
          onClick={() => fetchDashboard(true)}
          disabled={isRefreshing}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doanh Thu Hôm Nay</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatVND(stats?.todayRevenue || 0)}
          </div>
          <span className="inline-block mt-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
            Đã thanh toán thực tế
          </span>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số Đơn Hôm Nay</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats?.todayOrders || 0} đơn</div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Trung bình: <b className="text-slate-800">{formatVND(stats?.avgOrderValue || 0)}</b> / đơn
          </div>
        </div>

        {/* Occupied Tables */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
            <Grid className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bàn Đang Hoạt Động</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {stats?.occupiedTables} / {stats?.totalTables} bàn
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all"
              style={{
                width: `${((stats?.occupiedTables || 0) / (stats?.totalTables || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Pending / Preparing Queue */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đơn Đang Xử Lý</span>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-lg sm:text-xl font-black text-amber-600">
              {stats?.pendingOrders} <span className="text-xs font-semibold text-slate-500">chờ duyệt</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="text-lg sm:text-xl font-black text-orange-600">
              {stats?.preparingOrders} <span className="text-xs font-semibold text-slate-500">đang nấu</span>
            </div>
          </div>
          <Link
            href="/admin/kitchen"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 mt-2"
          >
            Mở màn hình bếp (KDS) <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Biểu Đồ Doanh Thu 7 Ngày Gần Nhất</h3>
              <p className="text-xs text-slate-400">Doanh thu thực thu từ các đơn hàng hoàn tất</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold">VND</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueChart || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatVND(Number(val) || 0), 'Doanh thu']}
                  labelFormatter={(l) => `Ngày ${l}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#EA580C"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Products Sold */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Món Ăn Bán Chạy Nhất</h3>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>

          <div className="space-y-3">
            {data?.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-orange-600">{p.quantity_sold}</span>
                    <span className="text-[10px] text-slate-400 ml-1">phần</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">Chưa có dữ liệu bán hàng</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Đơn Hàng Gần Đây</h3>
            <p className="text-xs text-slate-400">Các đơn mới nhất nhận từ khách hàng tại bàn</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3 pl-1">Mã Đơn</th>
                <th className="pb-3">Bàn</th>
                <th className="pb-3">Món Ăn</th>
                <th className="pb-3">Tổng Tiền</th>
                <th className="pb-3">Trạng Thái</th>
                <th className="pb-3">Thanh Toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentOrders && data.recentOrders.length > 0 ? (
                data.recentOrders.map((o) => {
                  const badge = getOrderStatusBadge(o.status);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-1 font-mono font-bold text-slate-900">{o.order_number}</td>
                      <td className="py-3 font-bold text-slate-900">
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md border border-orange-100">
                          {o.table_code}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 max-w-xs truncate">
                        {o.items?.map((it) => `${it.quantity}x ${it.product_name_snapshot}`).join(', ')}
                      </td>
                      <td className="py-3 font-bold text-slate-900">{formatVND(o.total_amount)}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.payment_status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {o.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
