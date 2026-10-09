'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Clock, Check, ShoppingBag } from 'lucide-react';
import { Product, ModifierGroup, Modifier } from '@/lib/db/types';
import { formatVND } from '@/lib/format';

export interface CartItemOption {
  productId: string;
  product: Product;
  quantity: number;
  selectedModifiers: Modifier[];
  note: string;
  unitPrice: number;
  lineTotal: number;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItemOption) => void;
}

export function ProductDetailModal({ product, isOpen, onClose, onAddToCart }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModIds, setSelectedModIds] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');

  // Initialize default modifiers when product opens
  const effectiveBasePrice = useMemo(() => {
    if (!product) return 0;
    return product.discount_price && product.discount_price > 0
      ? product.discount_price
      : product.base_price;
  }, [product]);

  // Reset or initialize options
  useMemo(() => {
    if (!product || !product.modifier_groups) {
      setSelectedModIds({});
      setQuantity(1);
      setNote('');
      return;
    }
    const initialMods: Record<string, string[]> = {};
    for (const group of product.modifier_groups) {
      if (group.min_selection > 0 || group.is_required) {
        const defaultMod = group.modifiers.find((m) => m.is_default) || group.modifiers[0];
        if (defaultMod) {
          initialMods[group.id] = [defaultMod.id];
        }
      } else {
        initialMods[group.id] = [];
      }
    }
    setSelectedModIds(initialMods);
    setQuantity(1);
    setNote('');
  }, [product]);

  if (!isOpen || !product) return null;

  const handleToggleModifier = (group: ModifierGroup, mod: Modifier) => {
    const current = selectedModIds[group.id] || [];
    if (group.max_selection === 1) {
      // Radio mode: choose one
      setSelectedModIds({ ...selectedModIds, [group.id]: [mod.id] });
    } else {
      // Checkbox mode
      if (current.includes(mod.id)) {
        setSelectedModIds({
          ...selectedModIds,
          [group.id]: current.filter((id) => id !== mod.id),
        });
      } else {
        if (current.length < group.max_selection) {
          setSelectedModIds({
            ...selectedModIds,
            [group.id]: [...current, mod.id],
          });
        }
      }
    }
  };

  // Selected modifier objects
  const allSelectedModifiers = (product.modifier_groups || []).flatMap((g) => {
    const selectedIds = selectedModIds[g.id] || [];
    return g.modifiers.filter((m) => selectedIds.includes(m.id));
  });

  const modifiersTotalDelta = allSelectedModifiers.reduce((acc, m) => acc + (m.price_delta || 0), 0);
  const unitPrice = effectiveBasePrice + modifiersTotalDelta;
  const lineTotal = unitPrice * quantity;

  const handleConfirm = () => {
    onAddToCart({
      productId: product.id,
      product,
      quantity,
      selectedModifiers: allSelectedModifiers,
      note: note.trim(),
      unitPrice,
      lineTotal,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-md backdrop-blur transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* Image */}
          <div className="relative w-full h-56 sm:h-64 bg-slate-100">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">Không có ảnh</div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                ~{product.preparation_time_minutes || 15} phút
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* Title & Price */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{product.name}</h2>
              <div className="text-right">
                <div className="text-lg font-black text-orange-600">{formatVND(effectiveBasePrice)}</div>
                {product.discount_price && (
                  <div className="text-xs text-slate-400 line-through">{formatVND(product.base_price)}</div>
                )}
              </div>
            </div>

            {product.description && (
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">{product.description}</p>
            )}

            {/* Modifier Groups */}
            {product.modifier_groups && product.modifier_groups.length > 0 && (
              <div className="space-y-5 mb-6">
                {product.modifier_groups.map((group) => {
                  const currentSelected = selectedModIds[group.id] || [];
                  const isSingle = group.max_selection === 1;

                  return (
                    <div key={group.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{group.name}</span>
                          {group.is_required ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full">
                              Bắt buộc
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Tùy chọn</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {isSingle ? 'Chọn 1' : `Tối đa ${group.max_selection}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.modifiers.map((mod) => {
                          const isSelected = currentSelected.includes(mod.id);
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => handleToggleModifier(group, mod)}
                              className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-white ring-2 ring-orange-500/10 shadow-sm'
                                  : 'border-slate-200 bg-white/70 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-${
                                    isSingle ? 'full' : 'md'
                                  } border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-orange-600 bg-orange-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {mod.name}
                                </span>
                              </div>
                              {mod.price_delta > 0 && (
                                <span className="text-orange-600 font-bold ml-1">+{formatVND(mod.price_delta)}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Note */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú cho bếp</label>
              <input
                type="text"
                placeholder="Ví dụ: Ít cay, không hành, làm nóng..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center gap-4">
          {/* Stepper */}
          <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-9 text-center text-sm font-bold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-between transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-sm">Thêm Vào Giỏ</span>
            </div>
            <span className="text-sm font-black">{formatVND(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
