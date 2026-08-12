'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PayoutStatus } from '@/lib/types';
import {
  decidePayout,
  fetchAdminPayouts,
  fetchAdminReferrals,
  fetchAffiliateSettings,
  setAffiliateSettings,
} from '../services/admin.service';

const settingsKey = ['admin', 'affiliate', 'settings'] as const;
const referralsKey = ['admin', 'affiliate', 'referrals'] as const;
const payoutsKey = ['admin', 'affiliate', 'payouts'] as const;

export function useAffiliateSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: fetchAffiliateSettings });
}

export function useSetAffiliateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setAffiliateSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKey }),
  });
}

export function useAdminReferrals() {
  return useQuery({ queryKey: referralsKey, queryFn: fetchAdminReferrals });
}

export function useAdminPayouts() {
  return useQuery({ queryKey: payoutsKey, queryFn: fetchAdminPayouts });
}

export function useDecidePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PayoutStatus }) => decidePayout(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: payoutsKey }),
  });
}
