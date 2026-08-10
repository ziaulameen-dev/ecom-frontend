'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { HeroBanner } from '@/lib/types';
import { cn, mediaSrc } from '@/lib/utils';

/** Auto-rotating hero banners at the store-wide aspect ratio. */
export function HeroCarousel({
  banners,
  aspectWidth,
  aspectHeight,
}: {
  banners: HeroBanner[];
  aspectWidth: number;
  aspectHeight: number;
}) {
  const [i, setI] = useState(0);
  const count = banners.length;
  const ratio = `${aspectWidth} / ${aspectHeight}`;
  const active = i % count;

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count]);

  return (
    <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: ratio }}>
      {banners.map((b, idx) => (
        <Link
          key={b.id}
          href={b.linkUrl}
          aria-hidden={idx !== active}
          tabIndex={idx === active ? 0 : -1}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            idx === active ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {b.imageUrl && (
            <Image
              src={mediaSrc(b.imageUrl)}
              alt=""
              fill
              priority={idx === 0}
              quality={90}
              sizes="(min-width:1280px) 1248px, 100vw"
              className="object-cover object-center"
            />
          )}
        </Link>
      ))}

      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={cn(
                'size-2 rounded-full transition-colors',
                idx === active ? 'bg-white' : 'bg-white/50 hover:bg-white/80',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
