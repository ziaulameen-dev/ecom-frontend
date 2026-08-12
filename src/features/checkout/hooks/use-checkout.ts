'use client';

import { useMutation } from '@tanstack/react-query';
import { checkout, validateCoupon } from '../services/checkout.service';

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (input: { code: string; subtotalMinor: number }) =>
      validateCoupon(input),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (input: { addressId: string; couponCode?: string; referralCode?: string; useWallet?: boolean }) =>
      checkout(input),
  });
}
