'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/lib/types';
import { mediaSrc } from '@/lib/utils';

/**
 * A "shop by collection" tile: a tall portrait image with a floating white
 * label box (name + "Shop now →") overlapping its lower edge.
 */
export function CategoryCard({ category }: { category: Pick<Category, 'name' | 'slug' | 'imageUrl'> }) {
  const src = category.imageUrl
    ? mediaSrc(category.imageUrl)
    : `https://picsum.photos/seed/${encodeURIComponent(category.slug)}/800/500`;

  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className="group relative block aspect-[16/14] rounded-sm overflow-hidden bg-muted"
    >
      <Image
        src={src}
        alt={category.name}
        fill
        sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
        className="object-cover"
      />

      <div className="absolute inset-x-3 bottom-3 bg-background rounded-sm px-4 py-3 shadow-sm">
        <div className="truncate text-sm font-bold uppercase tracking-wide">{category.name}</div>
        <div className="mt-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          <span>Shop now</span>
          <span className="h-px flex-1 bg-foreground/20" />
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
