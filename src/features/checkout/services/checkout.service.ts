import { api } from '@/lib/api-client';
import type { CheckoutResult, CouponResult } from '../types';

/**
 * Checkout HTTP calls (the "service" layer). These are thin wrappers over the
 * API client with no React coupling — the hooks in `../hooks` wrap them with
 * TanStack Query.
 */

/** Validate a coupon code against the current subtotal. */
export function validateCoupon(input: { code: string; subtotalMinor: number }) {
  return api.post<CouponResult>('/api/coupons/validate', input);
}

/** Place the order for the given address, optional coupon, referral + wallet. */
export function checkout(input: {
  addressId: string;
  couponCode?: string;
  referralCode?: string;
  useWallet?: boolean;
}) {
  return api.post<CheckoutResult>('/api/checkout', input);
}
