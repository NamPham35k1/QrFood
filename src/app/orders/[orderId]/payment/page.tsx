'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Wallet,
  Receipt,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Order, PaymentProvider } from '@/lib/db/types';
import { formatVND } from '@/lib/format';
import { VietQrData } from '@/lib/services/payment.service';

export default function OrderPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [qrData, setQrData] = useState<VietQrData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentProvider>('VIETQR');
  const [isLoading, setIsLoading] = useState(true);

  // Copy helpers
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  // Sandbox simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  // 1. Fetch Order & Initialize Payment Intent
  useEffect(() => {
    async function loadPayment() {
      setIsLoading(true);
      try {
        const orderRes = await fetch(`/api/public/orders/${resolvedParams.orderId}`);
        const orderData = await orderRes.json();

        if (orderData.success && orderData.order) {
          setOrder(orderData.order);
          if (orderData.order.payment_status === 'PAID') {
            setIsPaidSuccess(true);
            setIsLoading(false);
            return;
          }

          // Initiate VietQR
          const payRes = await fetch(`/api/public/orders/${resolvedParams.orderId}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'VIETQR' }),
          });
          const payData = await payRes.json();
          if (payData.success && payData.qrData) {
            setQrData(payData.qrData);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    loadPayment();
  }, [resolvedParams.orderId]);

  // 2. Realtime SSE: listen for payment confirmation
  useEffect(() => {
    if (!order) return;

    const channels = [`restaurant:${order.restaurant_id}:orders`];
    const sse = new EventSource(`/api/realtime?channels=${encodeURIComponent(channels.join(','))}`);

    sse.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'payment:confirmed' &&
          (payload.data?.orderId === order.id || payload.data?.orderNumber === order.order_number)
        ) {
          setIsPaidSuccess(true);
        }
      } catch (err) {
        console.error(err);
      }
    });

    return () => {
      sse.close();
    };
  }, [order?.restaurant_id, order?.id, order?.order_number]);

  const copyToClipboard = (text: string, type: 'account' | 'content') => {
    navigator.clipboard.writeText(text);
    if (type === 'account') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  // Sandbox simulation: calls backend webhook with HMAC signature
  const handleSimulatePaymentWebhook = async () => {
    if (!order) return;
    setIsSimulating(true);

    try {
      const txId = `SIM_SANDBOX_${Date.now()}`;
      const res = await fetch(`/api/webhooks/payments/${selectedMethod.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          transactionId: txId,
          amount: order.total_amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsPaidSuccess(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-3" />
        <p className="text-sm font-bold text-slate-700">Đang khởi tạo mã thanh toán...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <p className="text-sm font-bold text-slate-800">Không tìm thấy đơn hàng cần thanh toán.</p>
      </div>
    );
  }

  // Success View
  if (isPaidSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
              Giao dịch thành công
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">Thanh Toán Hoàn Tất!</h2>
            <p className="text-xs text-slate-500 mt-1">Hệ thống đã nhận được tiền và xác nhận đơn hàng.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã đơn hàng:</span>
              <span className="font-bold text-slate-900 font-mono">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bàn:</span>
              <span className="font-bold text-slate-900">{order.table_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền đã trả:</span>
              <span className="font-black text-orange-600 text-sm">{formatVND(order.total_amount)}</span>
            </div>
          </div>

          <button
            onClick={() => router.push(`/orders/${order.id}`)}
            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-lg transition-all"
          >
            Quay Lại Theo Dõi Đơn Hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-full flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <div className="text-center">
            <h1 className="text-xs font-black text-slate-900 uppercase tracking-wider">Thanh Toán Đơn Hàng</h1>
            <p className="text-[11px] text-slate-500 font-mono">{order.order_number}</p>
          </div>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Total Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl text-center">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Số tiền cần thanh toán</p>
          <div className="text-3xl font-black text-white mt-1 tracking-tight">{formatVND(order.total_amount)}</div>
          <p className="text-xs text-orange-400 font-medium mt-1">Bàn {order.table_code} • {order.items?.length || 0} món</p>
        </div>

        {/* Method Selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedMethod('VIETQR')}
            className={`p-3 rounded-2xl border text-center transition-all ${
              selectedMethod === 'VIETQR'
                ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <QrCode className="w-5 h-5 mx-auto text-orange-600 mb-1" />
            <div className="text-xs font-bold text-slate-900">VietQR</div>
            <div className="text-[10px] text-slate-400">Quét mã NH</div>
          </button>

          <button
            onClick={() => setSelectedMethod('MOMO')}
            className={`p-3 rounded-2xl border text-center transition-all ${
              selectedMethod === 'MOMO'
                ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <Wallet className="w-5 h-5 mx-auto text-pink-600 mb-1" />
            <div className="text-xs font-bold text-slate-900">MoMo</div>
            <div className="text-[10px] text-slate-400">Ví điện tử</div>
          </button>

          <button
            onClick={() => setSelectedMethod('CASH')}
            className={`p-3 rounded-2xl border text-center transition-all ${
              selectedMethod === 'CASH'
                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <Receipt className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
            <div className="text-xs font-bold text-slate-900">Tiền Mặt</div>
            <div className="text-[10px] text-slate-400">Tại quầy</div>
          </button>
        </div>

        {/* VietQR Dynamic Content */}
        {selectedMethod === 'VIETQR' && qrData && (
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-bold border border-orange-200">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                Mã QR Chuyển Khoản Tự Động 24/7
              </span>
            </div>

            {/* QR Image */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
              <img
                src={qrData.qrImageUrl}
                alt="VietQR Transfer"
                className="w-56 h-auto rounded-xl shadow-xs"
              />
            </div>

            {/* Bank Info with copy */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-400">Ngân hàng thụ hưởng</div>
                  <div className="font-bold text-slate-900">MBBank (Ngân Hàng Quân Đội)</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-400">Số tài khoản</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">{qrData.bankAccount}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(qrData.bankAccount, 'account')}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 active:scale-95"
                >
                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAccount ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-400">Tên chủ tài khoản</div>
                  <div className="font-bold text-slate-900">{qrData.accountName}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200/80">
                <div>
                  <div className="text-[10px] text-amber-700">Nội dung chuyển khoản (bắt buộc)</div>
                  <div className="font-mono font-bold text-amber-950 text-sm">{qrData.transferContent}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(qrData.transferContent, 'content')}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1 hover:bg-amber-100 active:scale-95"
                >
                  {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedContent ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MoMo View */}
        {selectedMethod === 'MOMO' && (
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Cổng Thanh Toán MoMo Sandbox</h3>
            <p className="text-xs text-slate-500">
              Đơn hàng sẽ được chuyển hướng an toàn tới ứng dụng MoMo để thanh toán {formatVND(order.total_amount)}.
            </p>
          </div>
        )}

        {/* Cash View */}
        {selectedMethod === 'CASH' && (
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Thanh Toán Tiền Mặt Tại Quầy</h3>
            <p className="text-xs text-slate-500">
              Quý khách vui lòng ra quầy thu ngân hoặc báo nhân viên phục vụ mang máy POS / tiền thối đến tận bàn {order.table_code}.
            </p>
          </div>
        )}

        {/* Sandbox Simulation Box (Requirements Section 5.7) */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Chế Độ Kiểm Thử Sandbox (Developer Simulator)</span>
          </div>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            Trong môi trường phát triển, bạn có thể nhấn nút dưới đây để kích hoạt Webhook máy chủ mô phỏng khách hàng đã chuyển khoản thành công.
          </p>
          <button
            onClick={handleSimulatePaymentWebhook}
            disabled={isSimulating}
            className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi Webhook xác thực...</span>
              </>
            ) : (
              <span>Mô Phỏng Chuyển Khoản Thành Công (Bắn Webhook)</span>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
