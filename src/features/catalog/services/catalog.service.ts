import { api } from '@/lib/api-client';
import type {
  Announcement,
  AttributeType,
  CategoryNode,
  FaqItem,
  HeroBanner,
  HeroConfig,
  ListingItem,
  ProductDetail,
  ReviewSummary,
  SiteContent,
  SocialLink,
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

export function fetchFrequentlyBoughtTogether(idOrSlug: string, limit?: number) {
  return api.get<ProductDetail[]>(
    `/api/products/${idOrSlug}/frequently-bought-together${limit ? `?limit=${limit}` : ''}`,
  );
}

export function fetchReviews(productId: string) {
  return api.get<ReviewSummary>(`/api/products/${productId}/reviews`);
}

export function fetchHero() {
  return api.get<HeroConfig>('/api/hero');
}

export type HeroBannerInput = Partial<Omit<HeroBanner, 'id'>> & { imageUrl: string };

/** Admin: add a hero banner. */
export function createHero(input: HeroBannerInput) {
  return api.post<HeroBanner>('/api/hero', input);
}

/** Admin: edit a hero banner (any subset of fields). */
export function updateHero(
  id: string,
  input: Partial<Omit<HeroBanner, 'id'>>,
) {
  return api.patch<HeroBanner>(`/api/hero/${id}`, input);
}

/** Admin: persist the banner display order. */
export function reorderHero(ids: string[]) {
  return api.put('/api/hero/reorder', { ids });
}

/** Admin: set the store-wide hero aspect ratio. */
export function setHeroAspect(input: { aspectWidth: number; aspectHeight: number }) {
  return api.put('/api/hero/aspect', input);
}

/** Admin: remove a hero banner. */
export function deleteHero(id: string) {
  return api.del(`/api/hero/${id}`);
}

export function fetchAnnouncement() {
  return api.get<Announcement>('/api/announcement');
}

/** Admin: set the announcement bar messages + on/off. */
export function setAnnouncement(input: { messages: string[]; active: boolean }) {
  return api.put<Announcement>('/api/announcement', input);
}

export function fetchContent() {
  return api.get<SiteContent>('/api/content');
}

/** Admin: update FAQ and/or footer social links / store settings. */
export function setContent(input: {
  faqs?: FaqItem[];
  socials?: SocialLink[];
  codEnabled?: boolean;
  contactSupportEnabled?: boolean;
  chatAttachmentsEnabled?: boolean;
}) {
  return api.put<SiteContent>('/api/content', input);
}

/** Public: join the newsletter. Returns 'subscribed' (own email while logged in)
 * or 'verify' (a confirmation email was sent). */
export function subscribeNewsletter(email: string, source = 'footer') {
  return api.post<{ status: 'subscribed' | 'verify' }>('/api/newsletter/subscribe', { email, source });
}
