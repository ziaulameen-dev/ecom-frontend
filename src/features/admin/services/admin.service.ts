import { api } from '@/lib/api-client';
import type {
  AdminOrder,
  AdminProduct,
  AdminReturn,
  AttributeType,
  Category,
  Coupon,
  OrderStatus,
  Review,
} from '@/lib/types';

/**
 * Admin HTTP calls (the "service" layer). These are thin wrappers over the API
 * client with no React coupling — the hooks in `../hooks` wrap them with
 * TanStack Query. One function per HTTP call.
 */

/* ---- Products + variants ------------------------------------------------- */
export function fetchAdminProducts() {
  return api.get<AdminProduct[]>('/api/products/admin/all');
}
export function createProduct(body: Record<string, unknown>) {
  return api.post('/api/products', body);
}
export function updateProduct(input: { id: string; body: Record<string, unknown> }) {
  return api.patch(`/api/products/${input.id}`, input.body);
}
export function deleteProduct(id: string) {
  return api.del(`/api/products/${id}`);
}
export function addVariant(input: { productId: string; body: Record<string, unknown> }) {
  return api.post(`/api/products/${input.productId}/variants`, input.body);
}
export function updateVariant(input: { id: string; body: Record<string, unknown> }) {
  return api.patch(`/api/products/variants/${input.id}`, input.body);
}
export function deleteVariant(id: string) {
  return api.del(`/api/products/variants/${id}`);
}
export function uploadProductImage(file: File) {
  const form = new FormData();
  form.append('image', file);
  return api.postForm<{ url: string; key: string; type: 'image' | 'video' }>(
    '/api/products/admin/image',
    form,
  );
}

/* ---- Categories ---------------------------------------------------------- */
export function fetchAdminCategories() {
  return api.get<Category[]>('/api/categories');
}
export function createCategory(body: Record<string, unknown>) {
  return api.post('/api/categories', body);
}
export function updateCategory(input: { id: string; body: Record<string, unknown> }) {
  return api.patch(`/api/categories/${input.id}`, input.body);
}
export function deleteCategory(id: string) {
  return api.del(`/api/categories/${id}`);
}

/* ---- Attributes ---------------------------------------------------------- */
export function fetchAdminAttributes() {
  return api.get<AttributeType[]>('/api/attributes');
}
export function createAttributeType(body: Record<string, unknown>) {
  return api.post('/api/attributes', body);
}
export function updateAttributeType(input: { id: string; body: Record<string, unknown> }) {
  return api.patch(`/api/attributes/${input.id}`, input.body);
}
export function addAttributeValue(input: { typeId: string; body: Record<string, unknown> }) {
  return api.post(`/api/attributes/${input.typeId}/values`, input.body);
}
export function deleteAttributeType(id: string) {
  return api.del(`/api/attributes/${id}`);
}
export function deleteAttributeValue(id: string) {
  return api.del(`/api/attribute-values/${id}`);
}

/* ---- Orders -------------------------------------------------------------- */
export function fetchAdminOrders() {
  return api.get<AdminOrder[]>('/api/admin/orders');
}
export function updateOrderStatus(input: { id: string; status: OrderStatus }) {
  return api.patch(`/api/admin/orders/${input.id}/status`, { status: input.status });
}
export function setTracking(input: { id: string; carrier: string; trackingNumber: string }) {
  return api.patch(`/api/admin/orders/${input.id}/tracking`, {
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
  });
}
export function adminCancelOrder(input: { id: string; reason?: string }) {
  return api.post(`/api/admin/orders/${input.id}/cancel`, input.reason ? { reason: input.reason } : {});
}
export function refundOrder(input: { id: string; amountMinor?: number }) {
  return api.post(
    `/api/admin/orders/${input.id}/refund`,
    input.amountMinor ? { amountMinor: input.amountMinor } : {},
  );
}

/* ---- Returns ------------------------------------------------------------- */
export function fetchAdminReturns() {
  return api.get<AdminReturn[]>('/api/admin/returns');
}
export function returnAction(input: {
  id: string;
  action: 'approve' | 'reject' | 'receive' | 'refund' | 'refund_no_restock';
}) {
  return api.patch(`/api/admin/returns/${input.id}`, { action: input.action });
}

/* ---- Coupons ------------------------------------------------------------- */
export function fetchAdminCoupons() {
  return api.get<Coupon[]>('/api/admin/coupons');
}
export function createCoupon(body: Record<string, unknown>) {
  return api.post('/api/admin/coupons', body);
}
export function deleteCoupon(id: string) {
  return api.del(`/api/admin/coupons/${id}`);
}

/* ---- Reviews ------------------------------------------------------------- */
export function fetchAdminReviews() {
  return api.get<Review[]>('/api/admin/reviews');
}
export function createReview(body: Record<string, unknown>) {
  return api.post('/api/reviews', body);
}
export function deleteReview(id: string) {
  return api.del(`/api/reviews/${id}`);
}

/* ---- Shipping ------------------------------------------------------------ */
export function fetchShippingRate() {
  return api.get<{ amountMinor: number }>('/api/shipping-rate');
}
export function setShippingRate(amountMinor: number) {
  return api.put('/api/shipping-rate', { amountMinor });
}
