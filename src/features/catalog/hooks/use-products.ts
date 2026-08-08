'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import { fetchProduct, fetchProducts } from '../services/catalog.service';
import type { ProductQuery } from '../types';

export function useProducts(params: ProductQuery = {}) {
  return useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: () => fetchProducts(params),
  });
}

export function useProduct(idOrSlug: string) {
  return useQuery({
    queryKey: catalogKeys.product(idOrSlug),
    queryFn: () => fetchProduct(idOrSlug),
    enabled: !!idOrSlug,
  });
}
