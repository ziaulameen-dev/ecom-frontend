'use client';

import { api } from '@/lib/api-client';
import type { ActiveCoupon, AdminReturn, Address, Order, OrderItem, User } from '@/lib/types';
import type { AddressInput } from '../types';

/**
 * Account HTTP calls (the "service" layer). These are thin wrappers over the
 * API client with no React coupling — the hooks in `../hooks` wrap them with
 * TanStack Query.
 */

// ---- Addresses ------------------------------------------------------------

/** List the current user's saved addresses. */
export function fetchAddresses() {
  return api.get<Address[]>('/api/addresses');
}

/** Create a new address. */
export function createAddress(input: AddressInput) {
  return api.post<Address>('/api/addresses', input);
}

/** Delete an address by id. */
export function deleteAddress(id: string) {
  return api.del(`/api/addresses/${id}`);
}

// ---- Orders ---------------------------------------------------------------

/** List the current user's orders. */
export function fetchMyOrders() {
  return api.get<Order[]>('/api/orders');
}

/** Fetch a single order by id. */
export function fetchOrder(id: string) {
  return api.get<Order>(`/api/orders/${id}`);
}

/** Cancel an order, optionally with a reason. */
export function cancelOrder(input: { id: string; reason?: string }) {
  return api.post(`/api/orders/${input.id}/cancel`, input.reason ? { reason: input.reason } : {});
}

// ---- Returns (RMA) --------------------------------------------------------

/** List the current user's returns. */
export function fetchMyReturns() {
  return api.get<AdminReturn[]>('/api/returns');
}

/** Create a return for the whole order, then upload evidence images (if any). */
export async function requestReturn(input: {
  orderId: string;
  reason?: string;
  items: OrderItem[];
  files: File[];
}) {
  const rr = await api.post<{ id: string }>(`/api/orders/${input.orderId}/returns`, {
    reason: input.reason || undefined,
    items: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  });
  if (input.files.length) {
    const fd = new FormData();
    input.files.slice(0, 5).forEach((f) => fd.append('images', f));
    await api.postForm(`/api/returns/${rr.id}/images`, fd);
  }
  return rr;
}

// ---- Profile --------------------------------------------------------------

/** Update the current user's profile. */
export function updateProfile(input: { name?: string; mobile?: string; gender?: string }) {
  return api.patch<User>('/auth/profile', input);
}

// ---- Coupons --------------------------------------------------------------

/** List coupons the customer can currently use (for the account Coupons tab). */
export function fetchActiveCoupons() {
  return api.get<ActiveCoupon[]>('/api/coupons');
}
