'use client';

import { useEffect, useState } from 'react';
import { ScrollText, ShieldCheck, User, Clock, Loader2 } from 'lucide-react';
import { AuditLog } from '@/lib/db/types';
import { formatDateTime } from '@/lib/format';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Nhật Ký Thao Tác (Audit Logs)</h1>
        <p className="text-xs text-slate-500 font-medium">
          Ghi nhận toàn bộ thao tác quan trọng: xác nhận thanh toán, hoàn tất đơn, hủy đơn và điều chỉnh nghiệp vụ
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p className="text-xs font-semibold">Đang tải nhật ký kiểm toán...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-3 pl-1">Thời Gian</th>
                <th className="pb-3">Hành Động</th>
                <th className="pb-3">Người Thực Hiện</th>
                <th className="pb-3">Đối Tượng (Entity)</th>
                <th className="pb-3">Chi Tiết Sự Kiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 pl-1 text-slate-400">{formatDateTime(log.created_at)}</td>
                  <td className="py-3.5 font-bold text-orange-600 font-sans">{log.action}</td>
                  <td className="py-3.5 font-sans font-bold text-slate-900">
                    {log.user_name || 'Hệ thống tự động / Khách hàng'}
                  </td>
                  <td className="py-3.5 text-slate-500">
                    {log.entity_name} ({log.entity_id})
                  </td>
                  <td className="py-3.5 text-slate-600 max-w-sm truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
