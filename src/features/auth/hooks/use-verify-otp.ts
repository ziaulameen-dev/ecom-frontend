'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { disconnectChatSocket } from '@/features/chat/services/chat-socket';
import { authKeys } from '../keys';
import { verifyOtp } from '../services/auth.service';

/** Step 2: verify the OTP → the server sets the session cookies, primes user. */
export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyOtp,
    onSuccess: async (res) => {
      qc.setQueryData(authKeys.me, res.user);
      await qc.invalidateQueries({ queryKey: authKeys.me, refetchType: 'all' });
      await qc.invalidateQueries({ queryKey: ['chat'] });
      await qc.invalidateQueries({ queryKey: ['cart'] });
      await qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
