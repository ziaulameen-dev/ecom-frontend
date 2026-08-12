'use client';

/**
 * Client-side session helpers.
 *
 * Auth tokens are NOT stored here anymore — they live in HttpOnly cookies the
 * server sets (access_token / refresh_token), which JS can never read. All we
 * keep client-side is the guest-cart id and a reader for the readable CSRF
 * cookie (echoed in X-CSRF-Token on state-changing requests).
 */
import { STORE_NAME } from './config';

// Storage-key prefix derived from the configured store name (env-driven, no
// hardcoded brand). e.g. STORE_NAME "SBAZWIDE" → "sbazwide_cart_id".
const PREFIX = STORE_NAME.toLowerCase().replace(/[^a-z0-9]/g, '') || 'store';
const CART = `${PREFIX}_cart_id`;

const canUse = () => typeof window !== 'undefined';

/** Read the readable `csrf_token` cookie the auth-service sets on login. */
export const csrf = {
  get token(): string | null {
    if (!canUse()) return null;
    const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  },
};

export const cartId = {
  get: () => (canUse() ? localStorage.getItem(CART) : null),
  set: (id: string) => {
    if (canUse() && id) localStorage.setItem(CART, id);
  },
  clear: () => canUse() && localStorage.removeItem(CART),
};

// Referral attribution — last-touch, kept for 30 days.
const REF = `${PREFIX}_ref`;
const REF_TTL = 30 * 24 * 3600 * 1000;
export const referral = {
  get(): string | null {
    if (!canUse()) return null;
    try {
      const raw = localStorage.getItem(REF);
      if (!raw) return null;
      const { code, ts } = JSON.parse(raw) as { code: string; ts: number };
      if (!code || Date.now() - ts > REF_TTL) { localStorage.removeItem(REF); return null; }
      return code;
    } catch {
      return null;
    }
  },
  set(code: string) {
    if (canUse() && code) localStorage.setItem(REF, JSON.stringify({ code: code.toUpperCase(), ts: Date.now() }));
  },
  clear: () => canUse() && localStorage.removeItem(REF),
};
