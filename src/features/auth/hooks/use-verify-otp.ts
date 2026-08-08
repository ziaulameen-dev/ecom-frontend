'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../keys';
import { verifyOtp } from '../services/auth.service';

/** Step 2: verify the OTP → the server sets the session cookies, primes user. */
export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyOtp,
    onSuccess: (res) => {
      qc.setQueryData(authKeys.me, res.user);
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
