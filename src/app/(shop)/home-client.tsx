'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ValueProps } from '@/components/value-props';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCategoryTree,
  useContent,
  useHero,
  useInfiniteProducts,
  useProducts,
} from '@/features/catalog';
import { CategoryCard } from '@/features/catalog/components/category-card';
import { HeroCarousel } from '@/features/catalog/components/hero-carousel';
import { ProductCard } from '@/features/catalog/components/product-card';
import { ProductRow } from '@/features/catalog/components/product-row';
import { STORE_NAME } from '@/lib/config';
import { cn } from '@/lib/utils';

// Bundled default shown until an admin adds hero banners from Settings.
const DEFAULT_HERO = '/images/hero-image.png';

export function HomeClient() {
  const { data: tree, isLoading: treeLoading } = useCategoryTree();
  const { data: hero, isLoading: heroLoading } = useHero();
  const { data: products, isLoading } = useProducts({ limit: 30 });
  const { data: content } = useContent();

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: infiniteLoading,
  } = useInfiniteProducts({ limit: 16 });

  const [isStopped, setIsStopped] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const faqs = content?.faqs ?? [];
  const banners = hero?.banners ?? [];
  const ratio = `${hero?.aspectWidth ?? 8} / ${hero?.aspectHeight ?? 3}`;

  // Derive the two strips (top 10 each) from one fetch.
  const bestSellers = useMemo(
    () => [...(products ?? [])].sort((a, b) => b.soldCount - a.soldCount).slice(0, 10),
    [products],
  );
  const newArrivals = useMemo(
    () =>
      [...(products ?? [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    [products],
  );

  // Flatten and randomize all products per page
  const allFeedProducts = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page, pageIdx) => {
      // Deterministic shuffle with seed based on page index
      const seed = 1337 + pageIdx * 17;
      const arr = [...page];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.abs(Math.sin(seed + i)) * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  }, [infiniteData]);

  // Infinite scroll trigger
  useEffect(() => {
    if (isStopped || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' },
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [isStopped, hasNextPage, isFetchingNextPage, fetchNextPage]);

  function handleJumpToFooter() {
    setIsStopped(true);
    setTimeout(() => {
      document.getElementById('home-faq')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  return (
    <div>
      {/* Hero — admin-managed banner carousel (falls back to a bundled image). */}
      <section className="w-full">
        {heroLoading ? (
          <Skeleton className="w-full" style={{ aspectRatio: ratio }} />
        ) : hero?.banners && hero.banners.length > 0 ? (
          <HeroCarousel
            banners={hero.banners}
            products={products}
          />
        ) : (
          <Link href="/shop" className="block">
            <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: ratio }}>
              <Image
                src={DEFAULT_HERO}
                alt="Shop the featured collection"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          </Link>
        )}
      </section>

      {/* Trust / value-props band — directly below hero */}
      <section className="mx-auto mt-6 sm:mt-10 max-w-[1500px] px-3 sm:px-6 lg:px-8">
        <ValueProps />
      </section>

      {/* Categories — 3-column Grid with dedicated max width on desktop */}
      {treeLoading ? (
        <section className="mx-auto mt-10 max-w-[950px] px-3 sm:px-6 lg:px-8">
          <SectionHead title="Categories" center />
          <div className="grid grid-cols-3 gap-2.5 sm:gap-6 md:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="aspect-square w-full rounded-none" />
                <Skeleton className="mt-3.5 h-4 w-24" />
              </div>
            ))}
          </div>
        </section>
      ) : !!tree?.length && (
        <section className="mx-auto mt-10 max-w-[950px] px-3 sm:px-6 lg:px-8">
          <SectionHead title="Categories" center />
          <div className="grid grid-cols-3 gap-2.5 sm:gap-6 md:gap-8">
            {tree.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </section>
      )}

      {/* New arrivals — horizontal strip */}
      <section className="mx-auto mt-8 sm:mt-16 max-w-[1500px] px-3 sm:px-6 lg:px-8">
        <SectionHead title="New arrivals" href="/shop?sort=new" center />
        <ProductRow items={newArrivals} loading={isLoading} />
      </section>

      {/* Best sellers — horizontal strip */}
      <section className="mx-auto mt-8 sm:mt-16 max-w-[1500px] px-3 sm:px-6 lg:px-8">
        <SectionHead title="Best sellers" href="/shop?sort=best" center />
        <ProductRow items={bestSellers} loading={isLoading} />
      </section>

      {/* All Products — Infinite Scrolling Feed in Random Order */}
      <section className="mx-auto mt-10 sm:mt-18 max-w-[1500px] px-3 sm:px-6 lg:px-8">
        <SectionHead title="Explore collection" center />

        {infiniteLoading && allFeedProducts.length === 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4">
            {allFeedProducts.map((p, idx) => (
              <ProductCard key={`${p.key}-${idx}`} item={p} />
            ))}
          </div>
        )}

        {/* Loading next page skeletons */}
        {isFetchingNextPage && !isStopped && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-none" />
            ))}
          </div>
        )}

        {/* Sentinel for infinite scroll trigger */}
        {!isStopped && hasNextPage && (
          <div ref={sentinelRef} className="h-8 w-full" />
        )}
      </section>

      {/* Sticky Bottom Bar: Appears ONLY starting on 3rd page while there are more pages to scroll */}
      {!isStopped && hasNextPage && (infiniteData?.pages?.length ?? 0) >= 3 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#f4f4f4]/95 dark:bg-neutral-900/95 backdrop-blur border-t border-neutral-300 dark:border-neutral-800 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={handleJumpToFooter}
              className="w-full py-3.5 sm:py-4 flex items-center justify-between text-left font-bold text-sm sm:text-base text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-colors"
            >
              <span>Know more about {STORE_NAME}</span>
              <ChevronDown className="size-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        </div>
      )}

      {/* FAQ & Footer transition — revealed when completed or when user stops scroll */}
      {(isStopped || !hasNextPage) && faqs.length > 0 && (
        <section id="home-faq" className="mx-auto mt-12 sm:mt-18 max-w-[850px] px-3 sm:px-6 lg:px-8 scroll-mt-20">
          <SectionHead title="Frequently asked questions" center />
          <div className="mx-auto w-full divide-y border-t border-neutral-200 dark:border-neutral-800">
            {faqs.map((faq, i) => (
              <details key={i} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-sm sm:text-base text-neutral-900 dark:text-neutral-100 hover:text-foreground transition-colors">
                  <span>{faq.question}</span>
                  <span className="text-muted-foreground text-lg transition-transform duration-200 group-open:rotate-45 select-none">+</span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({ title, href, center }: { title: string; href?: string; center?: boolean }) {
  if (center) {
    return (
      <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-sm sm:text-base font-bold uppercase tracking-[0.25em] text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="mt-1 text-xs font-medium uppercase tracking-widest text-neutral-600 dark:text-neutral-400 transition-colors hover:text-foreground"
          >
            Show all →
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="mb-6 flex items-end justify-between">
      <h2 className="text-sm sm:text-base font-bold uppercase tracking-[0.25em] text-neutral-900 dark:text-neutral-100">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-medium uppercase tracking-widest text-neutral-600 dark:text-neutral-400 transition-colors hover:text-foreground"
        >
          Show all →
        </Link>
      )}
    </div>
  );
}
