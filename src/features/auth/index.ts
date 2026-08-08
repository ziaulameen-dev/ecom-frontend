/**
 * Public API of the auth feature. Import from '@/features/auth' rather than
 * reaching into individual files.
 */
export { authKeys } from './keys';
export type { CookieAuthResult, OtpChallenge } from './types';

export { useAuthModal } from './store/auth-modal.store';

export { useMe } from './hooks/use-me';
export { useRequestOtp } from './hooks/use-request-otp';
export { useVerifyOtp } from './hooks/use-verify-otp';
export { useLogout } from './hooks/use-logout';

export { LoginModal } from './components/login-modal';
