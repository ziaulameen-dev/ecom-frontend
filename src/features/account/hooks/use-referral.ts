'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountKeys } from '../keys';
import { fetchReferralSummary, requestPayout } from '../services/account.service';

/** The current user's Refer & Earn summary (code, balance, referrals, payouts). */
export function useReferral(enabled = true) {
  return useQuery({ queryKey: accountKeys.referral, queryFn: fetchReferralSummary, enabled });
}

/** Request a payout; refreshes the referral summary on success. */
export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestPayout,
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.referral }),
  });
}
