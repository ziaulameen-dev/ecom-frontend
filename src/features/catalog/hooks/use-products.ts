import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import { fetchProduct, fetchProducts } from '../services/catalog.service';
import type { ProductQuery } from '../types';

export function useProducts(params: ProductQuery = {}) {
  return useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: () => fetchProducts(params),
  });
}

export function useInfiniteProducts(params: Omit<ProductQuery, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...catalogKeys.products(params), 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      fetchProducts({ ...params, page: pageParam as number, limit: params.limit ?? 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const limit = params.limit ?? 20;
      if (!lastPage || lastPage.length < limit) return undefined;
      return allPages.length + 1;
    },
  });
}

export function useProduct(idOrSlug: string) {
  return useQuery({
    queryKey: catalogKeys.product(idOrSlug),
    queryFn: () => fetchProduct(idOrSlug),
    enabled: !!idOrSlug,
  });
}
