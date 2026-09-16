'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/lib/types';
import { mediaSrc } from '@/lib/utils';

/**
 * Minimalist square category card with light gray background and centered uppercase title below.
 */
export function CategoryCard({ category }: { category: Pick<Category, 'name' | 'slug' | 'imageUrl'> }) {
  const src = category.imageUrl
    ? mediaSrc(category.imageUrl)
    : `https://picsum.photos/seed/${encodeURIComponent(category.slug)}/800/500`;

  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className="group flex flex-col items-center text-center cursor-pointer select-none w-full"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#f4f4f4] transition-all duration-300 group-hover:bg-[#ebebeb]">
        <Image
          src={src}
          alt={category.name}
          fill
          sizes="(min-width: 1024px) 350px, (min-width: 640px) 33vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <p className="mt-3 sm:mt-4 w-full text-center text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-neutral-900 transition-colors group-hover:text-primary line-clamp-1">
        {category.name}
      </p>
    </Link>
  );
}
