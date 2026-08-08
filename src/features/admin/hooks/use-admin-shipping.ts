'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { fetchShippingRate, setShippingRate } from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useShippingRate = () =>
  useQuery({ queryKey: adminKeys.shipping, queryFn: fetchShippingRate });

export function useSetShippingRate() {
  const inv = useInvalidate(adminKeys.shipping);
  return useMutation({ mutationFn: setShippingRate, onSuccess: inv });
}
