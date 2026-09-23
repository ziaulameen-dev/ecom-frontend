'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cartKeys, addCartItem } from '@/features/cart';
import type { ProductDetail, Variant, VariantOption } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';
import { useFrequentlyBoughtTogether } from '../hooks/use-products';

interface Props {
  currentProduct: ProductDetail;
  currentVariant?: Variant | null;
}

export function FrequentlyBoughtTogether({ currentProduct, currentVariant }: Props) {
  const { data: pairedProducts, isLoading } = useFrequentlyBoughtTogether(currentProduct.id);
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({
    [currentProduct.id]: true,
  });

  // Bundle products list: currentProduct + recommendations
  const bundleProducts = useMemo(() => {
    if (!pairedProducts || pairedProducts.length === 0) return [];
    return [currentProduct, ...pairedProducts];
  }, [currentProduct, pairedProducts]);

  // Helper to get active variant for any item in bundle
  const getActiveVariant = (p: ProductDetail): Variant | null => {
    if (!p.hasVariants || p.variants.length === 0) return null;
    if (p.id === currentProduct.id && currentVariant) {
      return currentVariant;
    }
    const selectedId = selectedVariants[p.id];
    if (selectedId) {
      return p.variants.find((v) => v.id === selectedId) ?? p.variants[0];
    }
    return p.variants.find((v) => v.isDefault) ?? p.variants[0];
  };

  // Helper to get price and stock for any item in bundle
  const getItemDetails = (p: ProductDetail) => {
    const v = getActiveVariant(p);
    const isChecked = checkedMap[p.id] ?? true;
    const priceMinor = p.hasVariants
      ? v?.offerPriceMinor ?? v?.priceMinor ?? p.priceFromMinor
      : p.offerPriceMinor ?? p.basePriceMinor;
    const listPriceMinor = p.hasVariants ? v?.priceMinor ?? p.priceFromMinor : p.basePriceMinor;
    const stock = p.hasVariants ? v?.stock ?? 0 : p.baseStock;
    const isOutOfStock = stock <= 0;

    let imageUrl = p.imageUrl;
    if (v?.images?.[0]) {
      imageUrl = v.images[0];
    } else if (p.media?.[0]?.url) {
      imageUrl = p.media[0].url;
    }

    return {
      variant: v,
      isChecked,
      priceMinor,
      listPriceMinor,
      stock,
      isOutOfStock,
      imageUrl,
    };
  };

  // Calculate total price of checked items
  const totalPriceMinor = bundleProducts.reduce((sum, p) => {
    const isChecked = checkedMap[p.id] ?? true;
    if (!isChecked) return sum;
    const { priceMinor } = getItemDetails(p);
    return sum + priceMinor;
  }, 0);

  const selectedCount = bundleProducts.filter((p) => checkedMap[p.id] ?? true).length;

  // If no recommendations or still loading with 0 items, hide section
  if (isLoading || bundleProducts.length <= 1) {
    return null;
  }

  const handleToggleCheck = (productId: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [productId]: !(prev[productId] ?? true),
    }));
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantId,
    }));
  };

  const handleAddBundleToCart = async () => {
    const itemsToAdd = bundleProducts.filter((p) => checkedMap[p.id] ?? true);
    if (itemsToAdd.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setIsAdding(true);
    let successCount = 0;
    try {
      for (const p of itemsToAdd) {
        const { variant, isOutOfStock } = getItemDetails(p);
        if (isOutOfStock) {
          toast.error(`"${p.name}" is currently out of stock`);
          continue;
        }
        await addCartItem({
          productId: p.id,
          variantId: variant?.id ?? null,
          quantity: 1,
        });
        successCount++;
      }

      await qc.invalidateQueries({ queryKey: cartKeys.cart });
      if (successCount > 0) {
        toast.success(
          `Added ${successCount} ${successCount === 1 ? 'item' : 'items'} to your cart!`,
        );
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to add items to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-8 md:mt-14 border border-gray-200 rounded-sm bg-white p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">
          Frequently Bought Together
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customers who viewed this item also bought these matching essentials.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Visual Strip of Products with + connectors */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 flex-1">
          {bundleProducts.map((p, idx) => {
            const { isChecked, imageUrl, isOutOfStock } = getItemDetails(p);
            const isMain = p.id === currentProduct.id;

            return (
              <div key={p.id} className="flex items-center gap-2 sm:gap-4">
                <div
                  className={cn(
                    'relative group rounded-md border p-2 bg-gray-50/50 transition-all flex flex-col items-center w-28 sm:w-32',
                    isChecked ? 'border-gray-300' : 'border-dashed border-gray-200 opacity-60',
                  )}
                >
                  <div className="relative size-20 sm:size-24 rounded bg-white overflow-hidden border border-gray-100 flex items-center justify-center">
                    {imageUrl ? (
                      <Image
                        src={mediaSrc(imageUrl)}
                        alt={p.name}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="size-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 text-[10px] font-bold text-white uppercase flex items-center justify-center">
                        Out of stock
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 mt-1.5 truncate max-w-full text-center">
                    {isMain ? 'This item' : p.name}
                  </span>
                </div>

                {idx < bundleProducts.length - 1 && (
                  <Plus className="size-4 sm:size-5 text-gray-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Action / Buy Box */}
        <div className="lg:border-l lg:border-gray-200 lg:pl-6 shrink-0 flex flex-col justify-center min-w-[220px]">
          <div className="text-xs text-muted-foreground">
            Total price for{' '}
            <span className="font-semibold text-gray-900">{selectedCount}</span> selected{' '}
            {selectedCount === 1 ? 'item' : 'items'}:
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
            {money(totalPriceMinor)}
          </div>

          <button
            type="button"
            disabled={isAdding || selectedCount === 0}
            onClick={handleAddBundleToCart}
            className="mt-3.5 w-full h-10 rounded-sm bg-[#187b7b] hover:bg-[#146666] disabled:bg-gray-300 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            {isAdding ? (
              <span>ADDING…</span>
            ) : (
              <>
                <ShoppingBag className="size-4" />
                <span>
                  {selectedCount === bundleProducts.length
                    ? 'ADD ALL TO CART'
                    : `ADD SELECTED (${selectedCount})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Item List Checkboxes & Variant Dropdowns */}
      <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
        {bundleProducts.map((p) => {
          const { variant, isChecked, priceMinor, listPriceMinor } =
            getItemDetails(p);
          const isMain = p.id === currentProduct.id;

          return (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs py-1"
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <Checkbox
                  id={`fbt-check-${p.id}`}
                  checked={isChecked}
                  onCheckedChange={() => handleToggleCheck(p.id)}
                  className="mt-0.5 sm:mt-0"
                />
                <label
                  htmlFor={`fbt-check-${p.id}`}
                  className="cursor-pointer select-none text-gray-800 font-medium hover:text-[#187b7b] transition-colors"
                >
                  <span className="font-bold">{isMain ? 'This item: ' : ''}</span>
                  {p.name}
                </label>
                {!isMain && (
                  <Link
                    href={`/product/${p.slug ?? p.id}`}
                    target="_blank"
                    className="text-[11px] text-[#187b7b] hover:underline shrink-0 hidden sm:inline"
                  >
                    View details
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-3 pl-6 sm:pl-0 shrink-0">
                {/* Variant selector dropdown if product has multiple variants */}
                {p.hasVariants && p.variants.length > 1 && !isMain && (
                  <Select
                    value={variant?.id ?? p.variants[0]?.id}
                    onValueChange={(val) => handleVariantChange(p.id, val)}
                  >
                    <SelectTrigger className="h-7 text-xs w-36 bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {p.variants.map((v: Variant) => {
                        const optLabel =
                          v.options.map((o: VariantOption) => o.value).join(' / ') ||
                          v.sku ||
                          'Default';
                        return (
                          <SelectItem
                            key={v.id}
                            value={v.id}
                            disabled={v.stock <= 0}
                            className="text-xs"
                          >
                            {optLabel} {v.stock <= 0 ? '(Out of stock)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <span>{money(priceMinor)}</span>
                  {listPriceMinor > priceMinor && (
                    <span className="text-[10px] text-muted-foreground line-through font-normal">
                      {money(listPriceMinor)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
