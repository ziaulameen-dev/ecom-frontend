export interface CheckoutAmounts {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
}
export interface CheckoutResult {
  orderId: string;
  reference: string;
  status: string;
  currency: string;
  amounts: CheckoutAmounts;
  paymentSessionId: string;
  appId: string;
  mode: 'sandbox' | 'production';
}

export interface CouponResult {
  code: string;
  type: 'percent' | 'fixed';
  discountMinor: number;
}
