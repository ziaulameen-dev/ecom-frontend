'use client';

import { CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Minus, Plus, ShoppingBag, Sparkles, Tag, Trash2, Truck, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthModal, useMe } from '@/features/auth';
import { useCoupons } from '@/features/account';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart';
import { AvailableCouponsModal, useValidateCoupon } from '@/features/checkout';
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
  const { data: availableCoupons } = useCoupons();

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discountMinor: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponsModalOpen, setCouponsModalOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

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
        <Link href="/shop"><Button variant="primary" className="mt-6">Continue shopping</Button></Link>
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 lg:pb-12">
      {/* Top Header */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-primary-button/10 text-primary-button shrink-0">
            <ShoppingBag className="size-4 sm:size-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Your Cart
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
              {cart.items.reduce((s, it) => s + it.quantity, 0)}{' '}
              {cart.items.reduce((s, it) => s + it.quantity, 0) === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
        </div>

        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-button hover:underline transition-colors"
        >
          <span>Continue Shopping</span>
          <span className="text-sm">→</span>
        </Link>
      </div>

      <div className="grid gap-3.5 sm:gap-5 lg:gap-8 lg:grid-cols-[1fr_360px] items-start">
        <div className="space-y-3 sm:space-y-3.5">
          {cart.items.map((it) => (
            <Card key={it.id} className="overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex gap-3 sm:gap-4">
                  <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-sm bg-muted">
                    {it.imageUrl && (
                      <Image
                        src={mediaSrc(it.imageUrl)}
                        alt={it.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 80px, 96px"
                      />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 pr-1">
                        <div className="truncate font-bold text-xs xs:text-sm text-foreground">
                          {fillTemplate(it.name, it.customVariables)}
                        </div>
                        {it.label && (
                          <div className="text-[11px] xs:text-xs text-muted-foreground truncate mt-0.5">{it.label}</div>
                        )}
                        {!it.available && (
                          <div className="text-[11px] text-destructive mt-0.5 font-medium">Unavailable</div>
                        )}
                      </div>

                      {/* Remove item button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => remove.mutate(it.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      {/* Quantity stepper */}
                      <div className="flex items-center rounded-sm border shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 sm:size-8"
                          onClick={() => update.mutate({ itemId: it.id, quantity: it.quantity - 1 })}
                        >
                          <Minus className="size-3 sm:size-3.5" />
                        </Button>
                        <span className="w-6 sm:w-8 text-center text-xs xs:text-sm tabular-nums font-semibold">
                          {it.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 sm:size-8"
                          disabled={it.quantity >= it.stock}
                          onClick={() => update.mutate({ itemId: it.id, quantity: it.quantity + 1 })}
                        >
                          <Plus className="size-3 sm:size-3.5" />
                        </Button>
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm sm:text-base text-foreground">
                          {money(it.lineTotalMinor, cart.currency)}
                        </div>
                        {it.compareAtMinor && (
                          <div className="text-[10px] sm:text-xs text-muted-foreground line-through">
                            {money(it.compareAtMinor * it.quantity, cart.currency)}
                          </div>
                        )}
                        {it.quantity > 1 && (
                          <div className="text-[10px] sm:text-[11px] text-muted-foreground">
                            {money(it.unitAmountMinor, cart.currency)} each
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3 sm:space-y-3.5">
          {/* Coupon Code Section */}
          <Card>
            <CardContent className="p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                <Tag className="size-3.5 text-primary-button" />
                Apply Coupon
              </div>

              {coupon ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#117a7a]/10 dark:bg-[#117a7a]/20 border border-[#117a7a]/30 dark:border-[#117a7a]/40 rounded-sm text-xs">
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

          {/* Free shipping encouragement bar */}
          {freeTier && (
            <div className="rounded-sm border border-[#117a7a]/25 bg-[#117a7a]/10 dark:bg-[#117a7a]/15 p-3 text-xs space-y-1.5">
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
            <CardContent className="space-y-3.5 p-3.5 sm:p-5">
              <div className="border-b pb-2.5 font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Price Details
              </div>

              <div className="space-y-2.5">
                {savingsMinor > 0 ? (
                  <>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Total MRP</span>
                      <span className="text-muted-foreground line-through">
                        {money(mrpTotalMinor, cart.currency)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm text-[#187b7b] dark:text-[#42a3a3] font-medium">
                      <span>Product Discount (You save)</span>
                      <span>−{money(savingsMinor, cart.currency)}</span>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold text-foreground">{money(cart.subtotalMinor, cart.currency)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{money(cart.subtotalMinor, cart.currency)}</span>
                  </div>
                )}

                {coupon && (
                  <div className="flex justify-between text-xs sm:text-sm text-[#7EC151] font-medium">
                    <span>Coupon ({coupon.code})</span>
                    <span>−{money(coupon.discountMinor, cart.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Delivery Charges</span>
                  <span className={shippingMinor === 0 ? 'font-bold text-[#7EC151]' : 'font-medium text-foreground'}>
                    {shippingMinor === 0 ? 'FREE' : money(shippingMinor, cart.currency)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-sm sm:text-base font-bold text-foreground pt-1">
                  <span>Total Amount</span>
                  <span>{money(finalTotalMinor, cart.currency)}</span>
                </div>
              </div>

              {/* Desktop Place Order CTA */}
              <div className="hidden lg:block space-y-3 pt-2">
                <Separator />
                {me ? (
                  <Link href={checkoutHref} className="block">
                    <Button variant="primary" className="w-full h-11 font-bold text-xs uppercase tracking-wider shadow-sm" size="lg">
                      Place Order
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full h-11 font-bold text-xs uppercase tracking-wider shadow-sm"
                    size="lg"
                    onClick={() => openLogin(checkoutHref)}
                  >
                    Login to Place Order
                  </Button>
                )}
                <Link href="/shop" className="block text-center text-xs text-muted-foreground hover:text-foreground">
                  Continue shopping
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile-Only Fixed Bottom Action Bar with Price Breakdown */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 dark:bg-gray-950/95 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
        {/* Expandable Price Breakdown Tray */}
        {breakdownOpen && (
          <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-900/95 p-4 sm:p-5 animate-in slide-in-from-bottom-2 duration-200 max-h-[60vh] overflow-y-auto">
            <div className="mx-auto max-w-6xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-200 dark:border-gray-800">
                <span className="font-bold uppercase tracking-wider text-[11px] text-foreground">
                  Price Details
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
                <span className="text-muted-foreground">Total MRP ({cart.items.reduce((s, it) => s + it.quantity, 0)} {cart.items.reduce((s, it) => s + it.quantity, 0) === 1 ? 'item' : 'items'})</span>
                <span className="text-muted-foreground">{money(mrpTotalMinor, cart.currency)}</span>
              </div>

              {savingsMinor > 0 && (
                <div className="flex justify-between text-[#187b7b] dark:text-[#42a3a3] font-medium">
                  <span>Product Discount</span>
                  <span>−{money(savingsMinor, cart.currency)}</span>
                </div>
              )}

              {coupon && (
                <div className="flex justify-between text-[#7EC151] font-medium">
                  <span>Coupon ({coupon.code})</span>
                  <span>−{money(coupon.discountMinor, cart.currency)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Charges</span>
                <span className={shippingMinor === 0 ? 'font-bold text-[#7EC151]' : 'font-medium text-foreground'}>
                  {shippingMinor === 0 ? 'FREE' : money(shippingMinor, cart.currency)}
                </span>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-2 flex justify-between font-bold text-sm text-foreground">
                <span>Total Amount</span>
                <span>{money(finalTotalMinor, cart.currency)}</span>
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
                {money(finalTotalMinor, cart.currency)}
              </span>
              {savingsMinor > 0 && (
                <span className="text-[10px] text-muted-foreground line-through">
                  {money(mrpTotalMinor, cart.currency)}
                </span>
              )}
            </div>
          </button>

          {me ? (
            <Link href={checkoutHref} className="flex-1 max-w-[240px]">
              <Button
                variant="primary"
                className="w-full h-11 font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5"
                size="lg"
              >
                <span>Place Order</span>
                <span className="text-sm">→</span>
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              className="flex-1 max-w-[240px] h-11 font-bold text-xs uppercase tracking-wider shadow-sm"
              size="lg"
              onClick={() => openLogin(checkoutHref)}
            >
              Login to Place Order
            </Button>
          )}
        </div>
      </div>

      <AvailableCouponsModal
        open={couponsModalOpen}
        onOpenChange={setCouponsModalOpen}
        subtotalMinor={subtotal}
        appliedCode={coupon?.code}
        currency={cart.currency}
        onSelectCoupon={async (code) => {
          setCouponInput(code);
          setCouponError(null);
          try {
            const res = await validateCoupon.mutateAsync({
              code,
              subtotalMinor: subtotal,
            });
            setCoupon({ code: res.code, discountMinor: res.discountMinor });
            toast.success(`Coupon ${res.code} applied!`);
          } catch (e) {
            setCoupon(null);
            setCouponError((e as Error).message);
            toast.error((e as Error).message || 'Invalid coupon');
          }
        }}
        onRemoveCoupon={removeCoupon}
      />
    </div>
  );
}
