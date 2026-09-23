import { Skeleton } from '@/components/ui/skeleton';
import type { ListingItem } from '@/lib/types';
import { CARD_ASPECT_CLASS } from '@/lib/config';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';

export function ProductGrid({
  items,
  loading,
  skeletonCount = 8,
  hasFiltersActive = false,
  onClearFilters,
}: {
  items?: ListingItem[];
  loading?: boolean;
  skeletonCount?: number;
  hasFiltersActive?: boolean;
  onClearFilters?: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className={cn('w-full rounded-sm', CARD_ASPECT_CLASS)} />
        ))}
      </div>
    );
  }
  if (!items?.length) {
    if (hasFiltersActive) {
      return (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed py-20 text-center px-4">
          <p className="text-sm font-semibold text-foreground">No products match your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing or adjusting some of your selected filters.</p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="grid place-items-center rounded-sm border border-dashed py-24 text-sm text-muted-foreground">
        No products found.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item.key} item={item} />
      ))}
    </div>
  );
}
