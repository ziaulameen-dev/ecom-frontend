import type { Metadata } from 'next';
import { API_BASE, STORE_NAME } from '@/lib/config';
import { mediaSrc } from '@/lib/utils';
import { ProductView } from './product-view';

interface RawProduct {
  name: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
}

/** Server-side fetch of the product for SEO metadata (cached briefly). */
async function getProduct(slug: string): Promise<RawProduct | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as RawProduct) ?? null;
  } catch {
    return null;
  }
}

const stripHtml = (html: string | null) =>
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
  return <ProductView slug={slug} />;
}
