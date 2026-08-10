'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  ids: string[];
  toggle: (key: string) => void;
  clear: () => void;
}

/**
 * Client-side wishlist, persisted to localStorage. Keyed by listing item key
 * (a product id or a variant id). No backend yet — purely local.
 */
export const useWishlist = create<WishlistState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (key) =>
        set((s) => ({
          ids: s.ids.includes(key) ? s.ids.filter((k) => k !== key) : [...s.ids, key],
        })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'wishlist' },
  ),
);
