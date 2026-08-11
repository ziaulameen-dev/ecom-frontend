'use client';

import { useQuery } from '@tanstack/react-query';
import { accountKeys } from '../keys';
import { fetchActiveCoupons } from '../services/account.service';

/** Coupons the current customer can use right now (account "Coupons" tab). */
export function useCoupons() {
  return useQuery({
    queryKey: accountKeys.coupons,
    queryFn: fetchActiveCoupons,
    staleTime: 60_000,
  });
}
