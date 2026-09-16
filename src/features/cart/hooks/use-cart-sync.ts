'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { authKeys, useMe } from '@/features/auth';
import { cartKeys } from '../keys';
import { mergeCart } from '../services/cart.service';
import { onAuthRefreshed } from '@/lib/api-client';
import { cartId } from '@/lib/session';

/**
 * Keeps the cart in sync across authentication state changes and token refreshes.
 * When a user logs in or their session is refreshed from an expired token,
 * folds any guest cart into their account and loads the user's authoritative cart.
 */
export function useCartSync() {
  const { data: me, isLoading: meLoading } = useMe();
  const qc = useQueryClient();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (meLoading) return;

    if (!me) {
      ranFor.current = null;
      return;
    }

    if (ranFor.current === me.id) return;
    ranFor.current = me.id;

    // User is authenticated (on mount after token refresh, login, etc.)
    (async () => {
      const guestId = cartId.get();
      // Synchronously clear local guest id so no concurrent code can re-trigger
      cartId.clear();

      if (guestId) {
        try {
          const merged = await mergeCart();
          if (merged?.id) {
            qc.setQueryData(cartKeys.cart, merged);
          }
        } catch {
          qc.invalidateQueries({ queryKey: cartKeys.cart });
        }
      } else {
        // No guest cart id, but session transitioned to authenticated user: refresh cart
        qc.invalidateQueries({ queryKey: cartKeys.cart });
      }
    })();
  }, [me, meLoading, qc]);

  // Re-fetch cart and me whenever access token is silently refreshed
  useEffect(() => {
    return onAuthRefreshed(() => {
      qc.invalidateQueries({ queryKey: authKeys.me });
      qc.invalidateQueries({ queryKey: cartKeys.cart });
    });
  }, [qc]);
}
