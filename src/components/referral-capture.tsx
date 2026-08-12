'use client';

import { useEffect } from 'react';
import { referral } from '@/lib/session';

/** Stores a `?ref=CODE` referral param (last-touch, 30 days). Mount once. */
export function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) referral.set(ref);
  }, []);
  return null;
}
