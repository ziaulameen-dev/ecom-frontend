'use client';

import { useMutation } from '@tanstack/react-query';
import { requestOtp } from '../services/auth.service';

/** Step 1: request an OTP for an email. */
export function useRequestOtp() {
  return useMutation({
    mutationFn: (email: string) => requestOtp(email),
  });
}
