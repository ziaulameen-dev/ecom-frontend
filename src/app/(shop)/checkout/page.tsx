'use client';

import { load } from '@cashfreepayments/cashfree-js';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Edit2,
  Loader2,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
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
  useCreateAddress,
  useUpdateAddress,
  type AddressInput,
} from '@/features/account';
import { AddressForm } from '@/features/account/components/address-form';
import { useCheckout, useValidateCoupon } from '@/features/checkout';
import { useShippingRate } from '@/features/admin';
import { api } from '@/lib/api-client';
import type { Address, Order } from '@/lib/types';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn, mediaSrc, money } from '@/lib/utils';

type Phase = 'form' | 'paying' | 'confirming' | 'done';

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
  const validateCoupon = useValidateCoupon();
  const checkout = useCheckout();

  const [selected, setSelected] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discountMinor: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [status, setStatus] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

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
      if (o?.status === 'paid') {
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
    if (finalOrder) {
      setConfirmedOrder(finalOrder);
      setPhase('done');
      setStatus('Order Placed Successfully!');
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    } else {
      setPhase('form');
      setCheckoutError('Payment received — your order will appear shortly.');
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
      });
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
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#7EC151]/10 text-[#7EC151]">
              <CheckCircle2 className="size-7 text-[#7EC151]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Order Placed Successfully!
            </h3>
            <p className="text-xs text-muted-foreground">
              Thank you for your order! We&apos;ve sent a confirmation to your email.
            </p>
          </div>

          {/* Order Details Snapshot Card */}
          <div className="rounded-xs border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 p-3.5 space-y-3 text-xs">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
              <div>
                <span className="text-muted-foreground text-[11px] block">Order ID</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  #{confirmedOrder.reference || confirmedOrder.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-xs bg-[#7EC151]/15 px-2 py-0.5 text-[11px] font-bold text-[#7EC151]">
                ✓ Paid
              </span>
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
                <span>Total Paid</span>
                <span>{money(confirmedOrder.totalMinor, confirmedOrder.currency)}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
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
    <div className="mx-auto max-w-[1500px] px-2.5 sm:px-6 lg:px-8 py-4 sm:py-10">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1.5"
          >
            <ArrowLeft className="size-3.5" /> Back to Cart
          </Link>
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Checkout
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="text-[#117a7a] dark:text-[#42a3a3] font-bold flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-[#117a7a]" /> Cart
          </span>
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
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-3 sm:pb-3 sm:px-6 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <MapPin className="size-4 text-primary-button" />
                  1. Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:pt-4 sm:px-6 space-y-3">
                {addresses && addresses.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((a) => {
                      const isChosen = selected === a.id;
                      return (
                        <div
                          key={a.id}
                          onClick={() => setSelected(a.id)}
                          className={cn(
                            'relative flex flex-col justify-between rounded-xs border p-3.5 cursor-pointer transition-all',
                            isChosen
                              ? 'border-gray-900 bg-gray-50/70 dark:border-gray-200 dark:bg-gray-900/50'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-800',
                          )}
                        >
                          <div className="flex items-start gap-2.5">
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
                                  <span className="rounded-xs bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
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
                  <div className="rounded-xs border border-gray-200 p-4 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30 mt-3">
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
                  <div className="rounded-xs border border-gray-200 p-4 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30 mt-3">
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
              <CardHeader className="p-3 sm:pb-3 sm:px-6 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <PackageCheck className="size-4 text-primary-button" />
                  2. Order Items ({cart?.items.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:pt-4 sm:px-6 divide-y divide-gray-100 dark:divide-gray-800">
                {cart?.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2.5 sm:gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="relative size-12 sm:size-14 shrink-0 overflow-hidden rounded-xs bg-muted">
                      {it.imageUrl && (
                        <Image
                          src={mediaSrc(it.imageUrl)}
                          alt={it.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs xs:text-sm font-bold text-gray-900 dark:text-gray-100">
                        {fillTemplate(it.name, it.customVariables)}
                      </p>
                      {it.label && (
                        <p className="text-[10px] xs:text-xs text-muted-foreground font-medium truncate">{it.label}</p>
                      )}
                      <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5">
                        Qty: <span className="font-semibold text-foreground">{it.quantity}</span> × {money(it.unitAmountMinor, cart.currency)}
                      </p>
                    </div>
                    <div className="text-right text-xs xs:text-sm font-bold text-gray-900 dark:text-gray-100 shrink-0 pl-1">
                      {money(it.lineTotalMinor, cart.currency)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20">
            <Card>
              <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  <Tag className="size-3.5 text-primary-button" />
                  Coupons &amp; Offers
                </div>

                {coupon ? (
                  <div className="flex items-center justify-between p-3 bg-[#117a7a]/10 dark:bg-[#117a7a]/20 border border-[#117a7a]/30 dark:border-[#117a7a]/40 rounded-xs text-xs">
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
                ) : (
                  <div className="space-y-1.5">
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
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:pb-3 sm:px-6 border-b">
                <CardTitle className="text-base font-bold">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-6">
                <div className="space-y-2 text-xs sm:text-sm">
                  {savings > 0 && (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total MRP</span>
                        <span className="line-through">{money(mrpTotal, cart?.currency ?? 'inr')}</span>
                      </div>
                      <div className="flex justify-between text-primary-button font-medium">
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
                  <div className="rounded-xs bg-[#e84800]/10 border border-[#e84800]/20 p-2.5 text-xs text-[#e84800] font-medium text-center">
                    {checkoutError}
                  </div>
                )}

                <Button
                  className="w-full h-12 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-primary-button hover:bg-primary-button/90 text-white shadow-sm"
                  size="lg"
                  disabled={!selected || phase === 'paying'}
                  onClick={pay}
                >
                  <CreditCard className="size-4" />
                  {phase === 'paying' ? 'Processing Payment…' : `Pay ${money(estimatedTotal, cart?.currency ?? 'inr')}`}
                </Button>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground font-medium">
                  <ShieldCheck className="size-4 text-[#117a7a]" />
                  <span>100% Safe &amp; Encrypted Payment</span>
                </div>
              </CardContent>
            </Card>
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
          <DrawerContent className="px-5 pt-3 pb-8 rounded-t-2xl max-h-[88vh] overflow-y-auto">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Order Status</DrawerTitle>
              <DrawerDescription>Order confirmation status and summary</DrawerDescription>
            </DrawerHeader>
            {modalBody}
          </DrawerContent>
        </Drawer>
      )}
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
