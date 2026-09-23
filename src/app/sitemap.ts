import type { MetadataRoute } from 'next';
import { API_BASE } from '@/lib/config';

interface CategoryItem {
  id: string;
  slug?: string;
  name?: string;
  children?: CategoryItem[];
}

interface ProductItem {
  id: string;
  slug?: string;
  updatedAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

  // 1. Static storefront routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  // 2. Dynamic Categories
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/categories?tree=1`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const categories: CategoryItem[] = await res.json();
      const flatten = (cats: CategoryItem[]): CategoryItem[] =>
        cats.flatMap((c) => [c, ...(c.children ? flatten(c.children) : [])]);
      const allCats = flatten(categories);
      categoryRoutes = allCats.map((cat) => ({
        url: `${baseUrl}/shop?category=${encodeURIComponent(cat.slug || cat.id)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch {
    // Non-fatal if backend is offline during build
  }

  // 3. Dynamic Products
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/products?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const products: ProductItem[] = Array.isArray(data) ? data : data.items ?? [];
      productRoutes = products.map((p) => ({
        url: `${baseUrl}/product/${encodeURIComponent(p.slug || p.id)}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      }));
    }
  } catch {
    // Non-fatal
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
