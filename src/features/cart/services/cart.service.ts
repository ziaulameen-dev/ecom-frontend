'use client';

import { api, apiFetch, ApiError } from '@/lib/api-client';
import type { CartView } from '@/lib/types';

/**
 * Cart HTTP calls (the "service" layer). These are thin wrappers over the API
 * client with no React coupling — the hooks in `../hooks` wrap them with
 * TanStack Query.
 */

/** Current cart for the session/guest. */
export async function fetchCart(): Promise<CartView> {
  try {
    return await api.get<CartView>('/api/cart');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      // If refresh token is expired or dead, fallback to clean guest cart
      return await apiFetch<CartView>('/api/cart', { auth: false });
    }
    throw e;
  }
}

/** Add an item to the cart. */
export function addCartItem(input: { productId: string; variantId?: string | null; quantity?: number }) {
  return api.post<CartView>('/api/cart/items', {
    productId: input.productId,
    variantId: input.variantId ?? undefined,
    quantity: input.quantity ?? 1,
  });
}

/** Update the quantity of a cart item. */
export function updateCartItem(input: { itemId: string; quantity: number }) {
  return api.patch<CartView>(`/api/cart/items/${input.itemId}`, { quantity: input.quantity });
}

/** Remove an item from the cart. */
export function removeCartItem(itemId: string) {
  return api.del<CartView>(`/api/cart/items/${itemId}`);
}

/** Merge guest cart into authenticated user cart. */
export function mergeCart() {
  return api.post<CartView>('/api/cart/merge');
}
