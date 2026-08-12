/** API response shapes mirrored from ecom-api. */

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

/** One item in a product's ordered common media gallery. */
export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}
export interface CategoryNode extends Category {
  children: Category[];
}

/** A homepage hero banner (admin-configured image + click-through link). */
export interface HeroBanner {
  id: string;
  imageUrl: string | null;
  linkUrl: string;
}

/** Hero config: the banners plus the store-wide aspect ratio they render at. */
export interface HeroConfig {
  banners: HeroBanner[];
  aspectWidth: number;
  aspectHeight: number;
}

/** Storefront announcement bar (admin-configured scrolling messages). */
export interface Announcement {
  messages: string[];
  active: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

/** Store-wide editable content: FAQ + footer social links. */
export interface SiteContent {
  faqs: FaqItem[];
  socials: SocialLink[];
}

/** A newsletter subscriber (admin view). */
export interface Subscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  source: string | null;
  createdAt: string;
  unsubscribedAt: string | null;
}

/** A customer (auth-service user) for the admin panel. */
export interface AdminCustomer {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  deleted: boolean;
  createdAt: string;
}

export interface AttributeValue {
  id: string;
  typeId: string;
  value: string;
  swatch: string | null;
  sortOrder: number;
}
export interface AttributeType {
  id: string;
  name: string;
  slug: string;
  display: 'text' | 'swatch';
  values: AttributeValue[];
}

export interface Price {
  currency: string;
  amountMinor: number;
}

/** A card on the listing page (a product, or a separately-listed variant). */
export interface ListingItem {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  priceMinor: number;
  offerPriceMinor: number | null;
  currency: string;
  inStock: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  soldCount: number;
}

export interface VariantOption {
  typeId: string;
  type: string;
  slug: string;
  value: string;
  swatch: string | null;
}
export interface Variant {
  id: string;
  sku: string | null;
  priceMinor: number;
  offerPriceMinor: number | null;
  stock: number;
  images: string[];
  listedSeparately: boolean;
  isDefault: boolean;
  options: VariantOption[];
}
export interface ProductDetail {
  id: string;
  name: string;
  slug: string | null;
  shortDescription: string | null;
  description: string | null;
  additionalInfo: string | null;
  tags: string[];
  imageUrl: string | null;
  categoryId: string | null;
  category: string | null;
  active: boolean;
  currency: string;
  basePriceMinor: number;
  offerPriceMinor: number | null;
  baseStock: number;
  priceFromMinor: number;
  hasVariants: boolean;
  media: MediaItem[];
  variants: Variant[];
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string;
  images: string[];
  authorName: string;
  createdAt: string;
}
export interface ReviewSummary {
  average: number;
  count: number;
  items: Review[];
}

/** A product the current customer can review (delivered, not yet reviewed). */
export interface ReviewableProduct {
  productId: string;
  name: string;
  variantLabel: string | null;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  label: string | null;
  imageUrl: string | null;
  quantity: number;
  unitAmountMinor: number;
  compareAtMinor: number | null;
  lineTotalMinor: number;
  available: boolean;
  stock: number;
}
export interface CartView {
  id: string;
  currency: string;
  items: CartLine[];
  itemCount: number;
  subtotalMinor: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  gender: string | null;
  roles: string[];
}

// ---- Referral / affiliate --------------------------------------------------

export type ReferralStatus = 'pending' | 'confirmed' | 'matured' | 'void';
export type PayoutStatus = 'requested' | 'approved' | 'rejected' | 'paid';

export interface ReferralItem {
  id: string;
  orderReference: string | null;
  commissionMinor: number;
  status: ReferralStatus;
  maturesAt: string | null;
  createdAt: string;
}
export type PayoutMethod = 'upi' | 'bank';

export interface ReferralPayout {
  id: string;
  amountMinor: number;
  status: PayoutStatus;
  method: PayoutMethod;
  verifiedName: string | null;
  createdAt: string;
}
/** UPI/bank destination sent with a payout request. */
export interface PayoutAccount {
  method: PayoutMethod;
  upiId?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
}
export interface AccountVerifyResult {
  available: boolean;
  valid?: boolean;
  name?: string | null;
  message?: string;
}
export interface ReferralSummary {
  code: string;
  commissionMinor: number;
  unlockThreshold: number;
  minPayoutMinor: number;
  balanceMinor: number;
  availableMinor: number;
  unlocked: boolean;
  verifyEnabled: boolean;
  returnDays: number;
  maturingMinor: number;
  pendingCount: number;
  confirmedCount: number;
  totalEarnedMinor: number;
  referrals: ReferralItem[];
  payouts: ReferralPayout[];
}
export interface AffiliateSettings {
  id: string;
  commissionMinor: number;
  unlockThreshold: number;
  minPayoutMinor: number;
}
export interface AdminReferral {
  id: string;
  referrerUserId: string;
  buyerUserId: string;
  orderId: string;
  orderReference: string | null;
  commissionMinor: number;
  status: ReferralStatus;
  createdAt: string;
}
export interface AdminPayout {
  id: string;
  userId: string;
  userEmail: string | null;
  amountMinor: number;
  status: PayoutStatus;
  method: PayoutMethod;
  upiId: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  verifiedName: string | null;
  verified: boolean;
  note: string | null;
  createdAt: string;
}

/** Customer-facing coupon (from GET /api/coupons — currently usable codes). */
export interface ActiveCoupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotalMinor: number;
  maxDiscountMinor: number | null;
  expiresAt: string | null;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export type OrderStatus =
  | 'pending' | 'processing' | 'paid' | 'failed'
  | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  unitAmountMinor: number;
  quantity: number;
}
/** Raw admin shapes (management views). */
export interface AdminVariant {
  id: string;
  productId: string;
  sku: string | null;
  priceMinor: number;
  offerPriceMinor: number | null;
  stock: number;
  valueIds: string[];
  images: string[];
  listedSeparately: boolean;
  isDefault: boolean;
  sortOrder: number;
}
export interface AdminProduct {
  id: string;
  name: string;
  slug: string | null;
  shortDescription: string | null;
  description: string | null;
  additionalInfo: string | null;
  tags: string[];
  imageUrl: string | null;
  category: string | null;
  categoryId: string | null;
  active: boolean;
  stock: number;
  priceMinor: number;
  offerPriceMinor: number | null;
  media: MediaItem[];
  variants: AdminVariant[];
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotalMinor: number;
  maxDiscountMinor: number | null;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  timesRedeemed: number;
  active: boolean;
  expiresAt: string | null;
}

export interface AdminReturn {
  id: string;
  orderId: string;
  userId: string;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';
  reason: string | null;
  items: { productId: string; quantity: number }[];
  images: string[];
  refundMinor: number;
  createdAt: string;
}

/** Snapshot of the shipping address captured at order time. */
export interface ShippingAddress {
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
}

export interface AdminOrder extends Order {
  customerEmail: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  refundedMinor: number;
  cancelReason: string | null;
  paymentRef: string | null;
  shippingAddress: ShippingAddress;
}

export interface Order {
  id: string;
  reference: string | null;
  status: OrderStatus;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  couponCode: string | null;
  items: OrderItem[];
  createdAt: string;
}
