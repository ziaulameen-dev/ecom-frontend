'use client';

import { CheckCircle2, Minus, Plus, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthModal, useMe } from '@/features/auth';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart';
import { useValidateCoupon } from '@/features/checkout';
import { useShippingRate } from '@/features/admin';
import { fillTemplate } from '@/components/rich-text';
import { mediaSrc, money } from '@/lib/utils';

export default function CartPage() {
  const { data: cart, isLoading } = useCart();
  const { data: me } = useMe();
  const openLogin = useAuthModal((s) => s.openLogin);
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const validateCoupon = useValidateCoupon();
  const subtotal = cart?.subtotalMinor ?? 0;
  const { data: shippingData } = useShippingRate(subtotal);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discountMinor: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-24 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-lg sm:text-2xl font-semibold">Your cart is empty</h1>
        <Link href="/shop"><Button className="mt-6">Continue shopping</Button></Link>
      </div>
    );
  }

  // Sum of original MRPs across all items
  const mrpTotalMinor = cart.items.reduce(
    (sum, it) => sum + (it.compareAtMinor ?? it.unitAmountMinor) * it.quantity,
    0,
  );

  // Total off the regular price across on-offer lines.
  const savingsMinor = cart.items.reduce(
    (sum, it) => sum + (it.compareAtMinor ? Math.max(0, it.compareAtMinor - it.unitAmountMinor) * it.quantity : 0),
    0,
  );

  const shippingMinor = shippingData?.amountMinor ?? 0;
  const discountMinor = coupon?.discountMinor ?? 0;
  const finalTotalMinor = Math.max(0, subtotal - discountMinor + shippingMinor);

  const freeTier = shippingData?.tiers?.find((t) => t.amountMinor === 0 && t.minSubtotalMinor > 0);
  const diffToFree = freeTier ? Math.max(0, freeTier.minSubtotalMinor - subtotal) : 0;
  const progressPercent =
    freeTier && freeTier.minSubtotalMinor > 0
      ? Math.min(100, Math.round((subtotal / freeTier.minSubtotalMinor) * 100))
      : 100;

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError(null);
    try {
      const res = await validateCoupon.mutateAsync({
        code: couponInput.trim(),
        subtotalMinor: subtotal,
      });
      setCoupon({ code: res.code, discountMinor: res.discountMinor });
    } catch (e) {
      setCoupon(null);
      setCouponError((e as Error).message);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput('');
    setCouponError(null);
  }

  const checkoutHref = coupon
    ? `/checkout?coupon=${encodeURIComponent(coupon.code)}`
    : '/checkout';

  return (
    <div className="mx-auto max-w-[1500px] px-2.5 sm:px-6 lg:px-8 py-4 sm:py-10">
      <h1 className="text-lg sm:text-2xl font-semibold">Your cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {cart.items.map((it) => (
            <Card key={it.id} className="overflow-hidden">
              <CardContent className="relative flex gap-2.5 sm:gap-4 p-2.5 sm:p-4">
                {/* Remove — pinned to the card's top-right corner. */}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove item"
                  className="absolute right-1 top-1 size-7 sm:size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => remove.mutate(it.id)}
                >
                  <Trash2 className="size-3.5 sm:size-4" />
                </Button>

                <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xs bg-muted">
                  {it.imageUrl && (
                    <Image
                      src={mediaSrc(it.imageUrl)}
                      alt={it.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, 80px"
                    />
                  )}
                </div>

                {/* Details + controls: stacked on mobile, single row from sm up. */}
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 xs:gap-2 pr-5 sm:flex-row sm:items-center sm:gap-4 sm:pr-7">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-xs xs:text-sm">
                      {fillTemplate(it.name, it.customVariables)}
                    </div>
                    {it.label && (
                      <div className="text-[10px] xs:text-xs text-muted-foreground truncate">{it.label}</div>
                    )}
                    {!it.available && (
                      <div className="text-[10px] xs:text-xs text-destructive mt-0.5">Unavailable</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1.5 xs:gap-2 sm:justify-end sm:gap-4">
                    <div className="flex items-center rounded-xs border shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 xs:size-7 sm:size-8"
                        onClick={() => update.mutate({ itemId: it.id, quantity: it.quantity - 1 })}
                      >
                        <Minus className="size-2.5 xs:size-3 sm:size-4" />
                      </Button>
                      <span className="w-5 xs:w-6 sm:w-8 text-center text-xs xs:text-sm tabular-nums font-medium">
                        {it.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 xs:size-7 sm:size-8"
                        disabled={it.quantity >= it.stock}
                        onClick={() => update.mutate({ itemId: it.id, quantity: it.quantity + 1 })}
                      >
                        <Plus className="size-2.5 xs:size-3 sm:size-4" />
                      </Button>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-semibold text-xs xs:text-sm sm:text-base">
                        {money(it.lineTotalMinor, cart.currency)}
                      </div>
                      {it.compareAtMinor && (
                        <div className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground line-through">
                          {money(it.compareAtMinor * it.quantity, cart.currency)}
                        </div>
                      )}
                      {it.quantity > 1 && (
                        <div className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground">
                          {money(it.unitAmountMinor, cart.currency)} each
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {/* Coupon Code Section */}
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                <Tag className="size-3.5 text-primary-button" />
                Apply Coupon
              </div>

              {coupon ? (
                <div className="flex items-center justify-between p-3 bg-[#117a7a]/10 dark:bg-[#117a7a]/20 border border-[#117a7a]/30 dark:border-[#117a7a]/40 rounded-xs text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#117a7a]" />
                    <div>
                      <p className="font-bold text-[#117a7a] dark:text-[#42a3a3] uppercase">{coupon.code}</p>
                      <p className="text-[11px] text-[#117a7a] dark:text-[#42a3a3]">
                        Saved {money(coupon.discountMinor, cart.currency)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-medium text-brand uppercase hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter coupon code"
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
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!couponInput.trim() || validateCoupon.isPending}
                      onClick={applyCoupon}
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

          {/* Free shipping encouragement bar */}
          {freeTier && (
            <div className="rounded-xs border border-[#117a7a]/25 bg-[#117a7a]/10 dark:bg-[#117a7a]/15 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5 text-[#117a7a] dark:text-[#42a3a3]">
                  <Truck className="size-4 text-[#117a7a]" />
                  {diffToFree > 0 ? (
                    <>
                      Add <strong className="font-bold text-foreground">{money(diffToFree, cart.currency)}</strong> more for{' '}
                      <strong>FREE Delivery</strong>
                    </>
                  ) : (
                    <span className="font-bold text-[#7EC151]">🎉 You unlocked FREE Delivery!</span>
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#117a7a]/20 overflow-hidden">
                <div
                  className="h-full bg-[#7EC151] transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Order Summary Card */}
          <Card className="h-fit lg:sticky lg:top-20">
            <CardContent className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-6">
              <div className="space-y-2">
                {savingsMinor > 0 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total MRP</span>
                      <span className="text-muted-foreground line-through">
                        {money(mrpTotalMinor, cart.currency)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm text-primary-button font-medium">
                      <span>Product Discount (You save)</span>
                      <span>−{money(savingsMinor, cart.currency)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold text-foreground">{money(cart.subtotalMinor, cart.currency)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{money(cart.subtotalMinor, cart.currency)}</span>
                  </div>
                )}

                {coupon && (
                  <div className="flex justify-between text-sm text-[#7EC151] font-medium">
                    <span>Coupon ({coupon.code})</span>
                    <span>−{money(coupon.discountMinor, cart.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Charges</span>
                  <span className={shippingMinor === 0 ? 'font-bold text-[#7EC151]' : 'font-medium text-foreground'}>
                    {shippingMinor === 0 ? 'FREE' : money(shippingMinor, cart.currency)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-base font-bold text-foreground pt-1">
                  <span>Total</span>
                  <span>{money(finalTotalMinor, cart.currency)}</span>
                </div>
              </div>
              <Separator />

              {me ? (
                <Link href={checkoutHref} className="block">
                  <Button className="w-full h-11 font-bold text-xs uppercase tracking-wider" size="lg">
                    Place Order
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full h-11 font-bold text-xs uppercase tracking-wider"
                  size="lg"
                  onClick={() => openLogin(checkoutHref)}
                >
                  Login to Place Order
                </Button>
              )}
              <Link href="/shop" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                Continue shopping
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
