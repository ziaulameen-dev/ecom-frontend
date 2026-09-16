'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartKeys } from '@/features/cart/keys';
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
    onSuccess: () => {
      cartId.clear();
      qc.setQueryData(authKeys.me, null);
      qc.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}
