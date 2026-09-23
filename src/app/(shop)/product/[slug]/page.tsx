import type { Metadata } from 'next';
import { API_BASE, STORE_NAME } from '@/lib/config';
import { mediaSrc } from '@/lib/utils';
import { ProductView } from './product-view';

interface RawProductDetail {
  id: string;
  name: string;
  slug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  categoryId?: string | null;
  currency?: string;
  basePriceMinor?: number;
  offerPriceMinor?: number | null;
  baseStock?: number;
}

/** Server-side fetch of the product for SEO metadata and JSON-LD schema. */
async function getProduct(slug: string): Promise<RawProductDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return ((json?.data as RawProductDetail) ?? (json as RawProductDetail)) ?? null;
  } catch {
    return null;
  }
}

async function getReviews(productId: string): Promise<{ average: number; count: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}/reviews`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.count && json.count > 0) {
      return { average: json.average ?? 5, count: json.count };
    }
    return null;
  } catch {
    return null;
  }
}

const stripHtml = (html?: string | null) =>
  (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product' };

  const description =
    (p.shortDescription || stripHtml(p.description) || `Buy ${p.name} at ${STORE_NAME}.`).slice(0, 160);
  const images = p.imageUrl ? [mediaSrc(p.imageUrl)] : [];

  return {
    title: p.name, // → "Name · STORE" via the root layout template
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: { title: p.name, description, images, type: 'website' },
    twitter: { card: 'summary_large_image', title: p.name, description, images },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const reviews = product ? await getReviews(product.id) : null;

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const productUrl = `${baseUrl}/product/${encodeURIComponent(product?.slug || slug)}`;
  const description = product
    ? (product.shortDescription || stripHtml(product.description) || `Buy ${product.name} at ${STORE_NAME}.`).slice(0, 300)
    : '';
  const images = product?.imageUrl ? [mediaSrc(product.imageUrl)] : [];
  const price = product ? ((product.offerPriceMinor ?? product.basePriceMinor ?? 0) / 100).toFixed(2) : '0.00';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shop',
        item: `${baseUrl}/shop`,
      },
      ...(product?.category
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: product.category,
              item: `${baseUrl}/shop?category=${encodeURIComponent(product.category)}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: product.name,
              item: productUrl,
            },
          ]
        : [
            {
              '@type': 'ListItem',
              position: 3,
              name: product?.name ?? 'Product',
              item: productUrl,
            },
          ]),
    ],
  };

  const productJsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description,
        image: images,
        sku: product.id,
        brand: {
          '@type': 'Brand',
          name: STORE_NAME,
        },
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: (product.currency || 'INR').toUpperCase(),
          price,
          availability: (product.baseStock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
        ...(reviews && reviews.count > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: reviews.average,
                reviewCount: reviews.count,
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <ProductView slug={slug} />
    </>
  );
}
