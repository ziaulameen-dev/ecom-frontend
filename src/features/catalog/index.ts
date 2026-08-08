/**
 * Public API of the catalog feature. Import from '@/features/catalog' rather
 * than reaching into individual files.
 */
export { catalogKeys } from './keys';
export type { ProductQuery } from './types';

export { useCategoryTree } from './hooks/use-categories';
export { useAttributes } from './hooks/use-attributes';
export { useProducts, useProduct } from './hooks/use-products';
export { useReviews } from './hooks/use-reviews';
