'use client';

import { Heart, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { useWishlist } from '@/features/wishlist';
import type { ListingItem } from '@/lib/types';
import { CARD_ASPECT_CLASS } from '@/lib/config';
import { cn, mediaSrc, money } from '@/lib/utils';

export function productHref(item: Pick<ListingItem, 'slug' | 'productId'>) {
  return `/product/${item.slug ?? item.productId}`;
}

export function ProductCard({ item }: { item: ListingItem }) {
  const href = productHref(item);
  const wished = useWishlist((s) => s.ids.includes(item.key));
  const toggleWish = useWishlist((s) => s.toggle);

  function onWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWish(item.key);
    toast.success(wished ? 'Removed from wishlist' : 'Added to wishlist');
  }

  return (
    <div className="group flex flex-col border border-gray-200 rounded-none overflow-hidden bg-white hover:shadow-md transition-shadow">
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
          <span className="absolute left-2 top-2 z-10 rounded-none bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Sold out
          </span>
        )}

        <button
          type="button"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={onWish}
          className={cn(
            'absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-none bg-white/90 shadow-2xs transition-all hover:bg-white',
            wished ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <Heart className={cn('size-4', wished ? 'fill-red-600 text-red-600' : 'text-gray-900')} />
        </button>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link href={href} className="font-bold text-xs sm:text-sm text-gray-900 hover:text-gray-600 line-clamp-1">
          {item.name}
        </Link>
        <div className="mt-2 flex items-baseline gap-2">
          {item.offerPriceMinor != null ? (
            <>
              <span className="font-bold text-sm text-gray-900">{money(item.offerPriceMinor, item.currency)}</span>
              <span className="text-xs text-gray-400 line-through">{money(item.priceMinor, item.currency)}</span>
            </>
          ) : (
            <span className="font-bold text-sm text-gray-900">{money(item.priceMinor, item.currency)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
