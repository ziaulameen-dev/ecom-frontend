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
      className="group relative block aspect-[16/14] cursor-pointer overflow-hidden rounded-sm bg-muted"
    >
      <Image
        src={src}
        alt={category.name}
        fill
        sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
        className="object-cover"
      />

      {/* Dark gradient fades up from the bottom on hover — brings the tile into focus. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="absolute inset-x-3 bottom-3 rounded-sm bg-background px-4 py-3 shadow-sm">
        <div className="truncate text-sm font-bold uppercase tracking-wide">{category.name}</div>
        <div className="mt-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          <span>Shop now</span>
          {/* Divider "draws" toward the arrow on hover, then the arrow glides out. */}
          <span className="relative h-px flex-1 overflow-hidden bg-foreground/20">
            <span className="absolute inset-0 origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover:scale-x-100" />
          </span>
          <ArrowRight className="size-3 transition-transform duration-300 ease-out group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
