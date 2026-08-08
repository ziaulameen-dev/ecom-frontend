'use client';

import { api } from '@/lib/api-client';
import type { User } from '@/lib/types';
import type { CookieAuthResult, OtpChallenge } from '../types';

/**
 * Auth HTTP calls (the "service" layer). These are thin wrappers over the API
 * client with no React coupling — the hooks in `../hooks` wrap them with
 * TanStack Query. The session itself lives in HttpOnly cookies set by the
 * server, so nothing sensitive is returned or stored here.
 */

/** Current user. Throws on 401 — callers decide how to treat "logged out". */
export function fetchMe() {
  return api.get<User>('/auth/me');
}

/** Step 1: request a one-time code for an email. */
export function requestOtp(email: string) {
  return api.post<OtpChallenge>('/auth/otp', { email }, false);
}

/** Step 2: verify the code; the server sets the session cookies on success. */
export function verifyOtp(input: { email: string; otp: string; name?: string }) {
  return api.post<CookieAuthResult>('/auth/verify-otp', input, false);
}

/** End the session — the server reads the refresh cookie and clears all cookies. */
export function logout() {
  return api.post('/auth/logout', {}, false);
}
