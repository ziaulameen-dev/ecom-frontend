'use client';

import { Heart, Loader2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fillTemplate } from '@/components/rich-text';
import { useAddToCart } from '@/features/cart';
import { useWishlist } from '@/features/wishlist';
import type { ListingItem } from '@/lib/types';
import { CARD_ASPECT_CLASS } from '@/lib/config';
import { cn, mediaSrc, money } from '@/lib/utils';

export function productHref(item: Pick<ListingItem, 'slug' | 'productId'>) {
  return `/product/${item.slug ?? item.productId}`;
}

export function ProductCard({ item }: { item: ListingItem }) {
  const router = useRouter();
  const href = productHref(item);
  const wished = useWishlist((s) => s.ids.includes(item.key) || s.ids.includes(item.productId));
  const toggleWish = useWishlist((s) => s.toggle);
  const add = useAddToCart();

  function onWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWish(item.key);
    // If the productId was stored, toggle it as well to keep in sync
    if (item.productId && item.productId !== item.key && useWishlist.getState().ids.includes(item.productId)) {
      toggleWish(item.productId);
    }
  }

  async function onAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!item.inStock) return;
    try {
      await add.mutateAsync({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: 1,
      });
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message;
      if (errorMsg?.toLowerCase().includes('variant') || !item.variantId) {
        router.push(href);
      }
    }
  }

  return (
    <div className="group flex flex-col border border-gray-200 rounded-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
      <Link href={href} className={cn('relative bg-gray-100 overflow-hidden block', CARD_ASPECT_CLASS)}>
        {item.imageUrl ? (
          <Image
            src={mediaSrc(item.imageUrl)}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="grid h-full place-items-center text-gray-400">
            <ShoppingBag className="size-8" />
          </div>
        )}

        {!item.inStock && (
          <span className="absolute left-2 top-2 z-10 rounded-sm bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Sold out
          </span>
        )}

        <button
          type="button"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={onWish}
          className={cn(
            'absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-sm bg-white/90 shadow-2xs transition-all hover:bg-white',
            wished ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <Heart className={cn('size-4', wished ? 'fill-red-600 text-red-600' : 'text-gray-900')} />
        </button>
      </Link>

      <div className="p-2 xs:p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-1.5 xs:gap-2">
        <Link href={href} className="font-bold text-xs xs:text-sm text-gray-900 hover:text-gray-600 line-clamp-1">
          {fillTemplate(item.name)}
        </Link>
        <div className="mt-0.5 xs:mt-1 flex items-center justify-between gap-1.5 xs:gap-2">
          <div className="flex items-baseline gap-1 xs:gap-1.5 min-w-0 flex-wrap">
            {item.offerPriceMinor != null ? (
              <>
                <span className="font-bold text-xs xs:text-sm text-gray-900">{money(item.offerPriceMinor, item.currency)}</span>
                <span className="text-[10px] xs:text-xs text-gray-400 line-through">{money(item.priceMinor, item.currency)}</span>
              </>
            ) : (
              <span className="font-bold text-xs xs:text-sm text-gray-900">{money(item.priceMinor, item.currency)}</span>
            )}
          </div>

          <button
            type="button"
            aria-label="Add to cart"
            disabled={!item.inStock || add.isPending}
            onClick={onAddToCart}
            className="size-6 xs:size-7 sm:size-8 shrink-0 grid place-items-center rounded-sm bg-gray-100/90 text-gray-700 hover:bg-gray-200 hover:text-gray-950 transition-colors duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {add.isPending ? (
              <Loader2 className="size-3 xs:size-3.5 animate-spin text-gray-500" />
            ) : (
              <ShoppingBag className="size-3 xs:size-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
