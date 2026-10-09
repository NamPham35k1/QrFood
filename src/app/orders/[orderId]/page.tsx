'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bell,
  UtensilsCrossed,
  ArrowLeft,
  CreditCard,
  Receipt,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { Order, OrderStatus } from '@/lib/db/types';
import { formatVND, formatDateTime, getOrderStatusBadge, getPaymentStatusBadge } from '@/lib/format';
import { CallStaffModal } from '@/components/customer/CallStaffModal';

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCallStaffOpen, setIsCallStaffOpen] = useState(false);

  // Fetch Order
  const fetchOrder = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/public/orders/${resolvedParams.orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [resolvedParams.orderId]);

  // Realtime SSE Listener
  useEffect(() => {
    if (!order) return;

    const channels = [`restaurant:${order.restaurant_id}:orders`];
    const sse = new EventSource(`/api/realtime?channels=${encodeURIComponent(channels.join(','))}`);

    sse.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          (payload.type === 'order:updated' || payload.type === 'payment:confirmed') &&
          (payload.data?.id === order.id || payload.data?.orderId === order.id)
        ) {
          fetchOrder();
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    });

    return () => {
      sse.close();
    };
  }, [order?.restaurant_id, order?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-3" />
        <p className="text-sm font-bold text-slate-700">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-base font-bold text-slate-900 mb-1">Không Tìm Thấy Đơn Hàng</h2>
        <p className="text-xs text-slate-500 mb-6">Mã đơn #{resolvedParams.orderId} không tồn tại trên hệ thống.</p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          Quay lại
        </button>
      </div>
    );
  }

  // Visual Timeline Steps
  const statusSteps: { key: OrderStatus; label: string; desc: string }[] = [
    { key: 'PENDING', label: 'Đã nhận đơn', desc: 'Hệ thống đã chuyển đơn tới nhà bếp' },
    { key: 'CONFIRMED', label: 'Đã xác nhận', desc: 'Bếp đã tiếp nhận phiếu gọi món' },
    { key: 'PREPARING', label: 'Đang chế biến', desc: 'Các món đang được nấu trên bếp' },
    { key: 'READY', label: 'Sẵn sàng phục vụ', desc: 'Món ăn đã hoàn thành, chuẩn bị ra bàn' },
    { key: 'DELIVERED', label: 'Đang dùng món', desc: 'Chúc quý khách ngon miệng' },
    { key: 'COMPLETED', label: 'Hoàn tất', desc: 'Đơn hàng đã kết thúc' },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const statusBadge = getOrderStatusBadge(order.status);
  const paymentBadge = getPaymentStatusBadge(order.payment_status);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Gọi thêm món</span>
          </button>
          <div className="text-center">
            <h1 className="text-xs font-black text-slate-900 tracking-wider uppercase">Chi Tiết Đơn Hàng</h1>
            <p className="text-[11px] text-slate-500 font-mono">{order.order_number}</p>
          </div>
          <button
            onClick={() => fetchOrder(true)}
            className={`p-2 text-slate-500 hover:text-slate-800 rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {/* Status Hero Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 border ${statusBadge.bgClass} ${statusBadge.textClass} ${statusBadge.borderClass}">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {statusBadge.label}
          </div>

          <h2 className="text-xl font-black text-slate-900 mb-1">
            {order.status === 'READY'
              ? 'Món ăn đã sẵn sàng!'
              : order.status === 'PREPARING'
              ? 'Bếp đang nấu món ăn'
              : order.status === 'DELIVERED'
              ? 'Quý khách đang dùng bữa'
              : order.status === 'COMPLETED'
              ? 'Cảm ơn quý khách đã ghé thăm'
              : 'Đơn hàng đã được gửi đi'}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Bàn {order.table_code} • Đặt lúc {formatDateTime(order.created_at)}
          </p>

          {/* Timeline Visual Progress */}
          <div className="relative pl-6 space-y-6 text-left border-l-2 border-slate-100 ml-4 mb-2">
            {statusSteps.slice(0, 5).map((step, idx) => {
              const isPast = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step.key} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 transition-all ${
                      isPast
                        ? 'bg-orange-600 border-orange-600 text-white ring-4 ring-orange-100'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                  <div>
                    <h4
                      className={`text-xs font-bold leading-none ${
                        isCurrent ? 'text-orange-600 font-black' : isPast ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Action Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Trạng thái thanh toán</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${paymentBadge.bgClass} ${paymentBadge.textClass}`}>
                  {paymentBadge.label}
                </span>
              </div>
              <div className="text-base font-black text-orange-600 mt-0.5">
                {formatVND(order.total_amount)}
              </div>
            </div>
          </div>

          {order.payment_status !== 'PAID' ? (
            <button
              onClick={() => router.push(`/orders/${order.id}/payment`)}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            >
              Thanh toán ngay
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã hoàn tất</span>
            </div>
          )}
        </div>

        {/* Ordered Items List */}
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Danh Sách Món Đã Đặt</h3>
            <span className="text-xs text-slate-400 font-semibold">{order.items?.length || 0} món</span>
          </div>

          <div className="divide-y divide-slate-100">
            {order.items?.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    <span className="text-orange-600 mr-1.5 font-black">{item.quantity}x</span>
                    {item.product_name_snapshot}
                  </div>
                  {item.modifiers_snapshot && item.modifiers_snapshot.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.modifiers_snapshot.map((m, mIdx) => (
                        <span
                          key={mIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          +{m.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <p className="text-[10px] text-amber-700 italic mt-0.5">Ghi chú: {item.note}</p>
                  )}
                </div>
                <div className="font-bold text-slate-900 whitespace-nowrap">{formatVND(item.line_total)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span className="font-semibold text-slate-900">{formatVND(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Giảm giá</span>
                <span>-{formatVND(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>VAT (8%)</span>
              <span>+{formatVND(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Tổng thanh toán</span>
              <span className="text-orange-600">{formatVND(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => router.push(`/menu/huong-sen?table=${order.table_code}`)}
            className="py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <UtensilsCrossed className="w-4 h-4 text-orange-600" />
            <span>Gọi thêm món</span>
          </button>

          <button
            onClick={() => setIsCallStaffOpen(true)}
            className="py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200/50 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Bell className="w-4 h-4" />
            <span>Gọi nhân viên</span>
          </button>
        </div>
      </main>

      {/* Call Staff Modal */}
      {order && (
        <CallStaffModal
          isOpen={isCallStaffOpen}
          onClose={() => setIsCallStaffOpen(false)}
          sessionToken={`demo_session_${(order.table_code || 'b01').toLowerCase()}`}
          tableCode={order.table_code || 'Bàn'}
        />
      )}
    </div>
  );
}
