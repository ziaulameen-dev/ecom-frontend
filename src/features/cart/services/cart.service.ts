'use client';

import { api } from '@/lib/api-client';
import type { CartView } from '@/lib/types';

/**
 * Cart HTTP calls (the "service" layer). These are thin wrappers over the API
 * client with no React coupling — the hooks in `../hooks` wrap them with
 * TanStack Query.
 */

/** Current cart for the session/guest. */
export function fetchCart() {
  return api.get<CartView>('/api/cart');
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
