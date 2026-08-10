'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { useCategoryTree, useHero, useProducts } from '@/features/catalog';
import { CategoryCard } from '@/features/catalog/components/category-card';
import { HeroCarousel } from '@/features/catalog/components/hero-carousel';
import { ProductRow } from '@/features/catalog/components/product-row';
import { ScrollRow } from '@/features/catalog/components/scroll-row';

// Bundled default shown until an admin adds hero banners from Settings.
const DEFAULT_HERO = '/images/hero-image.png';

export default function HomePage() {
  const { data: tree } = useCategoryTree();
  const { data: hero } = useHero();
  const { data: products, isLoading } = useProducts({ limit: 30 });

  const banners = hero?.banners ?? [];
  const ratio = `${hero?.aspectWidth ?? 500} / ${hero?.aspectHeight ?? 265}`;

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

  return (
    <div>
      {/* Hero — admin-managed banner carousel (falls back to a bundled image). */}
      <section className="mx-auto max-w-7xl px-4 pt-6 md:pt-4">
        {banners.length > 0 ? (
          <HeroCarousel
            banners={banners}
            aspectWidth={hero?.aspectWidth ?? 500}
            aspectHeight={hero?.aspectHeight ?? 265}
          />
        ) : (
          <Link href="/shop" className="block">
            <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: ratio }}>
              <Image
                src={DEFAULT_HERO}
                alt="Shop the featured collection"
                fill
                priority
                sizes="(min-width:1280px) 1280px, 100vw"
                className="object-cover object-center"
              />
            </div>
          </Link>
        )}
      </section>

      {/* Shop by collection — horizontal strip */}
      {!!tree?.length && (
        <section className="mx-auto mt-16 max-w-7xl px-4">
          <SectionHead title="Shop by collection" href="/shop" />
          <ScrollRow>
            {tree.map((c) => (
              <div key={c.id} className="w-[46%] shrink-0 snap-start md:w-[31%] lg:w-[23%]">
                <CategoryCard category={c} />
              </div>
            ))}
          </ScrollRow>
        </section>
      )}

      {/* Best sellers — horizontal strip */}
      <section className="mx-auto mt-16 max-w-7xl px-4">
        <SectionHead title="Best sellers" href="/shop?sort=best" />
        <ProductRow items={bestSellers} loading={isLoading} />
      </section>

      {/* New arrivals — horizontal strip */}
      <section className="mx-auto mb-24 mt-16 max-w-7xl px-4">
        <SectionHead title="New arrivals" href="/shop?sort=new" />
        <ProductRow items={newArrivals} loading={isLoading} />
      </section>
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          Show all →
        </Link>
      )}
    </div>
  );
}
