'use client';

import { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  DollarSign,
  CheckCircle2,
  Printer,
  Loader2,
  RefreshCw,
  QrCode,
  Wallet,
  AlertCircle,
  X,
} from 'lucide-react';
import { Payment } from '@/lib/db/types';
import { formatVND, formatDateTime, getPaymentStatusBadge } from '@/lib/format';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Cash settlement modal
  const [isCashSettleOpen, setIsCashSettleOpen] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Print modal
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleConfirmCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderId.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: targetOrderId.trim(), method: 'CASH' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCashSettleOpen(false);
        setTargetOrderId('');
        fetchPayments();
      } else {
        alert(data.error || 'Lỗi xác nhận thu tiền');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        p.order_number?.toLowerCase().includes(q) ||
        p.table_code?.toLowerCase().includes(q) ||
        p.provider_transaction_id?.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPaidRevenue = payments
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Thu Ngân & Hóa Đơn</h1>
          <p className="text-xs text-slate-500 font-medium">
            Quản lý dòng tiền thanh toán VietQR, tiền mặt và xuất phiếu hóa đơn đối soát
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCashSettleOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <DollarSign className="w-4 h-4" />
            <span>Xác Nhận Tiền Mặt Tại Quầy</span>
          </button>

          <button
            onClick={fetchPayments}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Doanh Thu Đã Thu</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatVND(totalPaidRevenue)}</div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Đã đối soát vào sổ cái</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Giao Dịch</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{payments.length} lượt</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {payments.filter((p) => p.provider === 'VIETQR').length} chuyển khoản VietQR
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tỷ Lệ Chuyển Khoản</span>
          <div className="text-2xl font-black text-orange-600 mt-1">
            {payments.length > 0
              ? `${Math.round(
                  (payments.filter((p) => p.provider === 'VIETQR').length / payments.length) * 100
                )}%`
              : '0%'}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Thanh toán không tiền mặt</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo số hóa đơn, bàn, mã giao dịch VietQR..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
        />
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p className="text-xs font-semibold">Đang tải lịch sử giao dịch...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3 pl-1">Mã Giao Dịch</th>
                <th className="pb-3">Mã Đơn / Bàn</th>
                <th className="pb-3">Hình Thức</th>
                <th className="pb-3">Mã Tham Chiếu (TxId)</th>
                <th className="pb-3">Số Tiền</th>
                <th className="pb-3">Thời Gian</th>
                <th className="pb-3">Trạng Thái</th>
                <th className="pb-3 text-right pr-2">Hóa Đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => {
                const badge = getPaymentStatusBadge(p.status);

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 pl-1 font-mono font-bold text-slate-900">{p.id}</td>
                    <td className="py-3.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-900">{p.order_number || 'Đơn'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] border border-orange-100">
                          {p.table_code}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                        {p.provider}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-500 text-[11px]">
                      {p.provider_transaction_id || '-'}
                    </td>
                    <td className="py-3.5 font-black text-slate-900">{formatVND(p.amount)}</td>
                    <td className="py-3.5 text-slate-400">{formatDateTime(p.created_at)}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bgClass} ${badge.textClass}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Xem & in hóa đơn"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CASH SETTLE MODAL */}
      {isCashSettleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <button
              onClick={() => setIsCashSettleOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Xác Nhận Thu Tiền Mặt</h3>
                <p className="text-xs text-slate-400">Ghi nhận giao dịch thanh toán trực tiếp tại quầy thu ngân</p>
              </div>
            </div>

            <form onSubmit={handleConfirmCashPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã đơn hàng cần thu tiền (ID hoặc Order Number)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: ord_001 hoặc ORD-202610-001"
                  value={targetOrderId}
                  onChange={(e) => setTargetOrderId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                />
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-medium leading-relaxed">
                Khi xác nhận, đơn hàng sẽ được chuyển thành trạng thái ĐÃ THANH TOÁN (PAID) và ghi nhận vào nhật ký thu ngân.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-60 transition-colors"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Xác Nhận Đã Thu Đủ Tiền</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full no-print"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Content */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3 font-mono text-xs">
              <div>
                <h4 className="font-black text-sm uppercase">NHÀ HÀNG HƯƠNG SEN</h4>
                <p className="text-[10px] text-slate-500">128 Nguyễn Du, Q.1, TP. Hồ Chí Minh</p>
                <p className="text-[10px] text-slate-500">Hotline: 0908 123 456</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 text-left space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Hóa đơn:</span>
                  <span className="font-bold">{selectedReceipt.order_number || selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bàn:</span>
                  <span className="font-bold">{selectedReceipt.table_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phương thức:</span>
                  <span>{selectedReceipt.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian:</span>
                  <span>{formatDateTime(selectedReceipt.created_at)}</span>
                </div>
              </div>

              <div className="pt-1 flex justify-between items-center text-sm font-black">
                <span>TỔNG TIỀN:</span>
                <span className="text-orange-600">{formatVND(selectedReceipt.amount)}</span>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-2">Cảm ơn quý khách và hẹn gặp lại!</p>
            </div>

            <div className="flex gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Thu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
