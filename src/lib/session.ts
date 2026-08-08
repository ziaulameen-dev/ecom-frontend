'use client';

/**
 * Client-side session helpers.
 *
 * Auth tokens are NOT stored here anymore — they live in HttpOnly cookies the
 * server sets (access_token / refresh_token), which JS can never read. All we
 * keep client-side is the guest-cart id and a reader for the readable CSRF
 * cookie (echoed in X-CSRF-Token on state-changing requests).
 */
const CART = 'sbaz_cart_id';

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
