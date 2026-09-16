'use client';

import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CARD_ASPECT_CLASS } from '@/lib/config';
import type { HeroBanner, ListingItem } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';
import { productHref } from './product-card';

/**
 * The Souled Store Hero Section:
 * - Desktop: Themed backdrop, left title, 3 linked products in a clean bordered frame, right vertical tags.
 * - Mobile: Top backdrop with category tags & title, bottom 2x2 grid of 4 linked products.
 */
export function HeroCarousel({
  banners,
  products = [],
}: {
  banners: HeroBanner[];
  products?: ListingItem[];
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % count);
    }, 7000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const currentBanner = banners[activeIdx];

  // Resolve linked products for the current banner (backend resolved or fallback to client products)
  const linkedFromBanner = (currentBanner?.linkedProducts?.length
    ? currentBanner.linkedProducts
    : (currentBanner?.productIds ?? [])
        .map((id) => products.find((p) => p.productId === id || p.key === id || p.variantId === id))
        .filter(Boolean)) as ListingItem[];

  // Fallback / fill to at least 4 products
  const remaining = products.filter((p) => !linkedFromBanner.includes(p));
  const combined = [...linkedFromBanner, ...remaining];
  const slideProducts = combined.length >= 4
    ? combined.slice(0, 4)
    : Array.from({ length: 4 }).map((_, idx) => products[idx % (products.length || 1)]).filter(Boolean);

  const desktopProducts = slideProducts.slice(0, 3);
  const mobileProducts = slideProducts.slice(0, 4);

  const tags = currentBanner?.categoryTags && currentBanner.categoryTags.length > 0
    ? currentBanner.categoryTags
    : ['PANTS', 'JEANS', 'JOGGERS'];

  const titlePrefix = currentBanner?.title || 'EXPLORE';
  const titleMain = currentBanner?.subtitle || 'BOTTOMS';

  return (
    <div className="relative w-full overflow-hidden bg-black text-white select-none">
      
      {/* ========================================================
          DESKTOP HERO (lg:block)
          ======================================================== */}
      <div className="hidden lg:block relative w-full h-[420px] xl:h-[450px]">
        {/* Background Image Link with Crossfade */}
        {banners.map((b, idx) => (
          <Link
            key={`dt-${b.id}`}
            href={b.linkUrl?.trim() || '/shop'}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out cursor-pointer ${
              idx === activeIdx ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
            }`}
          >
            {b.imageUrl && (
              <Image
                src={mediaSrc(b.imageUrl)}
                alt=""
                fill
                priority={idx === 0}
                quality={90}
                sizes="100vw"
                className="object-cover object-center"
              />
            )}
            <div className="absolute inset-0 bg-black/40" />
          </Link>
        ))}

        {/* Content Overlay */}
        <div className="relative z-10 pointer-events-none mx-auto h-full max-w-[1500px] px-6 lg:px-10 flex items-center justify-between">
          
          {/* Left: Navigation Arrow + Title */}
          <div className="flex items-center gap-6 pointer-events-auto">
            {count > 1 && (
              <button
                type="button"
                aria-label="Previous slide"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev - 1 + count) % count);
                }}
                className="grid size-10 place-items-center text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="size-8" strokeWidth={1.5} />
              </button>
            )}
            <Link href={currentBanner?.linkUrl?.trim() || '/shop'} className="cursor-pointer block">
              <span className="block text-2xl lg:text-3xl font-light uppercase tracking-[0.25em] text-white/90">
                {titlePrefix}
              </span>
              <h2 className="text-3xl lg:text-4xl font-semibold uppercase tracking-wide text-white leading-none mt-1">
                {titleMain}
              </h2>
            </Link>
          </div>

          {/* Center / Right: 3 Linked Products in Container with 2px Gap */}
          <div className="flex items-center pointer-events-auto">
            <div className="flex gap-0.5">
              {desktopProducts.map((p, pIdx) => (
                <Link
                  key={`dt-p-${p?.key ?? pIdx}`}
                  href={p ? productHref(p) : currentBanner.linkUrl}
                  className={cn(
                    'group/card relative block w-[196px] xl:w-[226px] bg-neutral-900 overflow-hidden shadow-md',
                    CARD_ASPECT_CLASS,
                  )}
                >
                  {p?.imageUrl ? (
                    <Image
                      src={mediaSrc(p.imageUrl)}
                      alt={p.name}
                      fill
                      sizes="220px"
                      className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-neutral-500">
                      <ShoppingBag className="size-8" />
                    </div>
                  )}
                  {/* Subtle hover overlay with product name */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-white truncate">
                      {p?.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Far Right Vertical Categories Tab */}
            <div className="ml-6 flex flex-col justify-center items-center gap-6 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 pointer-events-auto">
              {tags.map((tag, tIdx) => (
                <Link
                  key={tIdx}
                  href={`/shop?category=${encodeURIComponent(tag.toLowerCase())}`}
                  className="[writing-mode:vertical-rl] rotate-180 hover:text-white transition-colors"
                >
                  {tag}
                </Link>
              ))}
              {count > 1 && (
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx((prev) => (prev + 1) % count);
                  }}
                  className="grid size-8 place-items-center text-white/80 hover:text-white transition-colors mt-2"
                >
                  <ChevronRight className="size-6" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================
          MOBILE HERO (lg:hidden)
          ======================================================== */}
      <div className="block lg:hidden w-full bg-[#0a0a0a]">
        {/* Top Themed Header with Backdrop Link */}
        <div className="relative w-full py-3.5 sm:py-5 px-4 sm:px-6 overflow-hidden flex flex-col justify-between items-center min-h-[160px] sm:min-h-[180px] md:min-h-[210px]">
          {banners.map((b, idx) => (
            <Link
              key={`mob-bg-${b.id}`}
              href={b.linkUrl?.trim() || '/shop'}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out cursor-pointer ${
                idx === activeIdx ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Image
                src={mediaSrc(b.mobileImageUrl || b.imageUrl || '')}
                alt=""
                fill
                priority={idx === 0}
                quality={90}
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/50" />
            </Link>
          ))}

          {/* Next / Prev Arrows on Mobile Backdrop (Icons only, no bg) */}
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev - 1 + count) % count);
                }}
                className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-20 grid size-9 sm:size-12 place-items-center text-white/80 active:text-white hover:text-white transition-colors"
              >
                <ChevronLeft className="size-6 sm:size-8" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev + 1) % count);
                }}
                className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-20 grid size-9 sm:size-12 place-items-center text-white/80 active:text-white hover:text-white transition-colors"
              >
                <ChevronRight className="size-6 sm:size-8" strokeWidth={1.5} />
              </button>
            </>
          )}

          {/* Top Category Tags (Pinned at the Top, Justify Between) */}
          <div className="relative z-10 w-full flex items-center justify-between sm:justify-center sm:gap-8 px-1 sm:px-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/80">
            {tags.map((tag, tIdx) => (
              <Link
                key={tIdx}
                href={`/shop?category=${encodeURIComponent(tag.toLowerCase())}`}
                className="hover:text-white transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>

          {/* Title & Subtitle Stacked (Centered in the backdrop) */}
          <Link
            href={currentBanner?.linkUrl?.trim() || '/shop'}
            className="relative z-10 my-auto flex flex-col items-center text-center px-10 sm:px-16 pt-2 pb-1 cursor-pointer"
          >
            <span className="block text-xs sm:text-sm md:text-base font-light uppercase tracking-[0.25em] text-white/90">
              {titlePrefix}
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-semibold uppercase tracking-wide text-white leading-tight mt-0.5 sm:mt-1">
              {titleMain}
            </h2>
          </Link>
        </div>

        {/* Bottom 2x2 Grid: Exactly 4 Linked Products (2 on a row) with 2px gap */}
        <div className="grid grid-cols-2 gap-0.5 bg-black">
          {mobileProducts.map((p, pIdx) => (
            <Link
              key={`mob-p-${p?.key ?? pIdx}`}
              href={p ? productHref(p) : currentBanner.linkUrl}
              className={cn(
                'relative bg-neutral-900 overflow-hidden block rounded-xs',
                CARD_ASPECT_CLASS,
              )}
            >
              {p?.imageUrl ? (
                <Image
                  src={mediaSrc(p.imageUrl)}
                  alt={p.name}
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-neutral-600">
                  <ShoppingBag className="size-6" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
