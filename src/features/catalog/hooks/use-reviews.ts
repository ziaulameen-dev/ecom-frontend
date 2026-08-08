'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import { fetchReviews } from '../services/catalog.service';

export function useReviews(productId: string) {
  return useQuery({
    queryKey: catalogKeys.reviews(productId),
    queryFn: () => fetchReviews(productId),
    enabled: !!productId,
  });
}
