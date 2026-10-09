'use client';

import { useEffect, useState } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  Loader2,
  Check,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { Order, OrderItem, OrderItemStatus } from '@/lib/db/types';
import { formatTimeOnly } from '@/lib/format';

interface KitchenTicket extends Order {
  waiting_minutes: number;
}

export default function KitchenDisplaySystemPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchTickets = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/kitchen/tickets');
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Realtime SSE Listener for Kitchen
  useEffect(() => {
    const sse = new EventSource('/api/realtime?channels=restaurant:rest_huong_sen_01:kitchen');

    sse.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'kitchen:new_ticket' ||
          payload.type === 'kitchen:item_updated' ||
          payload.type === 'order:updated'
        ) {
          fetchTickets();
          if (soundEnabled && payload.type === 'kitchen:new_ticket') {
            try {
              const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
              osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
              gain.gain.setValueAtTime(0.2, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.5);
            } catch {
              // Ignore
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Auto-polling fallback every 3s to guarantee kitchen ticket sync on serverless
    const interval = setInterval(() => {
      fetchTickets();
    }, 3000);

    return () => {
      sse.close();
      clearInterval(interval);
    };
  }, [soundEnabled]);

  // Order status transition
  const handleTransitionTicket = async (orderId: string, nextStatus: 'PREPARING' | 'READY' | 'DELIVERED') => {
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchTickets();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle individual item status
  const handleToggleItemStatus = async (orderId: string, itemId: string, currentStatus: OrderItemStatus) => {
    const nextItemStatus: OrderItemStatus = currentStatus === 'READY' ? 'PENDING' : 'READY';
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemStatus: nextItemStatus }),
      });
      fetchTickets();
    } catch (e) {
      console.error(e);
    }
  };

  const newTickets = tickets.filter((t) => t.status === 'PENDING' || t.status === 'CONFIRMED');
  const preparingTickets = tickets.filter((t) => t.status === 'PREPARING');
  const readyTickets = tickets.filter((t) => t.status === 'READY');

  return (
    <div className="space-y-4">
      {/* KDS Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-3xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>Màn Hình Điều Phối Bếp (KDS)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </h1>
            <p className="text-xs text-slate-400">
              Tổng cộng {tickets.length} vé gọi món đang xử lý • Cập nhật tự động thời gian thực
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              soundEnabled ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chuông Báo BẬT' : 'Chuông TẮT'}</span>
          </button>

          <button
            onClick={() => fetchTickets(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
            title="Làm mới vé bếp"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-3" />
          <p className="text-xs font-bold">Đang kết nối hệ thống vé bếp KDS...</p>
        </div>
      ) : (
        /* KDS Columns Grid (Touchscreen/Tablet friendly) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Column 1: NEW TICKETS */}
          <div className="bg-slate-100 rounded-3xl p-3.5 border-2 border-amber-300/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 font-black text-amber-900 text-xs px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                ĐƠN MỚI CHỜ NẤU
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                {newTickets.length}
              </span>
            </div>

            <div className="space-y-3 pt-3 flex-1 overflow-y-auto max-h-[75vh]">
              {newTickets.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs italic">Không có đơn mới</div>
              ) : (
                newTickets.map((ticket) => renderTicketCard(ticket, 'NEW', handleTransitionTicket, handleToggleItemStatus))
              )}
            </div>
          </div>

          {/* Column 2: PREPARING TICKETS */}
          <div className="bg-slate-100 rounded-3xl p-3.5 border-2 border-orange-400/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-orange-200 font-black text-orange-950 text-xs px-1">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-600 animate-bounce" />
                ĐANG CHẾ BIẾN TRÊN BẾP
              </span>
              <span className="px-2 py-0.5 rounded-full bg-orange-200 text-orange-950 text-xs font-black">
                {preparingTickets.length}
              </span>
            </div>

            <div className="space-y-3 pt-3 flex-1 overflow-y-auto max-h-[75vh]">
              {preparingTickets.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs italic">Bếp đang trống</div>
              ) : (
                preparingTickets.map((ticket) =>
                  renderTicketCard(ticket, 'PREPARING', handleTransitionTicket, handleToggleItemStatus)
                )
              )}
            </div>
          </div>

          {/* Column 3: READY TICKETS */}
          <div className="bg-slate-100 rounded-3xl p-3.5 border-2 border-emerald-400/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200 font-black text-emerald-950 text-xs px-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                MÓN ĐÃ XONG (SẴN SÀNG RA BÀN)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 text-xs font-black">
                {readyTickets.length}
              </span>
            </div>

            <div className="space-y-3 pt-3 flex-1 overflow-y-auto max-h-[75vh]">
              {readyTickets.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs italic">Chưa có món chờ ra bàn</div>
              ) : (
                readyTickets.map((ticket) =>
                  renderTicketCard(ticket, 'READY', handleTransitionTicket, handleToggleItemStatus)
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderTicketCard(
  ticket: KitchenTicket,
  stage: 'NEW' | 'PREPARING' | 'READY',
  onTransition: (orderId: string, nextStatus: 'PREPARING' | 'READY' | 'DELIVERED') => void,
  onToggleItem: (orderId: string, itemId: string, curStatus: OrderItemStatus) => void
) {
  const waitMins = ticket.waiting_minutes || 0;
  const isUrgent = waitMins >= 20;
  const isWarning = waitMins >= 12;

  return (
    <div
      key={ticket.id}
      className={`bg-white rounded-2xl p-4 shadow-sm border transition-all space-y-3 ${
        isUrgent
          ? 'border-rose-400 ring-2 ring-rose-300'
          : isWarning
          ? 'border-amber-400'
          : 'border-slate-200'
      }`}
    >
      {/* Ticket Top: Table & Elapsed Time */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-base">
              {ticket.table_code}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-500">{ticket.order_number}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatTimeOnly(ticket.created_at)}</p>
        </div>

        {/* Wait timer badge */}
        <div
          className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
            isUrgent
              ? 'bg-rose-100 text-rose-800 animate-pulse'
              : isWarning
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{waitMins}p</span>
        </div>
      </div>

      {/* Items list with checkbox */}
      <div className="space-y-2 py-1">
        {ticket.items?.map((it) => {
          const isItemDone = it.status === 'READY' || it.status === 'SERVED';

          return (
            <div
              key={it.id}
              onClick={() => onToggleItem(ticket.id, it.id, it.status)}
              className={`p-2 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                isItemDone
                  ? 'bg-slate-50/70 border-slate-200 text-slate-400 line-through'
                  : 'bg-white border-slate-200/90 text-slate-900 hover:border-orange-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                  isItemDone
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isItemDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>

              <div className="flex-1 text-xs">
                <div className="font-bold flex items-center gap-1">
                  <span className="text-orange-600 font-black text-sm">{it.quantity}x</span>
                  <span>{it.product_name_snapshot}</span>
                </div>
                {it.modifiers_snapshot && it.modifiers_snapshot.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {it.modifiers_snapshot.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold"
                      >
                        +{m.name}
                      </span>
                    ))}
                  </div>
                )}
                {it.note && (
                  <p className="text-[11px] text-amber-900 font-bold bg-amber-100/70 px-2 py-0.5 rounded-md mt-1 inline-block">
                    👉 Bếp lưu ý: {it.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ticket.note && (
        <p className="text-xs text-amber-950 font-bold bg-amber-50 p-2 rounded-xl border border-amber-200">
          Ghi chú bàn: {ticket.note}
        </p>
      )}

      {/* Ticket Stage Action Button */}
      <div className="pt-1">
        {stage === 'NEW' && (
          <button
            onClick={() => onTransition(ticket.id, 'PREPARING')}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span>Nhận Nấu Đơn Này</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {stage === 'PREPARING' && (
          <button
            onClick={() => onTransition(ticket.id, 'READY')}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Xong Toàn Bộ Vé (Báo Phục Vụ)</span>
          </button>
        )}

        {stage === 'READY' && (
          <button
            onClick={() => onTransition(ticket.id, 'DELIVERED')}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span>Đã Mang Ra Bàn {ticket.table_code}</span>
          </button>
        )}
      </div>
    </div>
  );
}
