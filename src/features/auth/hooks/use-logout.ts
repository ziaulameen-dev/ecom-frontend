'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
      qc.setQueryData(authKeys.me, null);
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
