'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api-client';

interface WishlistState {
  ids: string[];
  userId: string | null;
  lastMergedUser: string | null;
  toggle: (key: string) => void;
  setIds: (ids: string[]) => void;
  setUser: (userId: string | null) => void;
  setMerged: (userId: string) => void;
  clear: () => void;
}

/**
 * Wishlist store — the single source of truth for the UI. Persisted to
 * localStorage so guests keep a list; when a user is logged in (`userId` set),
 * toggles also sync to the server (fire-and-forget). See `useWishlistSync`.
 */
export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      userId: null,
      lastMergedUser: null,
      toggle: (key) => {
        const has = get().ids.includes(key);
        set((s) => ({ ids: has ? s.ids.filter((k) => k !== key) : [...s.ids, key] }));
        if (get().userId) {
          const req = has ? api.del(`/api/wishlist/${key}`) : api.post('/api/wishlist', { key });
          req.catch(() => {}); // local state wins; ignore transient server errors
        }
      },
      setIds: (ids) => set({ ids }),
      setUser: (userId) => set({ userId }),
      setMerged: (userId) => set({ lastMergedUser: userId }),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'wishlist',
      // Don't persist the volatile userId; keep ids + the merge marker.
      partialize: (s) => ({ ids: s.ids, lastMergedUser: s.lastMergedUser }),
    },
  ),
);
