'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Columns,
  List,
  CheckCircle2,
  Clock,
  Printer,
  XCircle,
  ChefHat,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Order, OrderStatus } from '@/lib/db/types';
import { formatVND, formatDateTime, getOrderStatusBadge, getPaymentStatusBadge } from '@/lib/format';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Realtime SSE Listener for Orders
  useEffect(() => {
    const sse = new EventSource('/api/realtime?channels=restaurant:rest_huong_sen_01:orders');

    sse.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'order:created' || payload.type === 'order:updated' || payload.type === 'payment:confirmed') {
          fetchOrders();
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Auto-polling fallback every 3s to guarantee cross-device sync on serverless
    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => {
      sse.close();
      clearInterval(interval);
    };
  }, []);

  // Status transitions
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(null);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.table_code?.toLowerCase().includes(q) ||
        o.items?.some((it) => it.product_name_snapshot.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const kanbanColumns: { status: OrderStatus; label: string; bgHeader: string }[] = [
    { status: 'PENDING', label: 'Chờ Xác Nhận', bgHeader: 'border-amber-400 text-amber-700' },
    { status: 'PREPARING', label: 'Đang Nấu (Bếp)', bgHeader: 'border-orange-500 text-orange-700' },
    { status: 'READY', label: 'Sẵn Sàng Ra Món', bgHeader: 'border-emerald-500 text-emerald-700' },
    { status: 'DELIVERED', label: 'Đang Phục Vụ', bgHeader: 'border-teal-500 text-teal-700' },
    { status: 'COMPLETED', label: 'Hoàn Tất', bgHeader: 'border-slate-400 text-slate-700' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Quản Lý Đơn Hàng</h1>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi dòng đơn thời gian thực, điều phối bếp và cập nhật trạng thái
          </p>
        </div>

        {/* View mode toggle & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'kanban' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="hidden md:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Danh sách</span>
            </button>
          </div>

          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số đơn #ORD, mã bàn B01, tên món..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['ALL', 'PENDING', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {st === 'ALL' ? 'Tất cả đơn' : getOrderStatusBadge(st).label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p className="text-xs font-semibold">Đang đồng bộ danh sách đơn hàng...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.status);

            return (
              <div key={col.status} className="bg-slate-200/50 rounded-3xl p-3 border border-slate-200 flex flex-col min-h-[420px]">
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-3 px-1 border-b-2 font-bold text-xs ${col.bgHeader}`}>
                  <span>{col.label}</span>
                  <span className="w-5 h-5 rounded-full bg-white text-slate-700 font-bold flex items-center justify-center text-[11px] shadow-xs">
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-3 pt-3 overflow-y-auto max-h-[70vh]">
                  {colOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs italic">Không có đơn</div>
                  ) : (
                    colOrders.map((order) => {
                      const isUpdatingThis = isUpdating === order.id;
                      const payBadge = getPaymentStatusBadge(order.payment_status);

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
                        >
                          {/* Card Top */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-black text-xs border border-orange-200">
                                {order.table_code}
                              </span>
                              <div className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                                {order.order_number}
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${payBadge.bgClass} ${payBadge.textClass}`}>
                              {payBadge.label}
                            </span>
                          </div>

                          {/* Items summary */}
                          <div className="space-y-1.5 py-1 border-y border-slate-100 text-xs">
                            {order.items?.map((it) => (
                              <div key={it.id} className="flex justify-between items-start gap-2">
                                <span className="font-semibold text-slate-800">
                                  <b className="text-orange-600 mr-1">{it.quantity}x</b>
                                  {it.product_name_snapshot}
                                </span>
                                <span className="text-slate-400 font-medium shrink-0">{formatVND(it.line_total)}</span>
                              </div>
                            ))}
                          </div>

                          {order.note && (
                            <p className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                              Ghi chú: {order.note}
                            </p>
                          )}

                          {/* Card Footer: Total & Actions */}
                          <div className="pt-1 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400">Tổng cộng:</span>
                              <div className="font-black text-slate-900">{formatVND(order.total_amount)}</div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              {order.status === 'PENDING' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                                  disabled={isUpdatingThis}
                                  className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-[11px] transition-colors"
                                >
                                  Chuyển bếp
                                </button>
                              )}

                              {order.status === 'PREPARING' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'READY')}
                                  disabled={isUpdatingThis}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition-colors"
                                >
                                  Báo xong
                                </button>
                              )}

                              {order.status === 'READY' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                                  disabled={isUpdatingThis}
                                  className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-[11px] transition-colors"
                                >
                                  Ra bàn
                                </button>
                              )}

                              {order.status === 'DELIVERED' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                                  disabled={isUpdatingThis}
                                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-[11px] transition-colors"
                                >
                                  Hoàn tất
                                </button>
                              )}

                              {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => {
                                    const reason = prompt('Lý do hủy đơn hàng:');
                                    if (reason) handleUpdateStatus(order.id, 'CANCELLED', reason);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                  title="Hủy đơn"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3 pl-1">Mã Đơn</th>
                <th className="pb-3">Bàn</th>
                <th className="pb-3">Món Ăn</th>
                <th className="pb-3">Thời Gian</th>
                <th className="pb-3">Tổng Tiền</th>
                <th className="pb-3">Trạng Thái</th>
                <th className="pb-3">Thanh Toán</th>
                <th className="pb-3 text-right pr-2">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((o) => {
                const statusBadge = getOrderStatusBadge(o.status);
                const payBadge = getPaymentStatusBadge(o.payment_status);

                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 pl-1 font-mono font-bold text-slate-900">{o.order_number}</td>
                    <td className="py-3.5 font-bold">
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">
                        {o.table_code}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-700 max-w-xs">
                      {o.items?.map((it) => `${it.quantity}x ${it.product_name_snapshot}`).join(', ')}
                    </td>
                    <td className="py-3.5 text-slate-400">{formatDateTime(o.created_at)}</td>
                    <td className="py-3.5 font-bold text-slate-900">{formatVND(o.total_amount)}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bgClass} ${statusBadge.textClass} ${statusBadge.borderClass}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${payBadge.bgClass} ${payBadge.textClass}`}>
                        {payBadge.label}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2 space-x-1">
                      {o.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'PREPARING')}
                          className="px-2 py-1 bg-orange-600 text-white rounded-lg font-bold text-[11px]"
                        >
                          Chuyển bếp
                        </button>
                      )}
                      {o.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'READY')}
                          className="px-2 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px]"
                        >
                          Báo xong
                        </button>
                      )}
                      {o.status === 'READY' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'DELIVERED')}
                          className="px-2 py-1 bg-teal-600 text-white rounded-lg font-bold text-[11px]"
                        >
                          Ra bàn
                        </button>
                      )}
                      {o.status === 'DELIVERED' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'COMPLETED')}
                          className="px-2 py-1 bg-slate-900 text-white rounded-lg font-bold text-[11px]"
                        >
                          Hoàn tất
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
