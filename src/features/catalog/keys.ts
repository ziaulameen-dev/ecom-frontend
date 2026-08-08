import type { ProductQuery } from './types';

/** Query keys — centralized so mutations can invalidate precisely. */
export const catalogKeys = {
  categories: ['categories'] as const,
  attributes: ['attributes'] as const,
  products: (params: ProductQuery) => ['products', params] as const,
  product: (idOrSlug: string) => ['product', idOrSlug] as const,
  reviews: (productId: string) => ['reviews', productId] as const,
};
