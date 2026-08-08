'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import { fetchCategoryTree } from '../services/catalog.service';

export function useCategoryTree() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => fetchCategoryTree(),
    staleTime: 5 * 60_000,
  });
}
