'use client';

import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
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
  const clearWishlist = useWishlist((s) => s.clear);
  const setIds = useWishlist((s) => s.setIds);
  const { data: products, isLoading } = useProducts({ limit: 100 });

  // Match items by listing key, productId, or variantId
  const items = (products ?? []).filter(
    (p) => ids.includes(p.key) || ids.includes(p.productId) || (p.variantId && ids.includes(p.variantId)),
  );

  // Auto-prune stale IDs that no longer correspond to any product in the catalog
  useEffect(() => {
    if (mounted && !isLoading && products && ids.length > 0) {
      const validKeys = new Set(
        products.flatMap((p) => [p.key, p.productId, p.variantId].filter(Boolean) as string[]),
      );
      const activeIds = ids.filter((id) => validKeys.has(id));
      if (activeIds.length !== ids.length) {
        setIds(activeIds);
      }
    }
  }, [mounted, isLoading, products, ids, setIds]);

  const loading = !mounted || isLoading;

  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Wishlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {ids.length > 0 && !loading && (
          <button
            type="button"
            onClick={() => clearWishlist()}
            className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear wishlist
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/10] w-full rounded-sm" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 sm:mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Link href="/shop">
            <Button>Continue shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <ProductCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
