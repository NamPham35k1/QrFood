export function formatVND(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  return `${amount.toLocaleString('vi-VN')} ₫`;
}

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatTimeOnly(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function getOrderStatusBadge(status: string): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Chờ xác nhận',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
      };
    case 'CONFIRMED':
      return {
        label: 'Đã xác nhận',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
      };
    case 'PREPARING':
      return {
        label: 'Đang nấu',
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-700',
        borderClass: 'border-orange-200',
      };
    case 'READY':
      return {
        label: 'Sẵn sàng phục vụ',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-200',
      };
    case 'DELIVERED':
      return {
        label: 'Đang dùng món',
        bgClass: 'bg-teal-50',
        textClass: 'text-teal-700',
        borderClass: 'border-teal-200',
      };
    case 'COMPLETED':
      return {
        label: 'Hoàn tất',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700',
        borderClass: 'border-gray-200',
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
      };
    default:
      return {
        label: status,
        bgClass: 'bg-gray-50',
        textClass: 'text-gray-600',
        borderClass: 'border-gray-200',
      };
  }
}

export function getPaymentStatusBadge(status: string): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case 'PAID':
      return { label: 'Đã thanh toán', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800' };
    case 'PENDING_VERIFICATION':
      return { label: 'Đang xác minh', bgClass: 'bg-amber-100', textClass: 'text-amber-800' };
    case 'UNPAID':
      return { label: 'Chưa thanh toán', bgClass: 'bg-red-50', textClass: 'text-red-700' };
    case 'REFUNDED':
      return { label: 'Đã hoàn tiền', bgClass: 'bg-purple-100', textClass: 'text-purple-800' };
    case 'FAILED':
      return { label: 'Thất bại', bgClass: 'bg-rose-100', textClass: 'text-rose-800' };
    default:
      return { label: status, bgClass: 'bg-gray-100', textClass: 'text-gray-700' };
  }
}
