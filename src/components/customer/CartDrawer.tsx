'use client';

import { useState } from 'react';
import { X, Trash2, Plus, Minus, Tag, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { CartItemOption } from './ProductDetailModal';
import { formatVND } from '@/lib/format';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItemOption[];
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  restaurantId: string;
  tableSessionToken: string;
  tableCode: string;
  onOrderSuccess: (orderId: string) => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  restaurantId,
  tableSessionToken,
  tableCode,
  onOrderSuccess,
}: CartDrawerProps) {
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * 0.08); // 8% VAT
  const totalAmount = Math.round(taxableAmount + taxAmount);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/public/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          code: couponInput.trim(),
          subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCouponError(data.error || 'Mã giảm giá không hợp lệ.');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.coupon.discountAmount,
        });
        setCouponInput('');
      }
    } catch {
      setCouponError('Không thể kiểm tra mã lúc này.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleSendOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      const payloadItems = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        modifierIds: item.selectedModifiers.map((m) => m.id),
        note: item.note || undefined,
      }));

      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tableSessionToken,
          items: payloadItems,
          note: orderNote.trim() || undefined,
          couponCode: appliedCoupon?.code,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'Gửi đơn hàng thất bại. Vui lòng thử lại.');
      } else {
        onOrderSuccess(data.order.id);
      }
    } catch {
      setSubmitError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Giỏ Hàng Tại Bàn {tableCode}</h3>
            <p className="text-xs text-slate-500 font-medium">{cart.length} món đã chọn</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <p className="text-sm">Giỏ hàng của bạn đang trống</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-xs font-bold text-orange-600 bg-orange-50 rounded-xl"
              >
                Quay lại thực đơn
              </button>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.product.name}</h4>
                    {item.selectedModifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedModifiers.map((m) => (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 text-slate-600 rounded-md font-medium"
                          >
                            +{m.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.note && (
                      <p className="text-[11px] text-amber-700 italic mt-1 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                        Ghi chú: {item.note}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <div className="text-xs font-bold text-orange-600">{formatVND(item.lineTotal)}</div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {cart.length > 0 && (
            <>
              {/* Coupon input */}
              <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-slate-900">Mã giảm giá (Coupon)</span>
                </div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold text-slate-800">{appliedCoupon.code}</span>
                      <span className="text-xs text-emerald-600 font-bold">-{formatVND(appliedCoupon.discountAmount)}</span>
                    </div>
                    <button
                      onClick={() => setAppliedCoupon(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                    >
                      Xóa
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nhập WELCOME10..."
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponInput.trim()}
                      className="px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {isValidatingCoupon ? 'Kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[11px] text-rose-600 mt-1.5 font-medium">{couponError}</p>}
              </div>

              {/* General Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú chung cho đơn hàng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn tại bàn, ra món nhanh giúp bàn em..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer calculation & Submit */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-white space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span className="font-semibold text-slate-900">{formatVND(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Giảm giá khuyến mãi</span>
                  <span>-{formatVND(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Thuế GTGT (VAT 8%)</span>
                <span>+{formatVND(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Tổng thanh toán</span>
                <span className="text-base font-black text-orange-600">{formatVND(totalAmount)}</span>
              </div>
            </div>

            {submitError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSendOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang gửi đơn đến nhà bếp...</span>
                </>
              ) : (
                <>
                  <span>Xác Nhận Gọi Món</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
