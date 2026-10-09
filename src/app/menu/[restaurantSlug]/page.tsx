'use client';

import { useEffect, useState, useMemo, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Bell,
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Flame,
  Leaf,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ReceiptText,
} from 'lucide-react';
import { Restaurant, TableItem, TableSession, Category, Product } from '@/lib/db/types';
import { formatVND } from '@/lib/format';
import { ProductDetailModal, CartItemOption } from '@/components/customer/ProductDetailModal';
import { CartDrawer } from '@/components/customer/CartDrawer';
import { CallStaffModal } from '@/components/customer/CallStaffModal';

export default function CustomerMenuPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const tableParam = searchParams.get('table') || 'B01';
  const tokenParam = searchParams.get('token') || undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<TableItem | null>(null);
  const [session, setSession] = useState<TableSession | null>(null);

  const [categories, setCategories] = useState<(Category & { products: Product[] })[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<'all' | 'featured' | 'vegetarian' | 'spicy'>('all');

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCallStaffOpen, setIsCallStaffOpen] = useState(false);

  // Cart stored in state & synced with session
  const [cart, setCart] = useState<CartItemOption[]>([]);
  const [activeOrderIds, setActiveOrderIds] = useState<string[]>([]);

  // 1. Load Table Context & Menu Data
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        // Resolve stored session token from localStorage if available
        const storedSessionToken = localStorage.getItem(`qrfood_session_${resolvedParams.restaurantSlug}_${tableParam}`);

        const contextUrl = new URL('/api/public/tables/context', window.location.origin);
        contextUrl.searchParams.set('restaurantSlug', resolvedParams.restaurantSlug);
        contextUrl.searchParams.set('tableCode', tableParam);
        if (tokenParam) contextUrl.searchParams.set('token', tokenParam);
        if (storedSessionToken) contextUrl.searchParams.set('sessionToken', storedSessionToken);

        const ctxRes = await fetch(contextUrl.toString());
        const ctxData = await ctxRes.json();

        if (!ctxRes.ok || !ctxData.success) {
          setErrorMsg(ctxData.error || 'Không thể xác thực bàn ăn. Vui lòng quét lại mã QR tại bàn.');
          setIsLoading(false);
          return;
        }

        setRestaurant(ctxData.restaurant);
        setTable(ctxData.table);
        setSession(ctxData.session);

        if (ctxData.session?.session_token) {
          localStorage.setItem(
            `qrfood_session_${resolvedParams.restaurantSlug}_${tableParam}`,
            ctxData.session.session_token
          );
        }

        if (ctxData.activeOrders && ctxData.activeOrders.length > 0) {
          setActiveOrderIds(ctxData.activeOrders.map((o: { id: string }) => o.id));
        }

        // Fetch Menu
        const menuRes = await fetch(`/api/public/restaurants/${resolvedParams.restaurantSlug}/menu`);
        const menuData = await menuRes.json();
        if (menuData.success) {
          setCategories(menuData.categories);
          setFeaturedProducts(menuData.featuredProducts);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, [resolvedParams.restaurantSlug, tableParam, tokenParam]);

  // Cart operations
  const handleAddToCart = (item: CartItemOption) => {
    setCart((prev) => [...prev, item]);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCart((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          quantity: newQty,
          lineTotal: item.unitPrice * newQty,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const cartTotalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.lineTotal, 0);
  }, [cart]);

  const cartTotalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list: Product[] = [];
    if (activeCategory === 'all') {
      list = categories.flatMap((c) => c.products);
    } else {
      const cat = categories.find((c) => c.id === activeCategory);
      list = cat ? cat.products : [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    if (filterTag === 'featured') {
      list = list.filter((p) => p.is_featured);
    } else if (filterTag === 'vegetarian') {
      list = list.filter((p) => p.tags.includes('vegetarian'));
    } else if (filterTag === 'spicy') {
      list = list.filter((p) => p.tags.includes('spicy'));
    }

    return list;
  }, [categories, activeCategory, searchQuery, filterTag]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center text-orange-600 mb-4 animate-bounce">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2 text-slate-700 font-bold text-base">
          <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
          <span>Đang tải thực đơn Hương Sen...</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Đang kết nối phiên gọi món tại bàn {tableParam}</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Không Thể Truy Cập Bàn Ăn</h2>
        <p className="text-sm text-slate-600 max-w-sm mb-6">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-slate-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all shadow-md"
        >
          Thử Lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28">
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Restaurant & Table Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center overflow-hidden border border-orange-200/50 shadow-xs">
              {restaurant?.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <UtensilsCrossed className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-slate-900 line-clamp-1">{restaurant?.name}</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-bold border border-orange-200/60">
                  {table?.name || `Bàn ${tableParam}`}
                </span>
                <span>•</span>
                <span className="text-[11px] text-slate-400">{table?.area_name || 'Tầng 1'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {activeOrderIds.length > 0 && (
              <button
                onClick={() => router.push(`/orders/${activeOrderIds[0]}`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <ReceiptText className="w-4 h-4 text-orange-600" />
                <span className="hidden sm:inline">Xem đơn đã gọi</span>
              </button>
            )}

            <button
              onClick={() => setIsCallStaffOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200/50 transition-all active:scale-95"
            >
              <Bell className="w-4 h-4" />
              <span>Gọi phục vụ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-5">
        {/* Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white p-6 shadow-xl">
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 text-[11px] font-bold border border-orange-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Thực đơn đặc sản hôm nay
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              Trải nghiệm ẩm thực truyền thống Việt Nam
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Món ăn nấu mới từng mẻ. Quý khách vui lòng chọn món và tùy biến gia vị theo khẩu vị.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500 via-amber-500 to-transparent" />
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm phở, nem rán, trà sen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs transition-all"
            />
          </div>

          {/* Quick Filter Tags */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterTag('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterTag === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterTag('featured')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                filterTag === 'featured'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Món nổi bật
            </button>
            <button
              onClick={() => setFilterTag('vegetarian')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                filterTag === 'vegetarian'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              Món chay
            </button>
            <button
              onClick={() => setFilterTag('spicy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                filterTag === 'spicy'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Món cay
            </button>
          </div>
        </div>

        {/* Category Horizontal Navigation */}
        <div className="sticky top-[61px] z-30 bg-slate-50/95 backdrop-blur-md py-2 border-y border-slate-200/50 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả danh mục
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">Không tìm thấy món ăn phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const effectivePrice =
                product.discount_price && product.discount_price > 0 ? product.discount_price : product.base_price;
              const isBestseller = product.tags.includes('bestseller');
              const isVeg = product.tags.includes('vegetarian');
              const isSpicy = product.tags.includes('spicy');

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsDetailModalOpen(true);
                  }}
                  className="group relative bg-white rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex gap-3.5 cursor-pointer active:scale-[0.99]"
                >
                  {/* Food Image */}
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Món ăn</div>
                    )}
                    {isBestseller && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-orange-600 text-[9px] font-black text-white shadow-xs">
                        HOT
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {isVeg && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Chay
                          </span>
                        )}
                        {isSpicy && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" /> Cay
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 ml-auto">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {product.preparation_time_minutes}p
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                      <div>
                        <span className="text-sm sm:text-base font-black text-orange-600">
                          {formatVND(effectivePrice)}
                        </span>
                        {product.discount_price && (
                          <span className="text-[10px] text-slate-400 line-through ml-1.5">
                            {formatVND(product.base_price)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          setIsDetailModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-orange-50 group-hover:bg-orange-600 text-orange-600 group-hover:text-white flex items-center justify-center font-bold text-sm shadow-xs transition-all active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Sticky Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-4 rounded-3xl bg-slate-900 text-white shadow-2xl flex items-center justify-between border border-slate-800 hover:bg-black transition-all active:scale-[0.99] animate-bounce-subtle"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-md">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-orange-600 text-xs font-black flex items-center justify-center border-2 border-slate-900">
                  {cartTotalItemsCount}
                </span>
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400 font-medium">Giỏ hàng của bạn</div>
                <div className="text-base font-black text-white">{formatVND(cartTotalAmount)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 pr-1">
              <span>Xem giỏ & Gọi món</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={handleAddToCart}
      />

      {/* Cart Drawer */}
      {restaurant && session && table && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          restaurantId={restaurant.id}
          tableSessionToken={session.session_token}
          tableCode={table.code}
          onOrderSuccess={(orderId) => {
            setCart([]);
            setIsCartOpen(false);
            router.push(`/orders/${orderId}`);
          }}
        />
      )}

      {/* Call Staff Modal */}
      {session && table && (
        <CallStaffModal
          isOpen={isCallStaffOpen}
          onClose={() => setIsCallStaffOpen(false)}
          sessionToken={session.session_token}
          tableCode={table.code}
        />
      )}
    </div>
  );
}
