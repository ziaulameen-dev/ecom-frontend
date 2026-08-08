'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartId } from '@/lib/session';
import type { CartView } from '@/lib/types';
import { cartKeys } from '../keys';
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from '../services/cart.service';

/** Persist the returned cart id (for guests) and prime the cache. */
function useApplyCart() {
  const qc = useQueryClient();
  return (cart: CartView) => {
    if (cart?.id) cartId.set(cart.id);
    qc.setQueryData(cartKeys.cart, cart);
  };
}

export function useCart() {
  return useQuery({
    queryKey: cartKeys.cart,
    queryFn: () => fetchCart(),
  });
}

export function useAddToCart() {
  const apply = useApplyCart();
  return useMutation({
    mutationFn: (input: { productId: string; variantId?: string | null; quantity?: number }) =>
      addCartItem(input),
    onSuccess: apply,
  });
}

export function useUpdateCartItem() {
  const apply = useApplyCart();
  return useMutation({
    mutationFn: (input: { itemId: string; quantity: number }) => updateCartItem(input),
    onSuccess: apply,
  });
}

export function useRemoveCartItem() {
  const apply = useApplyCart();
  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: apply,
  });
}
