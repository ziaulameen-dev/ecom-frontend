/**
 * Public API of the admin feature. Import from '@/features/admin' rather than
 * reaching into individual files.
 */
export { adminKeys } from './keys';
export { OrderMessagesTab } from './components/order-messages-tab';
export { ShiprocketFulfillmentCard } from './components/shiprocket-fulfillment-card';
export { ShiprocketSettingsCard } from './components/shiprocket-settings-card';

export {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useBulkUpdateFulfillmentMethod,
  useDeleteProduct,
  useAddVariant,
  useUpdateVariant,
  useDeleteVariant,
  useUploadProductImage,
} from './hooks/use-admin-products';

export {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './hooks/use-admin-categories';

export {
  useAdminAttributes,
  useCreateAttributeType,
  useUpdateAttributeType,
  useAddAttributeValue,
  useDeleteAttributeType,
  useDeleteAttributeValue,
} from './hooks/use-admin-attributes';

export {
  useAdminOrders,
  useAdminOrder,
  useUpdateOrderStatus,
  useShipOrder,
  useSetTracking,
  useAdminCancelOrder,
  useRefundOrder,
} from './hooks/use-admin-orders';

export { useAdminReturns, useReturnAction } from './hooks/use-admin-returns';

export {
  useAdminCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from './hooks/use-admin-coupons';

export {
  useAdminReviews,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from './hooks/use-admin-reviews';

export { useShippingRate, useSetShippingRate } from './hooks/use-admin-shipping';
export { useSubscribers, useCustomers, useBroadcast, useNotifyProduct } from './hooks/use-admin-newsletter';

export {
  useShiprocketOrder,
  useCreateShiprocketOrder,
  useAssignAwb,
  useSchedulePickup,
  useGenerateLabel,
  useCancelShiprocketShipment,
  useShippingRates,
  useTrackShipment,
  useAdvanceShiprocketState,
  usePickupAddresses,
} from './hooks/use-admin-shiprocket';
