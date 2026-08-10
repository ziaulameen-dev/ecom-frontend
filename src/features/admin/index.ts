/**
 * Public API of the admin feature. Import from '@/features/admin' rather than
 * reaching into individual files.
 */
export { adminKeys } from './keys';

export {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
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
  useUpdateOrderStatus,
  useSetTracking,
  useAdminCancelOrder,
  useRefundOrder,
} from './hooks/use-admin-orders';

export { useAdminReturns, useReturnAction } from './hooks/use-admin-returns';

export {
  useAdminCoupons,
  useCreateCoupon,
  useDeleteCoupon,
} from './hooks/use-admin-coupons';

export {
  useAdminReviews,
  useCreateReview,
  useDeleteReview,
} from './hooks/use-admin-reviews';

export { useShippingRate, useSetShippingRate } from './hooks/use-admin-shipping';
