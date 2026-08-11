'use client';

import { api } from '@/lib/api-client';
import type {
  ActiveCoupon, AdminReturn, Address, Order, OrderItem, Review, ReviewableProduct, User,
} from '@/lib/types';
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

/** Update an existing address. */
export function updateAddress(id: string, input: AddressInput) {
  return api.patch<Address>(`/api/addresses/${id}`, input);
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

// ---- Email change (3-step: verifies BOTH the old and new inbox) -----------

interface EmailChallenge { step: string; sentTo: string; expiresInSeconds: number }

/** Step 1: email an OTP to the CURRENT address. */
export function requestEmailChange() {
  return api.post<EmailChallenge>('/auth/email/change');
}

/** Step 2: confirm the old-email OTP + supply the new address (emails it a code). */
export function verifyOldEmail(input: { newEmail: string; otp: string }) {
  return api.post<EmailChallenge>('/auth/email/verify-old', input);
}

/** Step 3: confirm the new-email OTP; the address is switched and token re-issued. */
export function verifyNewEmail(input: { otp: string }) {
  return api.post<{ user: User; csrfToken?: string }>('/auth/email/verify-new', input);
}

// ---- Reviews (customer-authored, for delivered products) ------------------

/** Products the customer can review (received, not yet reviewed). */
export function fetchReviewable() {
  return api.get<ReviewableProduct[]>('/api/reviews/reviewable');
}

/** Reviews the customer has written. */
export function fetchMyReviews() {
  return api.get<Review[]>('/api/reviews/mine');
}

/** Submit a review for a purchased+delivered product. */
export function submitReview(input: {
  productId: string;
  rating: number;
  title?: string;
  body: string;
  authorName?: string;
  images?: string[];
}) {
  return api.post<Review>('/api/reviews/mine', input);
}
