'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth';
import {
  requestEmailChange,
  verifyNewEmail,
  verifyOldEmail,
} from '../services/account.service';

/** Step 1 — email an OTP to the current address. */
export function useRequestEmailChange() {
  return useMutation({ mutationFn: requestEmailChange });
}

/** Step 2 — confirm the old-email OTP and supply the new address. */
export function useVerifyOldEmail() {
  return useMutation({ mutationFn: verifyOldEmail });
}

/** Step 3 — confirm the new-email OTP; refresh the cached user with the new email. */
export function useVerifyNewEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyNewEmail,
    onSuccess: (res) => {
      if (res?.user) qc.setQueryData(authKeys.me, res.user);
      qc.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
