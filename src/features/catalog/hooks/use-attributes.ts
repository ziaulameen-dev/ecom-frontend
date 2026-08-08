'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import { fetchAttributes } from '../services/catalog.service';

export function useAttributes() {
  return useQuery({
    queryKey: catalogKeys.attributes,
    queryFn: () => fetchAttributes(),
    staleTime: 5 * 60_000,
  });
}
