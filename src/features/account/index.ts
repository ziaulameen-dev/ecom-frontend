/**
 * Public API of the account feature. Import from '@/features/account' rather
 * than reaching into individual files.
 */
export { accountKeys } from './keys';
export type { AddressInput } from './types';

export { useAddresses, useCreateAddress, useDeleteAddress } from './hooks/use-addresses';
export { useMyOrders, useOrder, useCancelOrder } from './hooks/use-orders';
export { useMyReturns, useRequestReturn } from './hooks/use-returns';
export { useUpdateProfile } from './hooks/use-profile';
