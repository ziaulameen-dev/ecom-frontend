'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api-client';

export interface PincodeDetails {
  pincode: string;
  city: string;
  state: string;
  offices: string[];
}

/**
 * Hook for Indian Pincode lookup.
 * Powered by backend data.gov.in integration with Redis caching.
 */
export function usePincode() {
  /** Lookup 6-digit Indian pincode details (city, state, post offices). */
  const lookupPincode = useCallback(async (pincode: string): Promise<PincodeDetails | null> => {
    if (!/^\d{6}$/.test(pincode.trim())) return null;
    try {
      const res = await api.get<{ data: PincodeDetails | null }>(`/api/pincode/lookup/${pincode.trim()}`);
      return res.data;
    } catch (err) {
      console.error('Pincode lookup error:', err);
      return null;
    }
  }, []);

  return {
    lookupPincode,
  };
}
