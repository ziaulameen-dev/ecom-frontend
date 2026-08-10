'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { ListingItem } from '@/lib/types';
import { ProductCard } from './product-card';
import { ScrollRow } from './scroll-row';

const ITEM = 'w-[46%] shrink-0 snap-start md:w-[31%] lg:w-[23%]';

/** A horizontal strip of product cards (2 per row on mobile → 4 on desktop). */
export function ProductRow({ items, loading }: { items?: ListingItem[]; loading?: boolean }) {
  return (
    <ScrollRow>
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={ITEM}>
              <Skeleton className="aspect-[16/12] w-full rounded-sm" />
            </div>
          ))
        : items?.map((item) => (
            <div key={item.key} className={ITEM}>
              <ProductCard item={item} />
            </div>
          ))}
    </ScrollRow>
  );
}
