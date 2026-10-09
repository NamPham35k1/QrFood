'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatVND } from '@/lib/format';

interface ReportData {
  summary: {
    net_revenue: number;
    gross_subtotal: number;
    total_discounts: number;
    total_tax: number;
    total_orders: number;
    completed_orders: number;
    cancelled_orders: number;
  };
  itemSales: { item_name: string; total_qty: number; total_sales: number }[];
  timeline: { date: string; revenue: number; orders: number }[];
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [range, setRange] = useState<'today' | '7d' | '30d'>('7d');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?range=${range}`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [range]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Báo Cáo & Phân Tích Doanh Thu</h1>
          <p className="text-xs text-slate-500 font-medium">
            Phân biệt minh bạch giữa doanh thu gộp, mức giảm giá, thuế và tiền thực thu
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range Pills */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setRange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === 'today' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === '7d' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === '30d' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 ngày qua
            </button>
          </div>

          {/* Export CSV button */}
          <a
            href={`/api/admin/reports?range=${range}&format=csv`}
            download
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất File CSV</span>
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p className="text-xs font-semibold">Đang tổng hợp báo cáo tài chính...</p>
        </div>
      ) : (
        <>
          {/* Summary Financial Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiền Thực Thu (Net)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatVND(summary?.net_revenue || 0)}
              </div>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">Sau khi trừ giảm giá + thuế</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doanh Thu Gộp (Gross)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatVND(summary?.gross_subtotal || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tổng tiền món trước chiết khấu</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Giảm Giá Khuyến Mãi</span>
              <div className="text-2xl font-black text-orange-600 mt-1">
                -{formatVND(summary?.total_discounts || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Khách áp dụng Coupon</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số Đơn Hoàn Tất</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {summary?.completed_orders || 0} / {summary?.total_orders || 0}
              </div>
              <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                Đã hủy: {summary?.cancelled_orders || 0} đơn
              </p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Diễn Biến Doanh Thu Theo Dòng Thời Gian</h3>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.timeline || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val) || 0), 'Doanh thu']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#EA580C" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Item Sales Table */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Chi Tiết Doanh Số Từng Món Ăn</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-3 pl-1">Tên Món Ăn</th>
                    <th className="pb-3 text-right">Số Lượng Đã Bán</th>
                    <th className="pb-3 text-right pr-2">Tổng Doanh Số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.itemSales && data.itemSales.length > 0 ? (
                    data.itemSales.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-1 font-bold text-slate-900">{item.item_name}</td>
                        <td className="py-3 text-right font-semibold text-slate-700">{item.total_qty} phần</td>
                        <td className="py-3 text-right pr-2 font-black text-orange-600">
                          {formatVND(item.total_sales)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        Chưa có dữ liệu trong khoảng thời gian này
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
