'use client';

import { useEffect, useRef } from 'react';
import { useMe } from '@/features/auth';
import { api } from '@/lib/api-client';
import { useWishlist } from '../store/wishlist.store';

/**
 * Keeps the local wishlist store in sync with the server for logged-in users.
 * First login on a browser merges the guest list up; afterwards the server is
 * the source of truth. Mount once (in the site header).
 */
export function useWishlistSync() {
  const { data: me } = useMe();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    const store = useWishlist.getState();
    if (!me) {
      store.setUser(null);
      ranFor.current = null;
      return;
    }
    if (ranFor.current === me.id) return;
    ranFor.current = me.id;
    store.setUser(me.id);

    if (store.lastMergedUser === me.id) {
      // Already merged in a prior session → load the server list (authoritative).
      api
        .get<string[]>('/api/wishlist')
        .then((ids) => useWishlist.getState().setIds(ids))
        .catch(() => {});
    } else {
      // First login on this browser → push guest items up, then follow server.
      api
        .post<string[]>('/api/wishlist/merge', { keys: store.ids })
        .then((ids) => {
          useWishlist.getState().setIds(ids);
          useWishlist.getState().setMerged(me.id);
        })
        .catch(() => {});
    }
  }, [me]);
}
