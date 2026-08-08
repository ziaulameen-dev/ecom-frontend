import { api } from '@/lib/api-client';
import type {
  AttributeType,
  CategoryNode,
  ListingItem,
  ProductDetail,
  ReviewSummary,
} from '@/lib/types';
import type { ProductQuery } from '../types';

/**
 * Catalog HTTP calls (the "service" layer). These are thin wrappers over the
 * API client with no React coupling — the hooks in `../hooks` wrap them with
 * TanStack Query.
 */

function toQuery(params: ProductQuery): string {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.categoryId) q.set('categoryId', params.categoryId);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function fetchCategoryTree() {
  return api.get<CategoryNode[]>('/api/categories?tree=1');
}

export function fetchAttributes() {
  return api.get<AttributeType[]>('/api/attributes');
}

export function fetchProducts(params: ProductQuery = {}) {
  return api.get<ListingItem[]>(`/api/products${toQuery(params)}`);
}

export function fetchProduct(idOrSlug: string) {
  return api.get<ProductDetail>(`/api/products/${idOrSlug}`);
}

export function fetchReviews(productId: string) {
  return api.get<ReviewSummary>(`/api/products/${productId}/reviews`);
}
