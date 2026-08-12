/**
 * Public API of the account feature. Import from '@/features/account' rather
 * than reaching into individual files.
 */
export { accountKeys } from './keys';
export type { AddressInput } from './types';

export { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from './hooks/use-addresses';
export { useMyOrders, useOrder, useCancelOrder } from './hooks/use-orders';
export { useMyReturns, useRequestReturn } from './hooks/use-returns';
export { useUpdateProfile } from './hooks/use-profile';
export { useCoupons } from './hooks/use-coupons';
export {
  useRequestEmailChange,
  useVerifyOldEmail,
  useVerifyNewEmail,
} from './hooks/use-email-change';
export { useReviewable, useMyReviews, useSubmitReview } from './hooks/use-my-reviews';
export { useReferral, useRequestPayout } from './hooks/use-referral';
