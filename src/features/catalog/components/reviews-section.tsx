'use client';

import Image from 'next/image';
import { RatingStars } from '@/components/rating-stars';
import { Skeleton } from '@/components/ui/skeleton';
import { useReviews } from '../hooks/use-reviews';
import { formatDate, mediaSrc } from '@/lib/utils';

export function ReviewsSection({ productId }: { productId: string }) {
  const { data, isLoading } = useReviews(productId);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-sm" />;
  const summary = data ?? { average: 0, count: 0, items: [] };

  const buckets = [5, 4, 3, 2, 1].map((r) => ({
    r,
    n: summary.items.filter((x) => x.rating === r).length,
  }));

  return (
    <section id="reviews-section" className="mt-8 md:mt-16 scroll-mt-24">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">Ratings &amp; reviews</h2>

      {summary.count === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="mt-6 grid gap-10 md:grid-cols-[220px_1fr]">
          {/* Aggregate */}
          <div className="flex flex-col items-center gap-2 rounded-sm border border-gray-200 p-6 bg-white shadow-xs">
            <div className="text-5xl font-bold text-gray-900">{summary.average.toFixed(1)}</div>
            <RatingStars value={summary.average} />
            <div className="text-sm text-gray-500 font-medium">{summary.count} reviews</div>
            <div className="mt-3 w-full space-y-1">
              {buckets.map((b) => (
                <div key={b.r} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-gray-500 font-medium">{b.r}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-sm bg-gray-100">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${summary.count ? (b.n / summary.count) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-gray-500">{b.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* List */}
          <ul className="space-y-6">
            {summary.items.map((rev) => (
              <li key={rev.id} className="border-b border-gray-200 pb-6 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{rev.authorName}</span>
                  <span className="text-xs text-gray-500">{formatDate(rev.createdAt)}</span>
                </div>
                <RatingStars value={rev.rating} className="mt-1" />
                {rev.title && <div className="mt-2 font-semibold text-gray-900 text-sm">{rev.title}</div>}
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">{rev.body}</p>
                {rev.images?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rev.images.map((url) => (
                      <a
                        key={url}
                        href={mediaSrc(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="relative size-20 overflow-hidden rounded-sm border border-gray-200 transition hover:opacity-90"
                      >
                        <Image src={mediaSrc(url)} alt="Review photo" fill sizes="80px" className="object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
