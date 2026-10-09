'use client';

import { useEffect, useState } from 'react';
import {
  Grid,
  Plus,
  QrCode,
  Download,
  Printer,
  RefreshCw,
  Users,
  Eye,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { TableItem, DiningArea, TableStatus } from '@/lib/db/types';

export default function AdminTablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<TableItem | null>(null);
  const [qrPngUrl, setQrPngUrl] = useState<string | null>(null);
  const [hostDomain, setHostDomain] = useState<string>('http://192.168.1.53:3000');

  // New Table Form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newAreaId, setNewAreaId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Bulk Print State
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [bulkCards, setBulkCards] = useState<
    { id: string; code: string; name: string; areaName: string; qrPng: string; qrUrl: string }[]
  >([]);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.success) {
        setTables(data.tables);
        setAreas(data.areas);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const renderTableQrWithHost = async (table: TableItem, host: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const cleanHost = host.trim().replace(/\/$/, '');
      const targetUrl = `${cleanHost}/menu/huong-sen?table=${table.code}&token=${table.qr_secret_token}`;
      const url = await QRCode.toDataURL(targetUrl, {
        width: 380,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      setQrPngUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  // Open single table QR modal
  const handleOpenQrModal = async (table: TableItem) => {
    setSelectedTableForQr(table);
    setQrPngUrl(null);
    await renderTableQrWithHost(table, hostDomain);
  };

  // When hostDomain changes, re-render QR for selected table
  const handleChangeHost = async (newHost: string) => {
    setHostDomain(newHost);
    if (selectedTableForQr) {
      await renderTableQrWithHost(selectedTableForQr, newHost);
    }
  };

  // Regenerate secret token
  const handleRegenerateSecret = async (tableId: string) => {
    if (!confirm('Bạn có chắc chắn muốn tạo lại mã bảo mật QR cho bàn này? Mã QR cũ đã in trên bàn sẽ không còn hiệu lực.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, regenerateQr: true }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTables();
        if (selectedTableForQr && selectedTableForQr.id === tableId) {
          handleOpenQrModal({ ...selectedTableForQr, qr_secret_token: data.newSecret });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Change Table Status
  const handleUpdateStatus = async (tableId: string, status: TableStatus) => {
    try {
      await fetch('/api/admin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, status }),
      });
      fetchTables();
    } catch (e) {
      console.error(e);
    }
  };

  // Create Table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          capacity: Number(newCapacity) || 4,
          areaId: newAreaId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddTableOpen(false);
        setNewCode('');
        setNewName('');
        fetchTables();
      } else {
        alert(data.error || 'Lỗi tạo bàn');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  // Load bulk QR cards
  const handleOpenBulkPrint = async (host = hostDomain) => {
    setIsBulkPrintOpen(true);
    try {
      const res = await fetch(`/api/admin/tables/bulk-qr?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      if (data.success) {
        setBulkCards(data.cards);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Bàn Trống', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'OCCUPIED':
        return { label: 'Đang Có Khách', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'WAITING_FOR_SERVICE':
        return { label: 'Cần Phục Vụ', bg: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' };
      case 'AWAITING_PAYMENT':
        return { label: 'Chờ Thanh Toán', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'CLEANING':
        return { label: 'Đang Dọn Dẹp', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { label: 'Tạm Khóa', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sơ Đồ Bàn & Quản Lý QR Code</h1>
          <p className="text-xs text-slate-500 font-medium">
            Quản lý vị trí bàn, trạng thái phục vụ và xuất thẻ quét QR Code để in ấn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenBulkPrint()}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4 text-orange-600" />
            <span>In Toàn Bộ Mã QR</span>
          </button>

          <button
            onClick={() => setIsAddTableOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Bàn Mới</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p className="text-xs font-semibold">Đang tải danh sách bàn ăn...</p>
        </div>
      ) : (
        /* Floor Layout by Dining Areas */
        <div className="space-y-6">
          {areas.map((area) => {
            const areaTables = tables.filter((t) => t.area_id === area.id);

            return (
              <div key={area.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-orange-600" />
                    <h2 className="text-sm sm:text-base font-black text-slate-900">{area.name}</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">{areaTables.length} bàn</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {areaTables.map((table) => {
                    const badge = getStatusBadge(table.status);

                    return (
                      <div
                        key={table.id}
                        className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-orange-300 hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-slate-900">{table.code}</span>
                              <span className="text-xs text-slate-500 font-medium">({table.name})</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                              <Users className="w-3.5 h-3.5" />
                              <span>{table.capacity} chỗ ngồi</span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Order count badge if occupied */}
                        {table.active_order_count ? (
                          <div className="text-[11px] font-bold text-orange-700 bg-orange-100/60 px-2.5 py-1 rounded-xl flex items-center justify-between">
                            <span>Đơn đang phục vụ:</span>
                            <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">
                              {table.active_order_count}
                            </span>
                          </div>
                        ) : null}

                        {/* Status Select & QR Action */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <select
                            value={table.status}
                            onChange={(e) => handleUpdateStatus(table.id, e.target.value as TableStatus)}
                            className="text-xs bg-white border border-slate-200 rounded-xl px-2 py-1 font-semibold text-slate-700 focus:outline-none"
                          >
                            <option value="AVAILABLE">Trống</option>
                            <option value="OCCUPIED">Có khách</option>
                            <option value="WAITING_FOR_SERVICE">Cần phục vụ</option>
                            <option value="AWAITING_PAYMENT">Chờ thanh toán</option>
                            <option value="CLEANING">Đang dọn</option>
                            <option value="DISABLED">Tạm khóa</option>
                          </select>

                          <button
                            onClick={() => handleOpenQrModal(table)}
                            className="p-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                            title="Xem và tải mã QR"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Mã QR</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SINGLE TABLE QR MODAL */}
      {selectedTableForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <button
              onClick={() => setSelectedTableForQr(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* QR Card Preview */}
            <div className="p-6 rounded-3xl bg-slate-950 text-white shadow-xl space-y-4">
              <div>
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Hương Sen Restaurant</p>
                <h3 className="text-xl font-black mt-0.5">BÀN {selectedTableForQr.code}</h3>
                <p className="text-xs text-slate-400">{selectedTableForQr.area_name || 'Khu vực chung'}</p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl mx-auto w-fit shadow-md">
                {qrPngUrl ? (
                  <img src={qrPngUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-300 font-medium">
                Quét mã để xem thực đơn & gọi món trực tiếp tại bàn
              </div>
            </div>

            {/* Host Address Switcher */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <label className="font-bold text-slate-800 flex items-center justify-between text-[11px]">
                <span>Địa chỉ máy chủ mã QR:</span>
                <span className="text-[10px] text-orange-600 font-bold">
                  {hostDomain.includes('loca.lt') ? '🌐 Mọi mạng (4G / Toàn cầu)' : hostDomain.includes('192.168') ? '📱 Mạng Wi-Fi Nội Bộ' : '💻 Localhost'}
                </span>
              </label>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleChangeHost('https://qrfood-demo.loca.lt')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    hostDomain.includes('loca.lt')
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  🌐 4G / Mọi Mạng (loca.lt)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeHost('http://192.168.1.53:3000')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    hostDomain.includes('192.168.1.53')
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  📱 Wi-Fi (192.168.1.53)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeHost(window.location.origin)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    hostDomain === (typeof window !== 'undefined' ? window.location.origin : '')
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  💻 Localhost
                </button>
              </div>

              <input
                type="text"
                value={hostDomain}
                onChange={(e) => handleChangeHost(e.target.value)}
                placeholder="https://qrfood-demo.loca.lt hoặc http://192.168.1.53:3000"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <p className="text-[10px] text-slate-400">
                {hostDomain.includes('loca.lt')
                  ? '👉 Đang dùng đường hầm công khai: Điện thoại bật 4G/5G hoặc bất kỳ Wi-Fi nào đều quét được.'
                  : '👉 Dùng Wi-Fi: Điện thoại và máy tính cần kết nối chung 1 mạng Wi-Fi.'}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 text-xs">
              <a
                href={qrPngUrl || '#'}
                download={`QR_Ban_${selectedTableForQr.code}.png`}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh PNG in tem bàn</span>
              </a>

              <a
                href={`${hostDomain}/menu/huong-sen?table=${selectedTableForQr.code}&token=${selectedTableForQr.qr_secret_token}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Thử mở menu bàn này</span>
              </a>

              <button
                onClick={() => handleRegenerateSecret(selectedTableForQr.id)}
                className="w-full py-2 text-[11px] text-slate-400 hover:text-rose-600 transition-colors flex items-center justify-center gap-1 font-semibold"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Đổi mã bảo mật QR (Hủy mã cũ)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK PRINT MODAL */}
      {isBulkPrintOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 animate-fade-in flex flex-col items-center">
          <div className="w-full max-w-4xl bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print">
              <div>
                <h3 className="text-lg font-black text-slate-900">Mẫu In Mã QR Hàng Loạt Cho Toàn Bộ Bàn</h3>
                <p className="text-xs text-slate-500">Đã chuẩn bị sẵn định dạng trang in nhãn để dán trên bàn</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Tất Cả (Ctrl + P)</span>
                </button>
                <button
                  onClick={() => setIsBulkPrintOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Host switcher for bulk print */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 no-print text-xs">
              <span className="font-bold text-slate-700">Đường dẫn mã QR khi in: <span className="font-mono text-orange-600 font-semibold">{hostDomain}</span></span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setHostDomain('https://qrfood-demo.loca.lt'); handleOpenBulkPrint('https://qrfood-demo.loca.lt'); }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${hostDomain.includes('loca.lt') ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'}`}
                >
                  🌐 4G / Mọi Mạng (loca.lt)
                </button>
                <button
                  type="button"
                  onClick={() => { setHostDomain('http://192.168.1.53:3000'); handleOpenBulkPrint('http://192.168.1.53:3000'); }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${hostDomain.includes('192.168') ? 'bg-orange-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'}`}
                >
                  📱 Wi-Fi Nội Bộ (192.168.1.53)
                </button>
              </div>
            </div>

            {/* Print Sheet Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
              {bulkCards.map((card) => (
                <div
                  key={card.id}
                  className="p-5 rounded-3xl bg-slate-950 text-white text-center space-y-3 border border-slate-800 shadow-md break-inside-avoid"
                >
                  <div>
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                      Nhà Hàng Hương Sen
                    </span>
                    <h4 className="text-xl font-black mt-0.5">BÀN {card.code}</h4>
                    <p className="text-[11px] text-slate-400">{card.areaName}</p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl mx-auto w-fit shadow-xs">
                    <img src={card.qrPng} alt={`QR ${card.code}`} className="w-36 h-36 object-contain" />
                  </div>

                  <p className="text-[10px] text-slate-300 font-medium">
                    Quét mã để xem menu & gọi món
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD TABLE MODAL */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <button
              onClick={() => setIsAddTableOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-4">Thêm Bàn Ăn Mới</h3>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã bàn (Duy nhất)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: B11, VIP03"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên hiển thị bàn</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bàn 11, Bàn Ngoài Trời 03"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số chỗ ngồi</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khu vực</label>
                  <select
                    value={newAreaId}
                    onChange={(e) => setNewAreaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="">Chọn khu vực...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-60 transition-colors mt-2"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Lưu Bàn & Sinh Mã QR</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
