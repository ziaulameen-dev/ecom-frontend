'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { fetchShippingRate, setShippingRate } from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useShippingRate = (subtotalMinor?: number) =>
  useQuery({
    queryKey: subtotalMinor !== undefined ? [...adminKeys.shipping, subtotalMinor] : adminKeys.shipping,
    queryFn: () => fetchShippingRate(subtotalMinor),
  });

export function useSetShippingRate() {
  const inv = useInvalidate(adminKeys.shipping);
  return useMutation({ mutationFn: setShippingRate, onSuccess: inv });
}
