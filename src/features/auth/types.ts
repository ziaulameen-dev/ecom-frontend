import type { User } from '@/lib/types';

/** Cookie-mode login result: the session is set as cookies, not returned. */
export interface CookieAuthResult {
  user: User;
  csrfToken: string;
}

/** The challenge returned by requesting an OTP (no token yet). */
export interface OtpChallenge {
  otpRequired: true;
  email: string;
  expiresInSeconds: number;
  // False for returning accounts → the client can skip the name field.
  isNewUser: boolean;
}
