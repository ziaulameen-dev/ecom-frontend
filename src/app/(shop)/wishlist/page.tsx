'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/features/catalog';
import { ProductCard } from '@/features/catalog/components/product-card';
import { useWishlist } from '@/features/wishlist';

// `false` until after hydration, so the localStorage-backed wishlist doesn't
// flash "empty" or mismatch the server render.
const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

export default function WishlistPage() {
  const mounted = useMounted();
  const ids = useWishlist((s) => s.ids);
  const { data: products, isLoading } = useProducts({ limit: 100 });

  const items = (products ?? []).filter((p) => ids.includes(p.key));
  const loading = !mounted || isLoading;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
      </p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/10] w-full rounded-sm" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Link href="/shop"><Button>Continue shopping</Button></Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
