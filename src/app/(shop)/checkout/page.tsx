'use client';

import { load } from '@cashfreepayments/cashfree-js';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Edit2,
  Loader2,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { fillTemplate } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthModal, useMe } from '@/features/auth';
import { useCart } from '@/features/cart';
import {
  useAddresses,
  useCoupons,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  type AddressInput,
} from '@/features/account';
import { AddressForm } from '@/features/account/components/address-form';
import { AvailableCouponsModal, useCheckout, useValidateCoupon } from '@/features/checkout';
import { useShippingRate } from '@/features/admin';
import { useContent } from '@/features/catalog';
import { api } from '@/lib/api-client';
import type { Address, Order } from '@/lib/types';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn, mediaSrc, money } from '@/lib/utils';

type Phase = 'form' | 'paying' | 'confirming' | 'done' | 'verifying';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
          Loading checkout…
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const urlCoupon = sp.get('coupon');
  const urlOrderId = sp.get('order_id');
  const qc = useQueryClient();
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const { data: me, isLoading: meLoading } = useMe();
  const openLogin = useAuthModal((s) => s.openLogin);
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const validateCoupon = useValidateCoupon();
  const checkout = useCheckout();
  const { data: availableCoupons } = useCoupons();

  const [selected, setSelected] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discountMinor: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponsModalOpen, setCouponsModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [status, setStatus] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const { data: siteContent } = useContent();
  const codEnabled = Boolean(siteContent?.codEnabled);
  const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'cod'>('prepaid');

  const subtotal = cart?.subtotalMinor ?? 0;

  useEffect(() => {
    if (urlOrderId) {
      pollOrder(urlOrderId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [urlOrderId]);

  useEffect(() => {
    if (urlCoupon && subtotal > 0 && !coupon) {
      setCouponInput(urlCoupon.toUpperCase());
      validateCoupon
        .mutateAsync({ code: urlCoupon.trim(), subtotalMinor: subtotal })
        .then((res) => {
          setCoupon({ code: res.code, discountMinor: res.discountMinor });
        })
        .catch((e) => {
          setCouponError((e as Error).message || 'Invalid coupon code');
        });
    }
  }, [urlCoupon, subtotal]);

  useEffect(() => {
    if (!meLoading && !me) {
      openLogin(urlCoupon ? `/checkout?coupon=${encodeURIComponent(urlCoupon)}` : '/checkout');
    }
  }, [me, meLoading, openLogin, urlCoupon]);

  useEffect(() => {
    if (addresses?.length && !selected) {
      setSelected(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selected]);

  const mrpTotal = (cart?.items ?? []).reduce(
    (sum, it) => sum + (it.compareAtMinor ?? it.unitAmountMinor) * it.quantity,
    0,
  );
  const savings = (cart?.items ?? []).reduce(
    (sum, it) => sum + (it.compareAtMinor ? Math.max(0, it.compareAtMinor - it.unitAmountMinor) * it.quantity : 0),
    0,
  );

  const { data: shippingData } = useShippingRate(subtotal);
  const shippingMinor = shippingData?.amountMinor ?? 0;

  const discount = coupon?.discountMinor ?? 0;
  const subtotalAfterCoupon = Math.max(0, subtotal - discount);
  const estimatedTotal = subtotalAfterCoupon + shippingMinor;

  async function saveNewAddress(values: AddressInput) {
    setCheckoutError(null);
    try {
      const a = await createAddress.mutateAsync(values);
      setSelected(a.id);
      setAdding(false);
    } catch (e) {
      setCheckoutError((e as Error).message);
    }
  }

  async function saveEditedAddress(values: AddressInput) {
    if (!editingAddress) return;
    setCheckoutError(null);
    try {
      await updateAddress.mutateAsync({ id: editingAddress.id, input: values });
      setEditingAddress(null);
    } catch (e) {
      setCheckoutError((e as Error).message);
    }
  }

  async function handleDeleteAddress(a: Address) {
    const ok = await confirm({
      title: 'Remove address?',
      description: `"${a.fullName}, ${a.line1}" will be permanently removed from your saved addresses.`,
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    setCheckoutError(null);
    try {
      await deleteAddress.mutateAsync(a.id);
      toast.success('Address removed');
      if (editingAddress?.id === a.id) {
        setEditingAddress(null);
      }
      if (selected === a.id) {
        const remaining = addresses?.filter((addr) => addr.id !== a.id);
        setSelected(remaining?.[0]?.id ?? '');
      }
    } catch (e) {
      setCheckoutError((e as Error).message);
    }
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError(null);
    try {
      const res = await validateCoupon.mutateAsync({ code: couponInput.trim(), subtotalMinor: subtotal });
      setCoupon({ code: res.code, discountMinor: res.discountMinor });
      router.replace(`/checkout?coupon=${encodeURIComponent(res.code)}`, { scroll: false });
    } catch (e) {
      setCoupon(null);
      setCouponError((e as Error).message);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput('');
    setCouponError(null);
    router.replace('/checkout', { scroll: false });
  }

  async function pollOrder(orderId: string) {
    setPhase('confirming');
    setStatus('Confirming your order…');
    for (let i = 0; i < 25; i++) {
      const o = await api.get<Order>(`/api/orders/${orderId}`).catch(() => null);
      if (o?.status === 'confirmed' || o?.status === 'processing') {
        setConfirmedOrder(o);
        setPhase('done');
        setStatus('Order Placed Successfully!');
        qc.invalidateQueries({ queryKey: ['cart'] });
        qc.invalidateQueries({ queryKey: ['orders'] });
        return;
      }
      if (o?.status === 'cancelled' || o?.status === 'failed') {
        setPhase('form');
        setCheckoutError('Payment was cancelled or could not be completed.');
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    const finalOrder = await api.get<Order>(`/api/orders/${orderId}`).catch(() => null);
    if (finalOrder?.status === 'confirmed' || finalOrder?.status === 'processing') {
      setConfirmedOrder(finalOrder);
      setPhase('done');
      setStatus('Order Placed Successfully!');
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    } else if (finalOrder?.status === 'pending') {
      // Order is still pending verification from the bank or payment gateway
      setConfirmedOrder(finalOrder);
      setPhase('verifying');
      setStatus('Payment Verification in Progress');
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    } else {
      setPhase('form');
      setCheckoutError('Payment verification taking longer than expected — please check your orders page.');
    }
  }

  async function pay() {
    setCheckoutError(null);
    if (!selected) {
      setCheckoutError('Please select a delivery address');
      return;
    }
    setPhase('paying');
    try {
      const result = await checkout.mutateAsync({
        addressId: selected,
        couponCode: coupon?.code,
        paymentMethod,
      });

      if (paymentMethod === 'cod' || !result.paymentSessionId) {
        // Cash on delivery: Order created directly as processing
        const o = await api.get<Order>(`/api/orders/${result.orderId}`).catch(() => null);
        setConfirmedOrder(
          o ??
            ({
              id: result.orderId,
              reference: result.reference,
              status: 'processing',
              currency: result.currency,
              subtotalMinor: result.amounts.subtotalMinor,
              discountMinor: result.amounts.discountMinor,
              shippingMinor: result.amounts.shippingMinor,
              taxMinor: result.amounts.taxMinor,
              totalMinor: result.amounts.totalMinor,
              couponCode: coupon?.code ?? null,
              paymentMethod: 'cod',
              items: [],
              createdAt: new Date().toISOString(),
            } as Order),
        );
        setPhase('done');
        setStatus('Order Placed Successfully!');
        qc.invalidateQueries({ queryKey: ['cart'] });
        qc.invalidateQueries({ queryKey: ['orders'] });
        return;
      }

      const cashfree = await load({ mode: result.mode === 'production' ? 'production' : 'sandbox' });
      const res = await cashfree.checkout({ paymentSessionId: result.paymentSessionId, redirectTarget: '_modal' });
      if (res.error) {
        setPhase('form');
        setCheckoutError(res.error.message ?? 'Payment cancelled');
        return;
      }
      await pollOrder(result.orderId);
    } catch (e) {
      setPhase('form');
      setCheckoutError((e as Error).message);
    }
  }

  const modalBody = (
    <div className="py-2">
      {phase === 'confirming' || phase === 'paying' ? (
        <div className="py-10 text-center space-y-4">
          <Loader2 className="mx-auto size-12 animate-spin text-[#187b7b]" />
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Confirming your order…
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Redirecting to your orders…
            </p>
          </div>
        </div>
      ) : confirmedOrder ? (
        <div className="space-y-4">
          <div className="text-center space-y-1.5 pt-1">
            {phase === 'verifying' || confirmedOrder.status === 'pending' ? (
              <>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                  <Clock className="size-7 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Payment Verification in Progress
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  We received your order request and are awaiting bank confirmation. Once verified, your order status will automatically update.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#7EC151]/10 text-[#7EC151]">
                  <CheckCircle2 className="size-7 text-[#7EC151]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Order Placed Successfully!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Thank you for your order! We&apos;ve sent a confirmation to your email.
                </p>
              </>
            )}
          </div>

          {/* Order Details Snapshot Card */}
          <div className="rounded-sm border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 p-3.5 space-y-3 text-xs">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
              <div>
                <span className="text-muted-foreground text-[11px] block">Order ID</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  #{confirmedOrder.reference || confirmedOrder.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              {confirmedOrder.paymentMethod === 'cod' ? (
                <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                  Cash on Delivery
                </span>
              ) : confirmedOrder.status === 'confirmed' ? (
                <span className="inline-flex items-center gap-1 rounded-sm bg-[#7EC151]/15 px-2 py-0.5 text-[11px] font-bold text-[#7EC151]">
                  ✓ Paid
                </span>
              ) : confirmedOrder.status === 'processing' ? (
                <span className="inline-flex items-center gap-1 rounded-sm bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-600">
                  Processing
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-sm bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                  Pending Verification
                </span>
              )}
            </div>

            {/* Delivery Address */}
            {confirmedOrder.shippingAddress && (
              <div className="space-y-0.5 border-b border-gray-200 dark:border-gray-800 pb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Delivery To
                </span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {confirmedOrder.shippingAddress.fullName}
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-snug">
                  {confirmedOrder.shippingAddress.line1}
                  {confirmedOrder.shippingAddress.line2 ? `, ${confirmedOrder.shippingAddress.line2}` : ''}
                  , {confirmedOrder.shippingAddress.city}, {confirmedOrder.shippingAddress.state} - {confirmedOrder.shippingAddress.postalCode}
                </p>
                {confirmedOrder.shippingAddress.phone && (
                  <p className="text-muted-foreground text-[11px] pt-0.5">
                    Phone: <span className="text-foreground font-medium">{confirmedOrder.shippingAddress.phone}</span>
                  </p>
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Items ({confirmedOrder.items?.length ?? 0})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-gray-800/60">
                {confirmedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between pt-1.5 first:pt-0">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate font-medium text-gray-900 dark:text-gray-100 text-xs">
                        {item.name}
                      </p>
                      {item.variantLabel && (
                        <p className="text-[10px] text-muted-foreground">{item.variantLabel}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right font-bold text-gray-900 dark:text-gray-100 shrink-0">
                      {money(item.unitAmountMinor * item.quantity, confirmedOrder.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-2 space-y-1">
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Subtotal</span>
                <span>{money(confirmedOrder.subtotalMinor, confirmedOrder.currency)}</span>
              </div>
              {confirmedOrder.discountMinor > 0 && (
                <div className="flex justify-between text-[#7EC151] font-medium text-[11px]">
                  <span>Discount {confirmedOrder.couponCode ? `(${confirmedOrder.couponCode})` : ''}</span>
                  <span>−{money(confirmedOrder.discountMinor, confirmedOrder.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Delivery</span>
                <span>{confirmedOrder.shippingMinor > 0 ? money(confirmedOrder.shippingMinor, confirmedOrder.currency) : 'FREE'}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-gray-100 pt-1 border-t border-gray-200/60 dark:border-gray-800/60">
                <span>Total {confirmedOrder.paymentMethod === 'cod' ? 'Payable on Delivery' : confirmedOrder.status === 'confirmed' ? 'Paid' : 'Amount'}</span>
                <span>{money(confirmedOrder.totalMinor, confirmedOrder.currency)}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
            {phase === 'verifying' && (
              <Button
                className="w-full h-11 font-bold text-xs uppercase tracking-wider bg-primary-button hover:bg-primary-button/90 text-white"
                onClick={() => pollOrder(confirmedOrder.id)}
              >
                Re-check Payment Status
              </Button>
            )}
            <Button
              className="w-full h-11 font-bold text-xs uppercase tracking-wider bg-[#e83825] hover:bg-[#d42d1b] text-white"
              onClick={() => router.push('/account?tab=orders')}
            >
              View My Orders
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 font-bold text-xs uppercase tracking-wider"
              onClick={() => router.push('/shop')}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const empty = !cartLoading && (!cart || cart.items.length === 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 lg:pb-12">
      {/* Top Header */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label="Back to Cart"
          >
            <ArrowLeft className="size-4 sm:size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Checkout
              </h1>
              <span className="inline-flex sm:hidden items-center gap-1 rounded-full bg-[#117a7a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#117a7a] dark:text-[#42a3a3]">
                <ShieldCheck className="size-3" /> Secure
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
              Step 2 of 2: Shipping &amp; Payment
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/cart" className="text-[#117a7a] dark:text-[#42a3a3] font-bold flex items-center gap-1 hover:underline">
            <CheckCircle2 className="size-3.5 text-[#117a7a]" /> Cart
          </Link>
          <span>→</span>
          <span className="text-foreground font-bold">Address &amp; Payment</span>
          <span>→</span>
          <span>Confirmation</span>
        </div>
      </div>

      {empty ? (
        <div className="mx-auto max-w-md py-16 text-center">
          <ShoppingBag className="mx-auto size-12 text-muted-foreground mb-3" />
          <h2 className="text-lg font-bold">Your cart is empty</h2>
          <p className="mt-1 text-xs text-muted-foreground">Add items to your cart before proceeding to checkout.</p>
          <Link href="/shop" className="mt-5 inline-block">
            <Button>Explore Shop</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:gap-5 lg:gap-8 lg:grid-cols-[1fr_380px] items-start">
          <div className="space-y-3.5 sm:space-y-5 lg:space-y-6">
            <Card>
              <CardHeader className="p-3.5 sm:px-6 sm:py-4 border-b">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
                  <MapPin className="size-4 text-primary-button" />
                  1. Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
                {addresses && addresses.length > 0 ? (
                  <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
                    {addresses.map((a) => {
                      const isChosen = selected === a.id;
                      return (
                        <div
                          key={a.id}
                          onClick={() => setSelected(a.id)}
                          className={cn(
                            'relative flex flex-col justify-between rounded-sm border p-3.5 sm:p-4 cursor-pointer transition-all',
                            isChosen
                              ? 'border-gray-900 bg-gray-50/70 dark:border-gray-200 dark:bg-gray-900/50'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-800',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="addr"
                              checked={isChosen}
                              onChange={() => setSelected(a.id)}
                              className="mt-0.5 accent-gray-900 dark:accent-gray-100"
                            />
                            <div className="text-xs space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                  {a.fullName}
                                </span>
                                {a.isDefault && (
                                  <span className="rounded-sm bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {a.line1}
                                {a.line2 ? `, ${a.line2}` : ''}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                {a.city}, {a.state} - {a.postalCode}
                              </p>
                              {a.phone && (
                                <p className="text-gray-500 text-[11px] pt-0.5">
                                  Phone: <span className="font-medium text-gray-800 dark:text-gray-200">{a.phone}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-2 text-xs">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {isChosen ? '✓ Delivering here' : ''}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAdding(false);
                                  setEditingAddress(a);
                                }}
                                className="inline-flex items-center gap-1 font-bold text-[#187b7b] hover:underline"
                              >
                                <Edit2 className="size-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAddress(a);
                                }}
                                disabled={deleteAddress.isPending}
                                className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700 hover:underline"
                              >
                                <Trash2 className="size-3" /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No saved addresses found. Please add a shipping address below.</p>
                )}

                {/* Edit Address Form */}
                {editingAddress && (
                  <div className="rounded-sm border border-gray-200 p-4 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30 mt-3">
                    <div className="mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wide">Edit Address</h4>
                    </div>
                    <AddressForm
                      defaultValues={{
                        fullName: editingAddress.fullName,
                        phone: editingAddress.phone ?? '',
                        line1: editingAddress.line1,
                        line2: editingAddress.line2 ?? '',
                        city: editingAddress.city,
                        state: editingAddress.state ?? '',
                        postalCode: editingAddress.postalCode ?? '',
                      }}
                      submitLabel="Save Changes"
                      onSubmit={saveEditedAddress}
                      submitting={updateAddress.isPending}
                      onCancel={() => setEditingAddress(null)}
                    />
                  </div>
                )}

                {/* Add Address Form */}
                {adding ? (
                  <div className="rounded-sm border border-gray-200 p-4 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30 mt-3">
                    <div className="mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wide">Add New Address</h4>
                    </div>
                    <AddressForm
                      onSubmit={saveNewAddress}
                      submitting={createAddress.isPending}
                      onCancel={() => setAdding(false)}
                    />
                  </div>
                ) : (
                  !editingAddress && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold text-xs uppercase tracking-wide mt-2"
                      onClick={() => {
                        setEditingAddress(null);
                        setAdding(true);
                      }}
                    >
                      + Add New Address
                    </Button>
                  )
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3.5 sm:px-6 sm:py-4 border-b">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
                  <PackageCheck className="size-4 text-primary-button" />
                  2. Order Items ({cart?.items.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 divide-y divide-gray-100 dark:divide-gray-800">
                {cart?.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 sm:gap-4 py-3 sm:py-3.5 first:pt-0 last:pb-0">
                    <div className="relative size-12 sm:size-16 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {it.imageUrl && (
                        <Image
                          src={mediaSrc(it.imageUrl)}
                          alt={it.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs xs:text-sm font-bold text-gray-900 dark:text-gray-100">
                        {fillTemplate(it.name, it.customVariables)}
                      </p>
                      {it.label && (
                        <p className="text-[10px] xs:text-xs text-muted-foreground font-medium truncate mt-0.5">{it.label}</p>
                      )}
                      <p className="text-[10px] xs:text-xs text-muted-foreground mt-1">
                        Qty: <span className="font-semibold text-foreground">{it.quantity}</span> × {money(it.unitAmountMinor, cart.currency)}
                      </p>
                    </div>
                    <div className="text-right text-xs xs:text-sm font-bold text-gray-900 dark:text-gray-100 shrink-0 pl-2">
                      {money(it.lineTotalMinor, cart.currency)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 3. Payment Method */}
            <Card>
              <CardHeader className="p-3.5 sm:px-6 sm:py-4 border-b">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
                  <CreditCard className="size-4 text-primary-button" />
                  3. Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-6 space-y-3">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div
                    onClick={() => setPaymentMethod('prepaid')}
                    className={cn(
                      'relative flex items-center justify-between rounded-sm border p-3.5 sm:p-4 cursor-pointer transition-all',
                      paymentMethod === 'prepaid'
                        ? 'border-gray-900 bg-gray-50/70 dark:border-gray-200 dark:bg-gray-900/50 ring-1 ring-gray-900 dark:ring-gray-200'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-800',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="pm"
                        checked={paymentMethod === 'prepaid'}
                        onChange={() => setPaymentMethod('prepaid')}
                        className="accent-gray-900 dark:accent-gray-100"
                      />
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Online / Prepaid</p>
                        <p className="text-[11px] text-muted-foreground">UPI, Cards, NetBanking, Wallets</p>
                      </div>
                    </div>
                  </div>

                  {codEnabled && (
                    <div
                      onClick={() => setPaymentMethod('cod')}
                      className={cn(
                        'relative flex items-center justify-between rounded-sm border p-3.5 sm:p-4 cursor-pointer transition-all',
                        paymentMethod === 'cod'
                          ? 'border-gray-900 bg-gray-50/70 dark:border-gray-200 dark:bg-gray-900/50 ring-1 ring-gray-900 dark:ring-gray-200'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-800',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="pm"
                          checked={paymentMethod === 'cod'}
                          onChange={() => setPaymentMethod('cod')}
                          className="accent-gray-900 dark:accent-gray-100"
                        />
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Cash on Delivery</p>
                            <span className="rounded-sm bg-emerald-500/15 text-emerald-600 px-1.5 py-0.2 text-[10px] font-bold">
                              COD
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Pay in cash when package arrives</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3.5 sm:space-y-4 lg:sticky lg:top-20">
            <Card>
              <CardContent className="p-3.5 sm:p-5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  <Tag className="size-3.5 text-primary-button" />
                  Coupons &amp; Offers
                </div>

                {coupon ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-[#117a7a]/10 dark:bg-[#117a7a]/20 border border-[#117a7a]/30 dark:border-[#117a7a]/40 rounded-sm text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-[#117a7a]" />
                        <div>
                          <p className="font-bold text-[#117a7a] dark:text-[#42a3a3] uppercase">{coupon.code}</p>
                          <p className="text-[11px] text-[#117a7a] dark:text-[#42a3a3]">
                            Saved {money(coupon.discountMinor, cart?.currency ?? 'inr')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-xs font-bold text-brand uppercase hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    {availableCoupons && availableCoupons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCouponsModalOpen(true)}
                        className="flex items-center justify-between w-full p-2 rounded-sm bg-primary-button/5 border border-primary-button/20 hover:bg-primary-button/10 transition-colors text-left text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-3.5 text-primary-button" />
                          <span className="font-medium text-foreground">
                            {availableCoupons.length} {availableCoupons.length === 1 ? 'coupon is' : 'coupons are'} available for you
                          </span>
                        </div>
                        <ChevronRight className="size-4 text-primary-button" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Coupon code"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError(null);
                        }}
                        className="h-9 uppercase text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            applyCoupon();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={applyCoupon}
                        disabled={validateCoupon.isPending || !couponInput.trim()}
                        className="h-9 px-4 font-bold text-xs uppercase"
                      >
                        {validateCoupon.isPending ? 'Applying…' : 'Apply'}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-[#e84800] font-medium">{couponError}</p>
                    )}

                    {/* Available coupons trigger banner */}
                    {availableCoupons && availableCoupons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCouponsModalOpen(true)}
                        className="flex items-center justify-between w-full p-2.5 rounded-sm bg-primary-button/5 border border-primary-button/20 hover:bg-primary-button/10 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-3.5 text-primary-button" />
                          <span className="text-xs font-medium text-foreground">
                            {availableCoupons.length} {availableCoupons.length === 1 ? 'coupon is' : 'coupons are'} available for you
                          </span>
                        </div>
                        <ChevronRight className="size-4 text-primary-button" />
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="h-fit lg:sticky lg:top-20">
              <CardHeader className="p-3.5 sm:px-6 sm:py-4 border-b">
                <CardTitle className="text-sm sm:text-base font-bold">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 p-3.5 sm:p-6">
                <div className="space-y-2.5 text-xs sm:text-sm">
                  {savings > 0 && (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total MRP</span>
                        <span className="line-through">{money(mrpTotal, cart?.currency ?? 'inr')}</span>
                      </div>
                      <div className="flex justify-between text-[#187b7b] dark:text-[#42a3a3] font-medium">
                        <span>Product Discount (You save)</span>
                        <span>−{money(savings, cart?.currency ?? 'inr')}</span>
                      </div>
                    </>
                  )}
                  <Row label="Cart Subtotal" value={money(subtotal, cart?.currency ?? 'inr')} />
                  {discount > 0 && (
                    <div className="flex justify-between text-[#7EC151] font-medium">
                      <span>Coupon Discount ({coupon?.code})</span>
                      <span>−{money(discount, cart?.currency ?? 'inr')}</span>
                    </div>
                  )}
                  <Row
                    label="Delivery Charges"
                    value={
                      shippingMinor === 0 ? (
                        <span className="text-[#7EC151] font-bold">FREE</span>
                      ) : (
                        money(shippingMinor, cart?.currency ?? 'inr')
                      )
                    }
                  />
                </div>

                <Separator />

                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-gray-100">
                  <span>Total Amount</span>
                  <span>{money(estimatedTotal, cart?.currency ?? 'inr')}</span>
                </div>

                {checkoutError && (
                  <div className="rounded-sm bg-[#e84800]/10 border border-[#e84800]/20 p-2.5 text-xs text-[#e84800] font-medium text-center">
                    {checkoutError}
                  </div>
                )}

                {/* Desktop Pay CTA */}
                <div className="hidden lg:block space-y-3 pt-2">
                  <Button
                    variant="primary"
                    className="w-full h-12 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                    size="lg"
                    disabled={!selected || phase === 'paying'}
                    onClick={pay}
                  >
                    <CreditCard className="size-4" />
                    {phase === 'paying'
                      ? 'Processing…'
                      : paymentMethod === 'cod'
                      ? `Place COD Order (${money(estimatedTotal, cart?.currency ?? 'inr')})`
                      : `Pay ${money(estimatedTotal, cart?.currency ?? 'inr')}`}
                  </Button>

                  <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground font-medium">
                    <ShieldCheck className="size-4 text-[#117a7a]" />
                    <span>100% Safe &amp; Encrypted</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Mobile-Only Fixed Bottom Action Bar with Price Breakdown */}
      {phase === 'form' && !empty && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 dark:bg-gray-950/95 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
          {checkoutError && (
            <div className="bg-[#e84800]/10 border-b border-[#e84800]/20 px-4 py-2 text-xs text-[#e84800] font-medium text-center">
              {checkoutError}
            </div>
          )}
          {/* Expandable Price Breakdown Tray */}
          {breakdownOpen && (
            <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-900/95 p-4 sm:p-5 animate-in slide-in-from-bottom-2 duration-200 max-h-[60vh] overflow-y-auto">
              <div className="mx-auto max-w-6xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-200 dark:border-gray-800">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-foreground">
                    Payment Summary
                  </span>
                  <button
                    type="button"
                    onClick={() => setBreakdownOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                    aria-label="Close breakdown"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total MRP ({cart?.items?.length ?? 0} {cart?.items?.length === 1 ? 'item' : 'items'})</span>
                  <span className="text-muted-foreground">{money(mrpTotal, cart?.currency ?? 'inr')}</span>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between text-[#187b7b] dark:text-[#42a3a3] font-medium">
                    <span>Product Discount</span>
                    <span>−{money(savings, cart?.currency ?? 'inr')}</span>
                  </div>
                )}

                {coupon && coupon.discountMinor > 0 && (
                  <div className="flex justify-between text-[#7EC151] font-medium">
                    <span>Coupon ({coupon.code})</span>
                    <span>−{money(coupon.discountMinor, cart?.currency ?? 'inr')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Charges</span>
                  <span className={shippingMinor === 0 ? 'font-bold text-[#7EC151]' : 'font-medium text-foreground'}>
                    {shippingMinor === 0 ? 'FREE' : money(shippingMinor, cart?.currency ?? 'inr')}
                  </span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-2 flex justify-between font-bold text-sm text-foreground">
                  <span>Total Payable</span>
                  <span>{money(estimatedTotal, cart?.currency ?? 'inr')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setBreakdownOpen((v) => !v)}
              className="flex flex-col text-left group cursor-pointer shrink-0"
            >
              <div className="flex items-center gap-1 text-[11px] text-[#187b7b] dark:text-[#42a3a3] font-semibold">
                <span>Price Details</span>
                {breakdownOpen ? (
                  <ChevronDown className="size-3 transition-transform" />
                ) : (
                  <ChevronUp className="size-3 transition-transform" />
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-foreground">
                  {money(estimatedTotal, cart?.currency ?? 'inr')}
                </span>
                {savings > 0 && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    {money(mrpTotal, cart?.currency ?? 'inr')}
                  </span>
                )}
              </div>
            </button>

            <Button
              variant="primary"
              className="flex-1 max-w-[240px] h-11 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
              size="lg"
              disabled={!selected || checkout.isPending}
              onClick={pay}
            >
              {checkout.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <CreditCard className="size-4" />
                  <span>
                    {!selected
                      ? 'Select Address'
                      : paymentMethod === 'cod'
                      ? 'Place COD Order'
                      : `Pay ${money(estimatedTotal, cart?.currency ?? 'inr')}`}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal (Dialog on Desktop, Bottom Drawer on Mobile) */}
      {isDesktop ? (
        <Dialog
          open={phase === 'confirming' || phase === 'done'}
          onOpenChange={(open) => {
            if (!open && phase === 'done') {
              router.push('/account?tab=orders');
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>Order Status</DialogTitle>
              <DialogDescription>Order confirmation status and summary</DialogDescription>
            </DialogHeader>
            {modalBody}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer
          open={phase === 'confirming' || phase === 'done'}
          onOpenChange={(open) => {
            if (!open && phase === 'done') {
              router.push('/account?tab=orders');
            }
          }}
        >
          <DrawerContent className="px-5 pb-8 rounded-t-2xl max-h-[88vh] overflow-y-auto">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Order Status</DrawerTitle>
              <DrawerDescription>Order confirmation status and summary</DrawerDescription>
            </DrawerHeader>
            {modalBody}
          </DrawerContent>
        </Drawer>
      )}

      {/* Available Coupons Drawer/Dialog */}
      <AvailableCouponsModal
        open={couponsModalOpen}
        onOpenChange={setCouponsModalOpen}
        subtotalMinor={subtotal}
        appliedCode={coupon?.code}
        currency={cart?.currency ?? 'inr'}
        onSelectCoupon={async (code) => {
          setCouponInput(code);
          setCouponError(null);
          try {
            const res = await validateCoupon.mutateAsync({
              code,
              subtotalMinor: subtotal,
            });
            setCoupon({ code: res.code, discountMinor: res.discountMinor });
            router.replace(`/checkout?coupon=${encodeURIComponent(res.code)}`, { scroll: false });
            toast.success(`Coupon ${res.code} applied!`);
          } catch (e) {
            setCoupon(null);
            const msg = (e as Error).message || 'Invalid coupon code';
            setCouponError(msg);
            toast.error(msg);
          }
        }}
        onRemoveCoupon={removeCoupon}
      />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', muted ? 'text-muted-foreground' : 'text-foreground')}>{value}</span>
    </div>
  );
}
