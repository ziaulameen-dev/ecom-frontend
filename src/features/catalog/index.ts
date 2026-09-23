/**
 * Public API of the catalog feature. Import from '@/features/catalog' rather
 * than reaching into individual files.
 */
export { catalogKeys } from './keys';
export type { ProductQuery } from './types';

export { useCategoryTree } from './hooks/use-categories';
export { useAttributes } from './hooks/use-attributes';
export {
  useProducts,
  useInfiniteProducts,
  useProduct,
  useFrequentlyBoughtTogether,
} from './hooks/use-products';
export { FrequentlyBoughtTogether } from './components/frequently-bought-together';
export { useReviews } from './hooks/use-reviews';
export { useHero, useCreateHero, useUpdateHero, useReorderHero, useSetHeroAspect, useDeleteHero } from './hooks/use-hero';
export { useAnnouncement, useSetAnnouncement } from './hooks/use-announcement';
export { useContent, useSetContent } from './hooks/use-content';
export { subscribeNewsletter } from './services/catalog.service';
