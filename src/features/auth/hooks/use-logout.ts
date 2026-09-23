'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { disconnectChatSocket } from '@/features/chat/services/chat-socket';
import { cartId } from '@/lib/session';
import { authKeys } from '../keys';
import { logout } from '../services/auth.service';

/** Log out: clear the session cookies (server-side) and reset cached user/cart. */
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await logout().catch(() => {});
    },
    onSuccess: async () => {
      cartId.clear();
      disconnectChatSocket();
      qc.setQueryData(authKeys.me, null);
      await qc.invalidateQueries({ queryKey: authKeys.me, refetchType: 'all' });
      await qc.invalidateQueries({ queryKey: ['chat'] });
      await qc.invalidateQueries({ queryKey: ['cart'] });
      await qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
