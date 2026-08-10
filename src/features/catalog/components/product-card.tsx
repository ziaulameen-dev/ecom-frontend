'use client';

import { Heart, ShoppingBag, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/features/cart';
import { useWishlist } from '@/features/wishlist';
import type { ListingItem } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';

export function productHref(item: Pick<ListingItem, 'slug' | 'productId'>) {
  return `/product/${item.slug ?? item.productId}`;
}

export function ProductCard({ item }: { item: ListingItem }) {
  const add = useAddToCart();
  const router = useRouter();
  const href = productHref(item);
  const wished = useWishlist((s) => s.ids.includes(item.key));
  const toggleWish = useWishlist((s) => s.toggle);

  async function onAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // A listed variant card can be added directly; a plain product card may have
    // variants to choose, so send the shopper to the detail page.
    if (item.variantId) {
      try {
        await add.mutateAsync({ productId: item.productId, variantId: item.variantId });
        toast.success('Added to cart');
      } catch (err) {
        toast.error((err as Error).message);
      }
    } else {
      router.push(href);
    }
  }

  function onWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWish(item.key);
    toast.success(wished ? 'Removed from wishlist' : 'Added to wishlist');
  }

  return (
    <div className="group overflow-hidden rounded-sm border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/14] overflow-hidden bg-muted">
        {item.imageUrl ? (
          <Image
            src={mediaSrc(item.imageUrl)}
            alt={item.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <ShoppingBag className="size-8" />
          </div>
        )}

        {/* Whole-tile click target for navigation. */}
        <Link href={href} className="absolute inset-0" aria-label={item.name} />

        {!item.inStock && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-foreground/85 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-background">
            Sold out
          </span>
        )}

        {/* Wishlist heart — appears on hover, stays visible when wishlisted. */}
        <button
          type="button"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={onWish}
          className={cn(
            'absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-background/90 shadow-sm transition-all hover:bg-background',
            wished ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <Heart className={cn('size-4', wished ? 'fill-destructive text-destructive' : 'text-foreground')} />
        </button>

        {/* Add to cart — slides up on hover. */}
        <div className="absolute inset-x-2 bottom-2 z-10 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            className="w-full rounded-sm"
            size="sm"
            disabled={!item.inStock || add.isPending}
            onClick={onAdd}
          >
            <ShoppingBag /> {item.variantId ? 'Add to cart' : 'View'}
          </Button>
        </div>
      </div>

      <div className="p-3">
        <Link href={href} className="block truncate text-xs font-semibold uppercase tracking-wide hover:underline">
          {item.name}
        </Link>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            {item.offerPriceMinor != null ? (
              <>
                <span className="text-sm font-semibold">{money(item.offerPriceMinor, item.currency)}</span>
                <span className="text-xs text-muted-foreground line-through">{money(item.priceMinor, item.currency)}</span>
              </>
            ) : (
              <span className="text-sm font-semibold">{money(item.priceMinor, item.currency)}</span>
            )}
          </div>
          {item.ratingCount > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {item.ratingAvg.toFixed(1)}
              <Star className="size-3 fill-current text-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
