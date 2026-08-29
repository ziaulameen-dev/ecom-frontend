import { Skeleton } from '@/components/ui/skeleton';
import type { ListingItem } from '@/lib/types';
import { CARD_ASPECT_CLASS } from '@/lib/config';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';

export function ProductGrid({
  items,
  loading,
  skeletonCount = 8,
}: {
  items?: ListingItem[];
  loading?: boolean;
  skeletonCount?: number;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className={cn('w-full rounded-none', CARD_ASPECT_CLASS)} />
        ))}
      </div>
    );
  }
  if (!items?.length) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed py-24 text-muted-foreground">
        No products found.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item.key} item={item} />
      ))}
    </div>
  );
}
