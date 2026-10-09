'use client';

import { useState } from 'react';
import { Bell, X, Check, Droplets, Receipt, HelpCircle, Loader2 } from 'lucide-react';
import { RequestType } from '@/lib/db/types';

interface CallStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken: string;
  tableCode: string;
}

export function CallStaffModal({ isOpen, onClose, sessionToken, tableCode }: CallStaffModalProps) {
  const [selectedType, setSelectedType] = useState<RequestType>('WATER');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/public/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          type: selectedType,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Không thể gửi yêu cầu lúc này.');
      } else {
        setSuccessMessage('Đã gửi yêu cầu tới nhân viên phục vụ! Nhân viên sẽ đến hỗ trợ ngay.');
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 2200);
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const options: { type: RequestType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      type: 'WATER',
      label: 'Xin thêm đá / Nước',
      icon: <Droplets className="w-5 h-5 text-blue-600" />,
      desc: 'Mang thêm ca nước lọc hoặc đá lạnh',
    },
    {
      type: 'CALL_STAFF',
      label: 'Gọi nhân viên',
      icon: <Bell className="w-5 h-5 text-amber-600" />,
      desc: 'Cần hỗ trợ trực tiếp tại bàn',
    },
    {
      type: 'BILL',
      label: 'Yêu cầu thanh toán',
      icon: <Receipt className="w-5 h-5 text-emerald-600" />,
      desc: 'Báo nhân viên chuẩn bị hóa đơn / tiền mặt',
    },
    {
      type: 'ASSISTANCE',
      label: 'Hỗ trợ khác',
      icon: <HelpCircle className="w-5 h-5 text-purple-600" />,
      desc: 'Xin thêm bát đĩa, đũa thìa hoặc dọn bàn',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Gọi Nhân Viên Phục Vụ</h3>
            <p className="text-xs text-slate-500 font-medium">Bàn {tableCode}</p>
          </div>
        </div>

        {successMessage ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 animate-bounce">
              <Check className="w-7 h-7" />
            </div>
            <p className="text-slate-900 font-bold text-base">{successMessage}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2.5 mb-4">
              {options.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedType(opt.type)}
                  className={`flex items-start gap-3.5 p-3 rounded-2xl border text-left transition-all ${
                    selectedType === opt.type
                      ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-white shadow-sm border border-slate-100">{opt.icon}</div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{opt.label}</div>
                    <div className="text-xs text-slate-500">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú cụ thể (tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: Cho xin 2 ly đá, 1 đôi đũa..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <span>Gửi Yêu Cầu Hỗ Trợ</span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
