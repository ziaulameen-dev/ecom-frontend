'use client';

import {
  AlertCircle, BadgePercent, Ban, Check, CheckCircle2, ChevronRight, Clock, Copy, Gift, ImagePlus, LifeBuoy, LogOut, Mail,
  MapPin, Package, Percent, RotateCcw, ShoppingBag, Sparkles, Star, Tag, Truck, User as UserIcon, X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthImage } from '@/components/auth-image';
import { confirm } from '@/components/confirm-dialog';
import { RatingStars } from '@/components/rating-stars';
import { ValueProps } from '@/components/value-props';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import { useMediaQuery } from '@/lib/use-media-query';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useUploadProductImage } from '@/features/admin';
import { useAuthModal, useLogout, useMe } from '@/features/auth';
import {
  useAddresses,
  useCancelOrder,
  useCoupons,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useMyOrders,
  useMyReviews,
  useMyReturns,
  useRequestEmailChange,
  useReviewable,
  useSubmitReview,
  useUpdateProfile,
  useVerifyNewEmail,
  useVerifyOldEmail,
  type AddressInput,
} from '@/features/account';
import { AddressForm } from '@/features/account/components/address-form';
import { ReturnForm } from '@/features/account/components/return-form';
import { useProduct } from '@/features/catalog';
import type { ActiveCoupon, AdminReturn, Order, OrderStatus, ReviewableProduct, User } from '@/lib/types';
import { cn, formatDate, mediaSrc, money } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: 'Personal Information', icon: UserIcon },
  { key: 'orders', label: 'Manage Orders', icon: Package },
  { key: 'addresses', label: 'Manage Address', icon: MapPin },
  { key: 'coupons', label: 'Coupons', icon: Tag },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'help', label: 'Help Center', icon: LifeBuoy },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary', processing: 'secondary', paid: 'success', fulfilled: 'default',
  shipped: 'default', delivered: 'success', cancelled: 'destructive', failed: 'destructive', refunded: 'outline',
};

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-24 text-center text-muted-foreground">Loading account...</div>}>
      <AccountInner />
    </Suspense>
  );
}

function AccountInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const rawTab = sp.get('tab') as TabKey | null;
  const desktopTab: TabKey = rawTab ?? 'profile';
  const { data: me, isLoading } = useMe();
  const openLogin = useAuthModal((s) => s.openLogin);
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && !me) openLogin('/account');
  }, [me, isLoading, openLogin]);

  if (!me) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <p className="text-muted-foreground">Please sign in to view your account.</p>
        <Button className="mt-4" onClick={() => openLogin('/account')}>Sign in</Button>
      </div>
    );
  }

  async function handleLogout() {
    await logout.mutateAsync();
    router.push('/');
  }

  function renderTab(t: TabKey) {
    switch (t) {
      case 'profile': return <PersonalInfoTab me={me!} />;
      case 'orders': return <OrdersTab />;
      case 'addresses': return <AddressesTab />;
      case 'coupons': return <CouponsTab />;
      case 'reviews': return <ReviewsTab authorName={me!.name} />;
      case 'help': return <HelpCenterTab />;
    }
  }

  const activeLabel = TABS.find((t) => t.key === rawTab)?.label ?? '';

  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8 py-10">
      <h1 className="hidden text-2xl font-semibold md:block">My account</h1>

      {/* Desktop — sidebar + content */}
      <div className="mt-6 hidden gap-8 md:flex">
        <nav className="flex w-64 shrink-0 flex-col gap-2.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => router.push(`/account?tab=${t.key}`)}
              className={cn(
                'flex items-center gap-2 rounded-xs border px-4 py-3 text-left text-sm font-medium transition-colors',
                desktopTab === t.key
                  ? 'border-primary-button bg-primary-button text-white'
                  : 'bg-card hover:bg-accent',
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex items-center gap-2 rounded-xs border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            <LogOut className="size-4" /> Logout
          </button>
        </nav>
        <div className="min-w-0 flex-1">{renderTab(desktopTab)}</div>
      </div>

      {/* Mobile — a menu that drills into each section */}
      <div className="md:hidden">
        {rawTab ? (
          <div>
            <button
              onClick={() => router.push('/account')}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="size-4 rotate-180" /> My account
            </button>
            <h1 className="mb-4 text-xl font-semibold">{activeLabel}</h1>
            {renderTab(rawTab)}
          </div>
        ) : (
          <MobileMenu me={me} onLogout={handleLogout} loggingOut={logout.isPending} />
        )}
      </div>

      <ValueProps className="mt-12 sm:mt-16" />
    </div>
  );
}

function Avatar({ name, email, className }: { name: string | null; email: string; className?: string }) {
  const initial = (name?.trim()?.[0] ?? email[0] ?? '?').toUpperCase();
  return (
    <div className={cn('grid size-20 place-items-center rounded-full bg-brand/15 text-2xl font-semibold text-brand', className)}>
      {initial}
    </div>
  );
}

/** Mobile landing: profile summary + a 2-col grid of section tiles. */
function MobileMenu({ me, onLogout, loggingOut }: { me: User; onLogout: () => void; loggingOut: boolean }) {
  const router = useRouter();
  // Everything except the profile (that's the summary card up top).
  const tiles = TABS.filter((t) => t.key !== 'profile');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My account</h1>

      {/* Profile summary — tap to edit personal information */}
      <button
        onClick={() => router.push('/account?tab=profile')}
        className="flex w-full items-center gap-4 rounded-xs border bg-card p-4 text-left transition-colors hover:bg-accent"
      >
        <Avatar name={me.name} email={me.email} className="size-14 text-xl" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{me.name || 'Your profile'}</div>
          <div className="truncate text-sm text-muted-foreground">{me.email}</div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`/account?tab=${t.key}`)}
            className="flex items-center gap-2 rounded-xs border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent"
          >
            <t.icon className="size-4 shrink-0" />
            {t.label}
          </button>
        ))}
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-xs border px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-accent disabled:opacity-60"
        >
          <LogOut className="size-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
}

function PersonalInfoTab({ me }: { me: User }) {
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    name: me.name ?? '',
    mobile: me.mobile ?? '',
    gender: me.gender ?? '',
  });
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Only enable "Update changes" when something actually changed.
  const dirty =
    form.name !== (me.name ?? '') ||
    form.mobile !== (me.mobile ?? '') ||
    form.gender !== (me.gender ?? '');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await update.mutateAsync({
        name: form.name || undefined,
        mobile: form.mobile || undefined,
        gender: form.gender || undefined,
      });
      setStatus({ ok: true, msg: 'Profile updated successfully' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ ok: false, msg: (err as Error).message });
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Avatar name={me.name} email={me.email} />
        <form onSubmit={save} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (status) setStatus(null);
                }}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Email</Label>
                <EmailChangeDialog currentEmail={me.email} />
              </div>
              <Input value={me.email} disabled />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="mobile"
                type="tel"
                value={form.mobile}
                onChange={(e) => {
                  setForm({ ...form, mobile: e.target.value });
                  if (status) setStatus(null);
                }}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => {
                  setForm({ ...form, gender: v });
                  if (status) setStatus(null);
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={update.isPending || !dirty} variant="primary">
              {update.isPending ? 'Saving…' : 'Update changes'}
            </Button>
            {status && (
              <span className={cn('text-xs font-medium', status.ok ? 'text-[#117a7a] dark:text-[#42a3a3]' : 'text-red-600')}>
                {status.msg}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Change email — a 3-step verified flow: OTP to the CURRENT inbox, then supply
 * the new address (OTP to it), then confirm. Mirrors the auth-service endpoints.
 */
function EmailChangeDialog({ currentEmail }: { currentEmail: string }) {
  const request = useRequestEmailChange();
  const verifyOld = useVerifyOldEmail();
  const verifyNew = useVerifyNewEmail();
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) { setStep(1); setNewEmail(''); setOtp(''); setSentTo(''); setError(null); }
  }

  async function sendToCurrent() {
    setError(null);
    try {
      const r = await request.mutateAsync();
      setSentTo(r.sentTo);
      setOtp('');
      setStep(2);
    } catch (e) { setError((e as Error).message); }
  }

  async function submitOld() {
    setError(null);
    try {
      const r = await verifyOld.mutateAsync({ newEmail: newEmail.trim(), otp: otp.trim() });
      setSentTo(r.sentTo);
      setOtp('');
      setStep(3);
    } catch (e) { setError((e as Error).message); }
  }

  async function submitNew() {
    setError(null);
    try {
      await verifyNew.mutateAsync({ otp: otp.trim() });
      handleOpenChange(false);
    } catch (e) { setError((e as Error).message); }
  }

  const titleText = 'Change email';
  const descText =
    step === 1
      ? `We'll send a verification code to your current email (${currentEmail}).`
      : step === 2
      ? `Enter the code sent to ${sentTo}, then your new email address.`
      : `Enter the code sent to your new email (${sentTo}).`;

  const formBody = (
    <div className="space-y-4 pt-2">
      {error && (
        <div className="rounded-xs bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 font-medium text-center">
          {error}
        </div>
      )}

      {step === 1 && (
        <Button
          onClick={sendToCurrent}
          disabled={request.isPending}
          className="w-full bg-primary-button hover:bg-primary-button/90 text-white font-semibold"
        >
          {request.isPending ? 'Sending…' : 'Send verification code'}
        </Button>
      )}

      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); submitOld(); }} className="space-y-4">
          <div className="space-y-1.5 flex flex-col items-center">
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (error) setError(null);
              }}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email" className="text-xs font-semibold">New email address</Label>
            <Input
              id="new-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="new@example.com"
              className="text-xs sm:text-sm"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary-button hover:bg-primary-button/90 text-white font-semibold"
            disabled={verifyOld.isPending || otp.trim().length < 6 || !newEmail.trim()}
          >
            {verifyOld.isPending ? 'Verifying…' : 'Continue'}
          </Button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={(e) => { e.preventDefault(); submitNew(); }} className="space-y-4">
          <div className="flex flex-col items-center gap-2.5">
            <Label className="self-start text-xs font-semibold">Code from new email</Label>
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (error) setError(null);
              }}
              onComplete={() => submitNew()}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary-button hover:bg-primary-button/90 text-white font-semibold"
            disabled={verifyNew.isPending || otp.trim().length < 6}
          >
            {verifyNew.isPending ? 'Updating…' : 'Update email'}
          </Button>
        </form>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-primary-button hover:underline"
      >
        Change
      </button>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{titleText}</DialogTitle>
              <DialogDescription>{descText}</DialogDescription>
            </DialogHeader>
            {formBody}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="px-5 pt-3 pb-8 rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle>{titleText}</DrawerTitle>
              <DrawerDescription>{descText}</DrawerDescription>
            </DrawerHeader>
            {formBody}
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

function CouponsTab() {
  const { data: coupons, isLoading } = useCoupons();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded-xs bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xs border border-neutral-200 dark:border-neutral-800 bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  if (!coupons?.length) {
    return (
      <Card className="rounded-xs border border-neutral-200 dark:border-neutral-800">
        <CardContent className="py-20 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-button/10 text-primary-button mb-4">
            <BadgePercent className="size-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Coupons Available</h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto">
            There are no active discount coupons at the moment. Keep an eye out for seasonal promotions, flash sales, and exclusive vouchers!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>Available Coupons &amp; Offers</span>
            <Badge variant="secondary" className="rounded-xs text-[11px] font-semibold">
              {coupons.length}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Copy any coupon code below and apply it at checkout to enjoy instant savings.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {coupons.map((c) => (
          <CouponCard key={c.code} coupon={c} />
        ))}
      </div>
    </div>
  );
}

function CouponCard({ coupon }: { coupon: ActiveCoupon }) {
  const [copied, setCopied] = useState(false);
  const isPercent = coupon.type === 'percent';
  const discountPrimary = isPercent ? `${coupon.value}%` : money(coupon.value, 'INR');
  const discountLabel = isPercent ? 'OFF' : 'FLAT OFF';
  const isAvailable = coupon.isAvailable !== false;

  return (
    <div
      className={cn(
        'group relative flex flex-col sm:flex-row overflow-hidden rounded-xs border transition-all',
        isAvailable
          ? 'border-neutral-200 dark:border-neutral-800 bg-card hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs hover:shadow-sm'
          : 'border-neutral-200/60 dark:border-neutral-800/60 bg-muted/20 opacity-60 grayscale-[25%]',
      )}
    >
      {/* Left Voucher Stub / Badge */}
      <div
        className={cn(
          'relative flex sm:flex-col items-center justify-between sm:justify-center p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-dashed border-neutral-200 dark:border-neutral-800 sm:w-36 shrink-0 text-center',
          isAvailable
            ? 'bg-gradient-to-br from-primary-button/10 via-primary-button/5 to-transparent'
            : 'bg-muted/40',
        )}
      >
        <div className="flex sm:flex-col items-center gap-1.5 sm:gap-0">
          <div className="flex items-baseline justify-center">
            <span
              className={cn(
                'text-2xl sm:text-3xl font-black tracking-tight',
                isAvailable ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {discountPrimary}
            </span>
          </div>
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs sm:mt-1',
              isAvailable
                ? 'text-primary-button bg-primary-button/10'
                : 'text-muted-foreground bg-muted',
            )}
          >
            {isAvailable ? discountLabel : 'UNAVAILABLE'}
          </span>
        </div>

        <div className="sm:hidden flex items-center">
          <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground bg-background px-2.5 py-1 rounded-xs border border-dashed border-neutral-300 dark:border-neutral-700">
            {coupon.code}
          </span>
        </div>
      </div>

      {/* Right Details Section */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3 min-w-0">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <span
                className={cn(
                  'font-mono text-xs font-bold tracking-widest px-3 py-1 rounded-xs border border-dashed select-all',
                  isAvailable
                    ? 'text-foreground bg-muted/60 border-neutral-300 dark:border-neutral-700'
                    : 'text-muted-foreground bg-muted/30 border-neutral-200 dark:border-neutral-800',
                )}
              >
                {coupon.code}
              </span>
            </div>

            {isAvailable ? (
              <Button
                size="sm"
                variant={copied ? 'default' : 'outline'}
                className={cn(
                  'rounded-xs h-8 text-xs font-medium transition-colors w-full sm:w-auto shrink-0',
                  copied
                    ? 'bg-[#7EC151] hover:bg-[#7EC151]/90 text-white border-transparent'
                    : 'border-neutral-300 dark:border-neutral-700 hover:bg-muted',
                )}
                onClick={() => {
                  navigator.clipboard?.writeText(coupon.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 mr-1" strokeWidth={2.5} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1 text-muted-foreground" />
                    <span>Copy Code</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                disabled
                variant="outline"
                className="rounded-xs h-8 text-xs font-medium w-full sm:w-auto shrink-0 cursor-not-allowed opacity-60 bg-muted/40 border-neutral-200 dark:border-neutral-800 text-muted-foreground"
              >
                <Ban className="size-3.5 mr-1" />
                <span>{coupon.unavailableReason || 'Unavailable'}</span>
              </Button>
            )}
          </div>

          <p
            className={cn(
              'text-xs font-medium pt-0.5',
              isAvailable ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {isPercent
              ? `Get ${coupon.value}% discount on your order`
              : `Flat ${money(coupon.value, 'INR')} discount on your order`}
          </p>

          {!isAvailable && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{coupon.unavailableReason || 'This coupon is not available for your account.'}</span>
            </div>
          )}
        </div>

        {/* Conditions Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
          {coupon.minSubtotalMinor > 0 && (
            <span className="inline-flex items-center gap-1 rounded-xs bg-muted/50 border border-neutral-200/80 dark:border-neutral-800 px-2 py-0.5">
              <ShoppingBag className="size-3 text-muted-foreground shrink-0" />
              <span>Min. spend {money(coupon.minSubtotalMinor, 'INR')}</span>
            </span>
          )}
          {coupon.type === 'percent' && coupon.maxDiscountMinor != null && (
            <span className="inline-flex items-center gap-1 rounded-xs bg-muted/50 border border-neutral-200/80 dark:border-neutral-800 px-2 py-0.5">
              <Percent className="size-3 text-muted-foreground shrink-0" />
              <span>Max savings {money(coupon.maxDiscountMinor, 'INR')}</span>
            </span>
          )}
          {coupon.maxPerUser != null && (
            <span className="inline-flex items-center gap-1 rounded-xs bg-muted/50 border border-neutral-200/80 dark:border-neutral-800 px-2 py-0.5">
              <span>{coupon.usedCount ? `Used ${coupon.usedCount}/${coupon.maxPerUser}` : `${coupon.maxPerUser} per user`}</span>
            </span>
          )}
          {coupon.expiresAt && (
            <span className="inline-flex items-center gap-1 rounded-xs bg-muted/50 border border-neutral-200/80 dark:border-neutral-800 px-2 py-0.5">
              <Clock className="size-3 text-muted-foreground shrink-0" />
              <span>Expires {formatDate(coupon.expiresAt)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xs border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

function ReviewsTab({ authorName }: { authorName: string | null }) {
  const { data: reviewable, isLoading } = useReviewable();
  const { data: mine } = useMyReviews();
  const [writingFor, setWritingFor] = useState<ReviewableProduct | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Products to review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {!isLoading && !reviewable?.length && (
            <p className="text-sm text-muted-foreground">
              Nothing to review yet. You can review a product once your order is delivered.
            </p>
          )}
          {reviewable?.map((p) => (
            <div key={p.productId}>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  {p.variantLabel && <div className="text-xs text-muted-foreground">{p.variantLabel}</div>}
                </div>
                {writingFor?.productId === p.productId ? (
                  <Button variant="ghost" size="sm" onClick={() => setWritingFor(null)}>Cancel</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setWritingFor(p)}>Write a review</Button>
                )}
              </div>
              {writingFor?.productId === p.productId && (
                <ReviewForm
                  product={p}
                  authorName={authorName}
                  onDone={() => setWritingFor(null)}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {!!mine?.length && (
        <Card>
          <CardHeader><CardTitle>Your reviews</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {mine.map((r) => (
              <div key={r.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <RatingStars value={r.rating} />
                  <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
                {r.title && <div className="mt-1 font-medium">{r.title}</div>}
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                {r.images?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.images.map((url) => (
                      <div key={url} className="relative size-14 overflow-hidden rounded-md border">
                        <Image src={mediaSrc(url)} alt="" fill sizes="56px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewForm({
  product, authorName, onDone,
}: { product: ReviewableProduct; authorName: string | null; onDone: () => void }) {
  const submit = useSubmitReview();
  const upload = useUploadProductImage();
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({ rating: 5, title: '', body: '', images: [] as string[] });
  const [error, setError] = useState<string | null>(null);

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const res = await upload.mutateAsync(file);
        urls.push(res.url);
      }
      setF((s) => ({ ...s, images: [...s.images, ...urls].slice(0, 8) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    setError(null);
    try {
      await submit.mutateAsync({
        productId: product.productId,
        rating: f.rating,
        title: f.title || undefined,
        body: f.body,
        authorName: authorName || undefined,
        images: f.images,
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border p-4">
      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setF({ ...f, rating: n })} aria-label={`${n} star`}>
            <Star className={cn('size-6', n <= f.rating ? 'fill-current text-brand' : 'text-muted-foreground')} />
          </button>
        ))}
      </div>
      <Input
        placeholder="Title (optional)"
        value={f.title}
        onChange={(e) => {
          setF({ ...f, title: e.target.value });
          if (error) setError(null);
        }}
      />
      <Textarea
        className="min-h-24"
        placeholder="Share your experience…"
        value={f.body}
        onChange={(e) => {
          setF({ ...f, body: e.target.value });
          if (error) setError(null);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {f.images.map((url) => (
          <div key={url} className="relative size-16 overflow-hidden rounded-md border">
            <Image src={mediaSrc(url)} alt="" fill sizes="64px" className="object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setF((s) => ({ ...s, images: s.images.filter((u) => u !== url) }))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {f.images.length < 8 && (
          <label className="flex size-16 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground">
            <ImagePlus className="size-4" />
            <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onDone}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={send} disabled={submit.isPending || uploading || f.body.trim().length < 2}>
          {submit.isPending ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </div>
  );
}

function HelpCenterTab() {
  const links = [
    { icon: LifeBuoy, title: 'FAQ', desc: 'Answers to common questions', href: '/faq' },
    { icon: Package, title: 'Orders & shipping', desc: 'Track, cancel or return an order', href: '/account?tab=orders' },
    { icon: Mail, title: 'Contact support', desc: 'Email us — we reply within a day', href: 'mailto:support@example.com' },
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Help Center</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {links.map(({ icon: Icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="flex items-center gap-3 rounded-xs border p-4 transition-colors hover:bg-accent"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-button/10 text-primary-button">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{title}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}


// Returns are a post-delivery action; before that the customer can only cancel.
const RETURNABLE = ['delivered'];
// Cancel is allowed until the order ships (matches the API, which rejects a
// cancel once shipped/fulfilled/delivered).
const CANCELLABLE = ['pending', 'paid', 'processing'];
const returnBadge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  requested: 'secondary', approved: 'default', received: 'default', refunded: 'success', rejected: 'destructive',
};

function OrderStatusPill({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'paid':
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7EC151]/15 text-[#5e9637] dark:text-[#7EC151] border border-[#7EC151]/30 capitalize">
          <CheckCircle2 className="size-3.5" />
          {status}
        </span>
      );
    case 'shipped':
    case 'fulfilled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#117a7a]/15 text-[#117a7a] dark:text-[#42a3a3] border border-[#117a7a]/30 capitalize">
          <Truck className="size-3.5" />
          {status}
        </span>
      );
    case 'processing':
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 capitalize">
          <Clock className="size-3.5" />
          {status}
        </span>
      );
    case 'cancelled':
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 capitalize">
          <AlertCircle className="size-3.5" />
          {status}
        </span>
      );
    case 'refunded':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 capitalize">
          <RotateCcw className="size-3.5" />
          {status}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border capitalize">
          {status}
        </span>
      );
  }
}

function OrderItemThumbnail({
  productId,
  variantId,
  name,
  imageUrl,
}: {
  productId: string;
  variantId?: string | null;
  name: string;
  imageUrl?: string | null;
}) {
  const { data: product } = useProduct(productId);

  const resolvedImg =
    imageUrl ||
    (variantId ? product?.variants?.find((v) => v.id === variantId)?.images?.[0] : null) ||
    product?.imageUrl ||
    product?.media?.[0]?.url ||
    null;

  return (
    <div className="relative size-12 xs:size-14 rounded-xs bg-muted/60 border border-border/50 overflow-hidden flex items-center justify-center shrink-0 text-muted-foreground">
      {resolvedImg ? (
        <Image
          src={mediaSrc(resolvedImg)}
          alt={name}
          fill
          className="object-cover"
          sizes="56px"
        />
      ) : (
        <ShoppingBag className="size-5 text-[#117a7a]" />
      )}
    </div>
  );
}

function OrdersTab() {
  const { data: orders, isLoading } = useMyOrders();
  const { data: returns } = useMyReturns();
  const cancel = useCancelOrder();
  const [returningId, setReturningId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4 sm:p-5 rounded-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 w-32 bg-muted rounded-xs animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-16 w-full bg-muted/60 rounded-xs mb-3 animate-pulse" />
            <div className="h-5 w-28 bg-muted rounded-xs animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <Card className="py-12 px-4 text-center rounded-xs">
        <Package className="mx-auto size-12 text-muted-foreground stroke-1 mb-3" />
        <h3 className="font-semibold text-base text-foreground">No orders found</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          You haven&apos;t placed any orders yet. Discover our collection and treat yourself!
        </p>
        <Link href="/shop" className="inline-block mt-4">
          <Button size="sm" className="font-bold text-xs uppercase tracking-wider bg-primary-button hover:bg-primary-button/90 text-white">
            Start Shopping
          </Button>
        </Link>
      </Card>
    );
  }

  const returnFor = (orderId: string): AdminReturn | undefined =>
    returns?.find((r) => r.orderId === orderId);

  async function handleConfirmCancel() {
    if (!cancellingOrder) return;
    try {
      await cancel.mutateAsync({ id: cancellingOrder.id, reason: cancelReason.trim() || undefined });
      setCancellingOrder(null);
      setCancelReason('');
    } catch {}
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {orders.map((o) => {
        const ret = returnFor(o.id);
        const refText = o.reference ?? `#${o.id.slice(0, 8).toUpperCase()}`;

        return (
          <Card key={o.id} className="overflow-hidden border shadow-xs rounded-xs">
            {/* Header with Order ID, Date, Status */}
            <div className="bg-muted/40 px-3.5 py-3 sm:px-5 sm:py-3.5 border-b flex flex-wrap items-center justify-between gap-2.5">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm font-bold text-foreground tracking-tight">
                    {refText}
                  </span>
                  <OrderStatusPill status={o.status} />
                </div>
                <p className="text-[11px] xs:text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  Placed on {formatDate(o.createdAt)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] xs:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Amount</p>
                <p className="text-xs xs:text-sm font-bold text-foreground">{money(o.totalMinor, o.currency)}</p>
              </div>
            </div>

            {/* Items List */}
            <CardContent className="p-3.5 sm:p-5 space-y-3">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <OrderItemThumbnail
                      productId={it.productId}
                      variantId={it.variantId}
                      name={it.name}
                      imageUrl={it.imageUrl}
                    />

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${it.productId}`}
                        className="font-bold text-xs xs:text-sm text-foreground hover:text-primary-button hover:underline line-clamp-1 transition-colors"
                      >
                        {it.name}
                      </Link>
                      {it.variantLabel && (
                        <p className="text-[10px] xs:text-xs text-muted-foreground font-medium truncate mt-0.5">
                          {it.variantLabel}
                        </p>
                      )}
                      <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5">
                        Qty: <span className="font-semibold text-foreground">{it.quantity}</span> × {money(it.unitAmountMinor, o.currency)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-xs xs:text-sm text-foreground">
                        {money(it.unitAmountMinor * it.quantity, o.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Address snippet if present */}
              {o.shippingAddress && (
                <div className="pt-2.5 border-t flex items-start gap-2 text-[11px] xs:text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  <span className="truncate">
                    Delivery to <strong className="font-semibold text-foreground">{o.shippingAddress.fullName}</strong> • {o.shippingAddress.line1}, {o.shippingAddress.city} {o.shippingAddress.postalCode}
                  </span>
                </div>
              )}

              {/* Action Buttons & Return info */}
              <div className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-[11px] xs:text-xs text-muted-foreground">
                  <span>{o.items.length} {o.items.length === 1 ? 'item' : 'items'}</span>
                  {o.shippingMinor === 0 && <span className="text-[#7EC151] font-semibold">• FREE Delivery</span>}
                </div>

                <div className="flex items-center gap-2">
                  {CANCELLABLE.includes(o.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                      disabled={cancel.isPending}
                      onClick={() => {
                        setCancellingOrder(o);
                        setCancelReason('');
                      }}
                    >
                      Cancel Order
                    </Button>
                  )}
                  {RETURNABLE.includes(o.status) && !ret && returningId !== o.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => setReturningId(o.id)}
                    >
                      Request Return
                    </Button>
                  )}
                  <Link href="/shop">
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                      Shop More
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Return Details Card if return exists */}
              {ret && (
                <div className="mt-3 rounded-xs border border-border/80 bg-muted/30 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="size-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">Return Request:</span>
                      <Badge variant={returnBadge[ret.status] ?? 'secondary'} className="capitalize">
                        {ret.status}
                      </Badge>
                    </div>
                    {ret.refundMinor > 0 && (
                      <span className="font-bold text-[#7EC151]">
                        Refunded {money(ret.refundMinor, o.currency)}
                      </span>
                    )}
                  </div>
                  {ret.reason && (
                    <p className="text-muted-foreground text-[11px]">
                      Reason: <span className="text-foreground">{ret.reason}</span>
                    </p>
                  )}
                  {ret.images?.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {ret.images.map((key) => (
                        <AuthImage
                          key={key}
                          zoomable
                          path={`/api/returns/${ret.id}/images/${key.split('/').pop()}`}
                          className="size-12 rounded-xs border object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Return Form Accordion */}
              {returningId === o.id && (
                <div className="mt-3 pt-3 border-t">
                  <ReturnForm order={o} onDone={() => setReturningId(null)} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancellingOrder} onOpenChange={(open) => !open && setCancellingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Cancel Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order <strong className="font-mono text-foreground">{cancellingOrder?.reference ?? `#${cancellingOrder?.id.slice(0, 8)}`}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="cancel-reason" className="text-xs font-semibold">Reason for Cancellation (Optional)</Label>
            <Input
              id="cancel-reason"
              placeholder="e.g. Placed by mistake, changed mind"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancellingOrder(null)}
            >
              Keep Order
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={cancel.isPending}
              onClick={handleConfirmCancel}
              className="font-bold"
            >
              {cancel.isPending ? 'Cancelling…' : 'Confirm Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddressesTab() {
  const { data: addresses, isLoading } = useAddresses();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const del = useDeleteAddress();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addrError, setAddrError] = useState<string | null>(null);

  async function add(values: AddressInput) {
    setAddrError(null);
    try {
      await create.mutateAsync(values);
      setAdding(false);
    } catch (e) {
      setAddrError((e as Error).message);
    }
  }

  async function saveEdit(id: string, values: AddressInput) {
    setAddrError(null);
    try {
      await update.mutateAsync({ id, input: values });
      setEditingId(null);
    } catch (e) {
      setAddrError((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Addresses</CardTitle>
        {!adding && <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditingId(null); setAddrError(null); }}>+ Add</Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        {addrError && (
          <div className="rounded-xs bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 font-medium">
            {addrError}
          </div>
        )}
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {addresses?.map((a) => (
          editingId === a.id ? (
            <div key={a.id} className="rounded-xs border p-4">
              <AddressForm
                submitLabel="Update address"
                submitting={update.isPending}
                defaultValues={{
                  fullName: a.fullName,
                  phone: a.phone ?? '',
                  line1: a.line1,
                  line2: a.line2 ?? '',
                  city: a.city,
                  state: a.state ?? '',
                  postalCode: a.postalCode ?? '',
                }}
                onSubmit={(v) => saveEdit(a.id, v)}
                onCancel={() => { setEditingId(null); setAddrError(null); }}
              />
            </div>
          ) : (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-xs border p-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{a.fullName} {a.isDefault && <span className="text-xs text-muted-foreground">(default)</span>}</div>
                <div className="text-muted-foreground">{a.line1}, {a.city} {a.postalCode}</div>
                {a.phone && <div className="text-muted-foreground">{a.phone}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditingId(a.id); setAdding(false); setAddrError(null); }}>Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (await confirm({
                      title: 'Remove address?',
                      description: `"${a.fullName}, ${a.line1}" will be permanently removed.`,
                      confirmText: 'Remove',
                      destructive: true,
                    })) {
                      del.mutate(a.id, { onError: (e) => setAddrError((e as Error).message) });
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          )
        ))}
        {adding && (
          <div className="rounded-xs border p-4">
            <AddressForm onSubmit={add} submitting={create.isPending} onCancel={() => { setAdding(false); setAddrError(null); }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
