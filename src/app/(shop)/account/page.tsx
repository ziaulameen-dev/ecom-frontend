'use client';

import {
  AlertCircle, BadgePercent, Ban, Check, CheckCircle2, ChevronRight, Clock, Copy, Edit2, Gift, ImagePlus, LifeBuoy, LogOut, Mail,
  MapPin, Package, Percent, RotateCcw, ShoppingBag, Sparkles, Star, Tag, Trash2, Truck, User as UserIcon, X, XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AuthImage } from '@/components/auth-image';
import { confirm } from '@/components/confirm-dialog';
import { TaxInvoiceModal } from '@/components/invoice/tax-invoice';
import { RatingStars } from '@/components/rating-stars';
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
import { useAddToCart } from '@/features/cart';
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
  useUpdateOrderAddress,
  useUpdateProfile,
  useVerifyNewEmail,
  useVerifyOldEmail,
  OrderTimeline,
  OrderTrackingDrawer,
  type AddressInput,
} from '@/features/account';
import { AddressForm } from '@/features/account/components/address-form';
import { ReturnForm } from '@/features/account/components/return-form';
import { useContent, useProduct } from '@/features/catalog';
import type { ActiveCoupon, Address, AdminReturn, Order, OrderStatus, ReviewableProduct, User } from '@/lib/types';
import { cn, formatDate, mediaSrc, money } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: 'Personal Information', shortLabel: 'Personal Information', icon: UserIcon },
  { key: 'orders', label: 'Manage Orders', shortLabel: 'Orders', icon: Package },
  { key: 'addresses', label: 'Manage Address', shortLabel: 'Address', icon: MapPin },
  { key: 'coupons', label: 'Coupons', shortLabel: 'Coupons', icon: Tag },
  { key: 'reviews', label: 'Reviews', shortLabel: 'Reviews', icon: Star },
  { key: 'help', label: 'Help Center', shortLabel: 'Help Center', icon: LifeBuoy },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary', confirmed: 'success', processing: 'default',
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

  const activeTab = TABS.find((t) => t.key === rawTab);
  const activeLabel = activeTab?.label ?? '';
  const activeShortLabel = activeTab?.shortLabel ?? activeLabel;

  return (
    <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 lg:pb-12">
      <h1 className="hidden text-lg sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 md:block">My account</h1>

      {/* Desktop — sidebar + content */}
      <div className="mt-6 hidden gap-8 md:flex">
        <nav className="flex w-64 shrink-0 flex-col gap-2.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => router.push(`/account?tab=${t.key}`)}
              className={cn(
                'flex items-center gap-2 rounded-sm border px-4 py-3 text-left text-sm font-medium transition-colors',
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
            className="flex items-center gap-2 rounded-sm border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
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
            {/* Mobile sub-page header: back + title in one row */}
            <div className="mb-5 flex items-center gap-3 border-b pb-4">
              <button
                onClick={() => router.push('/account')}
                className="grid size-8 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Back to account"
              >
                <ChevronRight className="size-4 rotate-180" />
              </button>
              <h1 className="text-base font-semibold text-foreground">
                <span className="xs:hidden">{activeShortLabel}</span>
                <span className="hidden xs:inline">{activeLabel}</span>
              </h1>
            </div>
            {renderTab(rawTab)}
          </div>
        ) : (
          <MobileMenu me={me} onLogout={handleLogout} loggingOut={logout.isPending} />
        )}
      </div>
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
      <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My account</h1>

      {/* Profile summary — tap to edit personal information */}
      <button
        onClick={() => router.push('/account?tab=profile')}
        className="flex w-full items-center gap-4 rounded-sm border bg-card p-4 text-left transition-colors hover:bg-accent"
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
            className="flex items-center gap-2 rounded-sm border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent"
          >
            <t.icon className="size-4 shrink-0" />
            <span className="xs:hidden">{t.shortLabel}</span>
            <span className="hidden xs:inline">{t.label}</span>
          </button>
        ))}
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-sm border px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-accent disabled:opacity-60"
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
        <div className="rounded-sm bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 font-medium text-center">
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
          <DrawerContent className="px-5 pb-8 rounded-t-2xl max-h-[85vh] overflow-y-auto">
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
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-sm border border-neutral-200 dark:border-neutral-800 p-3.5 space-y-2 bg-muted/20 animate-pulse">
            <div className="h-5 w-28 bg-muted rounded-sm" />
            <div className="h-4 w-48 bg-muted rounded-sm" />
            <div className="h-8 w-full bg-muted rounded-sm mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (!coupons?.length) {
    return (
      <Card className="rounded-sm border border-neutral-200 dark:border-neutral-800">
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
    <div className="grid gap-3 sm:grid-cols-2">
      {coupons.map((c) => (
        <CouponCard key={c.code} coupon={c} />
      ))}
    </div>
  );
}

function CouponCard({ coupon }: { coupon: ActiveCoupon }) {
  const [copied, setCopied] = useState(false);
  const isAvailable = coupon.isAvailable !== false;
  const isPercent = coupon.type === 'percent';
  const discountHighlight = isPercent ? `${coupon.value}% OFF` : `FLAT ${money(coupon.value, 'INR')} OFF`;

  function handleCopy() {
    navigator.clipboard?.writeText(coupon.code);
    setCopied(true);
    toast.success(`Coupon code ${coupon.code} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        'relative rounded-sm border p-3.5 transition-all text-xs space-y-2.5 flex flex-col justify-between',
        isAvailable
          ? 'border-neutral-200 dark:border-neutral-800 bg-card hover:border-primary-button/40 shadow-xs'
          : 'border-neutral-200/60 dark:border-neutral-800/60 bg-muted/20 opacity-70'
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-xs px-2 py-0.5 rounded-sm border border-dashed border-primary-button/60 bg-primary-button/5 text-primary-button">
              {coupon.code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
              title="Copy coupon code"
              aria-label={`Copy coupon code ${coupon.code}`}
            >
              {copied ? (
                <Check className="size-3 text-[#117a7a]" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          </div>
          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <span>{discountHighlight}</span>
            {coupon.maxDiscountMinor != null && isPercent && (
              <span className="text-[11px] font-medium text-muted-foreground">
                (Up to {money(coupon.maxDiscountMinor, 'INR')})
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Copy */}
        <div className="shrink-0">
          {isAvailable ? (
            <Button
              size="sm"
              onClick={handleCopy}
              className={cn(
                'h-8 px-3.5 font-bold text-xs uppercase shadow-xs transition-colors',
                copied
                  ? 'bg-[#117a7a] hover:bg-[#117a7a]/90 text-white'
                  : 'bg-primary-button hover:bg-primary-button/90 text-white'
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3 mr-1" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3 mr-1" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              variant="outline"
              className="h-8 px-3 text-[11px] font-bold uppercase opacity-60"
            >
              Unavailable
            </Button>
          )}
        </div>
      </div>

      {/* Terms / Conditions */}
      <div className="space-y-1 text-muted-foreground text-[11px]">
        {coupon.minSubtotalMinor > 0 ? (
          <p>
            Applicable on orders above <span className="font-semibold text-foreground">{money(coupon.minSubtotalMinor, 'INR')}</span>
          </p>
        ) : (
          <p>No minimum order value</p>
        )}

        {/* Details or benefit description */}
        <p className="text-[#117a7a] dark:text-[#42a3a3] font-medium flex items-center gap-1">
          <Sparkles className="size-3 shrink-0" />
          <span>
            {isPercent
              ? `Get ${coupon.value}% off on your purchase`
              : `Save ${money(coupon.value, 'INR')} flat on your order`}
          </span>
        </p>

        {!isAvailable && (
          <p className="text-muted-foreground italic">
            {coupon.unavailableReason ?? 'Not available for your account'}
          </p>
        )}

        {coupon.expiresAt && (
          <p className="text-[10px] text-muted-foreground/80">
            Expires {new Date(coupon.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-sm border p-4">
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
  const { data: content } = useContent();
  const links = [
    { icon: LifeBuoy, title: 'FAQ', desc: 'Answers to common questions', href: '/faq' },
    { icon: Package, title: 'Orders & shipping', desc: 'Track, cancel or return an order', href: '/account?tab=orders' },
    ...(content?.contactSupportEnabled === true
      ? [{ icon: Mail, title: 'Contact support', desc: 'Email us — we reply within a day', href: 'mailto:support@example.com' }]
      : []),
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Help Center</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {links.map(({ icon: Icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="flex items-center gap-3 rounded-sm border p-4 transition-colors hover:bg-accent"
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
// cancel once shipped/processing/delivered).
const CANCELLABLE = ['pending', 'confirmed', 'processing'];
const returnBadge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  requested: 'secondary', approved: 'default', received: 'default', refunded: 'success', rejected: 'destructive',
};

function OrderStatusPill({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'confirmed':
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7EC151]/15 text-[#5e9637] dark:text-[#7EC151] border border-[#7EC151]/30 capitalize">
          <CheckCircle2 className="size-3.5" />
          {status}
        </span>
      );
    case 'shipped':
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#117a7a]/15 text-[#117a7a] dark:text-[#42a3a3] border border-[#117a7a]/30 capitalize">
          <Truck className="size-3.5" />
          {status}
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 capitalize">
          <Clock className="size-3.5" />
          {status}
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border capitalize">
          <XCircle className="size-3.5 text-muted-foreground" />
          {status}
        </span>
      );
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
    <div className="relative size-12 xs:size-14 rounded-sm bg-muted/60 border border-border/50 overflow-hidden flex items-center justify-center shrink-0 text-muted-foreground">
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
  const router = useRouter();
  const { data: orders, isLoading } = useMyOrders();
  const { data: returns } = useMyReturns();
  const cancel = useCancelOrder();
  const updateAddress = useUpdateOrderAddress();
  const addToCart = useAddToCart();

  const [returningId, setReturningId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [editingAddressOrder, setEditingAddressOrder] = useState<Order | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4 sm:p-5 rounded-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 w-32 bg-muted rounded-sm animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-16 w-full bg-muted/60 rounded-sm mb-3 animate-pulse" />
            <div className="h-5 w-28 bg-muted rounded-sm animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <Card className="py-12 px-4 text-center rounded-sm">
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

  async function handleReorder(order: Order) {
    try {
      setReorderingId(order.id);
      let count = 0;
      for (const item of order.items) {
        await addToCart.mutateAsync({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        });
        count += item.quantity;
      }
      toast.success(`Added ${count} items to your cart`, {
        action: {
          label: 'View Cart',
          onClick: () => router.push('/cart'),
        },
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reorder items');
    } finally {
      setReorderingId(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {orders.map((o) => {
        const ret = returnFor(o.id);
        const refText = o.reference ?? `#${o.id.slice(0, 8).toUpperCase()}`;
        const canEditAddress = ['pending', 'processing', 'paid'].includes(o.status);

        return (
          <Card key={o.id} className="overflow-hidden border shadow-xs rounded-sm">
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

            {/* Status Progress Stepper */}
            <div className="px-3.5 sm:px-5 pt-3 pb-2.5 bg-card border-b">
              <OrderTimeline
                status={o.status}
                createdAt={o.createdAt}
                carrier={o.carrier}
                cancelReason={o.cancelReason}
              />
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
                <div className="pt-2.5 border-t flex items-center justify-between gap-2 text-[11px] xs:text-xs text-muted-foreground">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                    <span className="truncate">
                      Delivery to <strong className="font-semibold text-foreground">{o.shippingAddress.fullName}</strong> • {o.shippingAddress.line1}, {o.shippingAddress.city} {o.shippingAddress.postalCode}
                    </span>
                  </div>
                  {canEditAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAddressOrder(o)}
                      className="h-6 px-2 text-[11px] text-[#187b7b] hover:text-[#187b7b] hover:bg-[#187b7b]/10 shrink-0"
                    >
                      Change Address
                    </Button>
                  )}
                </div>
              )}

              {/* Shipment Tracking info if dispatched */}
              {(o.trackingNumber || o.carrier || ['shipped', 'delivered'].includes(o.status)) && (
                <div className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs bg-muted/30 rounded-sm p-2.5">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-[#187b7b] shrink-0" />
                    <span className="font-semibold text-foreground">
                      {o.status === 'delivered' ? 'Delivered' : 'Dispatched via'}{' '}
                      <span className="font-bold text-foreground">{o.carrier || 'Courier'}</span>
                    </span>
                    {o.trackingNumber && (
                      <span className="text-[11px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded-sm border border-border">
                        AWB: {o.trackingNumber}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-bold text-[#187b7b] border-[#187b7b]/30 hover:bg-[#187b7b]/10 gap-1"
                    onClick={() => setTrackingOrder(o)}
                  >
                    <Truck className="size-3.5" />
                    Tracking Details →
                  </Button>
                </div>
              )}

              {/* Action Buttons & Return info */}
              <div className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-[11px] xs:text-xs text-muted-foreground">
                  <span>{o.items.length} {o.items.length === 1 ? 'item' : 'items'}</span>
                  {o.shippingMinor === 0 && <span className="text-[#7EC151] font-semibold">• FREE Delivery</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1"
                    onClick={() => setInvoiceOrder(o)}
                  >
                    <span>Invoice</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1 text-[#187b7b] border-[#187b7b]/30 hover:bg-[#187b7b]/10"
                    disabled={reorderingId === o.id}
                    onClick={() => handleReorder(o)}
                  >
                    <RotateCcw className="size-3.5" />
                    <span>{reorderingId === o.id ? 'Adding…' : 'Buy Again'}</span>
                  </Button>

                  {!['cancelled', 'failed'].includes(o.status) && !(o.trackingNumber || ['shipped', 'delivered'].includes(o.status)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold gap-1 text-foreground hover:text-[#187b7b]"
                      onClick={() => setTrackingOrder(o)}
                    >
                      <Truck className="size-3.5 text-[#187b7b]" />
                      Track Order
                    </Button>
                  )}
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
                </div>
              </div>

              {/* Return Details Card if return exists */}
              {ret && (
                <div className="mt-3 rounded-sm border border-border/80 bg-muted/30 p-3 text-xs space-y-2">
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
                          className="size-12 rounded-sm border object-cover"
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

      {/* Order Tracking Drawer (bottom sheet on mobile, slide-in right drawer on desktop) */}
      <OrderTrackingDrawer
        open={!!trackingOrder}
        onOpenChange={(open) => !open && setTrackingOrder(null)}
        orderId={trackingOrder?.id || ''}
        reference={trackingOrder?.reference}
        carrier={trackingOrder?.carrier}
        trackingNumber={trackingOrder?.trackingNumber}
      />

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

      {/* Tax Invoice Modal */}
      {invoiceOrder && (
        <TaxInvoiceModal
          order={invoiceOrder}
          open={!!invoiceOrder}
          onOpenChange={(open) => !open && setInvoiceOrder(null)}
        />
      )}

      {/* Edit Delivery Address Dialog */}
      {editingAddressOrder && (
        <EditOrderAddressDialog
          order={editingAddressOrder}
          open={!!editingAddressOrder}
          onOpenChange={(open) => !open && setEditingAddressOrder(null)}
          onSave={async (addr) => {
            try {
              await updateAddress.mutateAsync({
                id: editingAddressOrder.id,
                address: addr,
              });
              toast.success('Delivery address updated successfully');
              setEditingAddressOrder(null);
            } catch (err: any) {
              toast.error(err?.message || 'Failed to update delivery address');
            }
          }}
          isPending={updateAddress.isPending}
        />
      )}
    </div>
  );
}

function EditOrderAddressDialog({
  order,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (addr: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }) => Promise<void>;
  isPending: boolean;
}) {
  const current = order.shippingAddress;
  const [fullName, setFullName] = useState(current?.fullName || '');
  const [phone, setPhone] = useState(current?.phone || '');
  const [line1, setLine1] = useState(current?.line1 || '');
  const [line2, setLine2] = useState(current?.line2 || '');
  const [city, setCity] = useState(current?.city || '');
  const [state, setState] = useState(current?.state || '');
  const [postalCode, setPostalCode] = useState(current?.postalCode || '');
  const [country, setCountry] = useState(current?.country || 'India');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !line1.trim() || !city.trim() || !postalCode.trim()) {
      toast.error('Please fill in all required address fields');
      return;
    }
    onSave({
      fullName: fullName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-[#187b7b]" />
            <span>Update Delivery Address</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Edit your shipping destination before order dispatch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name" className="text-[11px] font-semibold">Full Name *</Label>
              <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-phone" className="text-[11px] font-semibold">Phone Number *</Label>
              <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-line1" className="text-[11px] font-semibold">Street Address / House No. *</Label>
            <Input id="edit-line1" value={line1} onChange={(e) => setLine1(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-line2" className="text-[11px] font-semibold">Apartment, Suite, Landmark (Optional)</Label>
            <Input id="edit-line2" value={line2} onChange={(e) => setLine2(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="edit-city" className="text-[11px] font-semibold">City *</Label>
              <Input id="edit-city" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-state" className="text-[11px] font-semibold">State *</Label>
              <Input id="edit-state" value={state} onChange={(e) => setState(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-pin" className="text-[11px] font-semibold">Pincode *</Label>
              <Input id="edit-pin" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-[#187b7b] hover:bg-[#187b7b]/90 text-white font-bold"
            >
              {isPending ? 'Saving…' : 'Save Address'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddressesTab() {
  const { data: addresses, isLoading } = useAddresses();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const del = useDeleteAddress();
  const [adding, setAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
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

  async function saveEdit(values: AddressInput) {
    if (!editingAddress) return;
    setAddrError(null);
    try {
      await update.mutateAsync({ id: editingAddress.id, input: values });
      setEditingAddress(null);
    } catch (e) {
      setAddrError((e as Error).message);
    }
  }

  async function handleDelete(a: Address) {
    if (await confirm({
      title: 'Remove address?',
      description: `"${a.fullName}, ${a.line1}" will be permanently removed.`,
      confirmText: 'Remove',
      destructive: true,
    })) {
      del.mutate(a.id, { onError: (e) => setAddrError((e as Error).message) });
      if (editingAddress?.id === a.id) setEditingAddress(null);
    }
  }

  return (
    <Card>
      <CardHeader className="p-3.5 sm:px-6 sm:py-4 border-b">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
          <MapPin className="size-4 text-primary-button" />
          Saved Addresses
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-6 space-y-4">
        {addrError && (
          <div className="rounded-sm bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 font-medium">
            {addrError}
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {addresses && addresses.length > 0 && (
          <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <div
                key={a.id}
                className="relative flex flex-col justify-between rounded-sm border border-gray-200 dark:border-gray-800 p-3.5 sm:p-4 transition-all"
              >
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
                    {a.line1}{a.line2 ? `, ${a.line2}` : ''}
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
                <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800/80 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setAdding(false); setEditingAddress(a); setAddrError(null); }}
                    className="inline-flex items-center gap-1 font-bold text-[#187b7b] hover:underline"
                  >
                    <Edit2 className="size-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    disabled={del.isPending}
                    className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700 hover:underline"
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!addresses?.length && !isLoading && (
          <p className="text-xs text-muted-foreground">No saved addresses yet. Add one below.</p>
        )}

        {/* Edit Address Form */}
        {editingAddress && (
          <div className="rounded-sm border border-gray-200 p-4 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30">
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
              onSubmit={saveEdit}
              submitting={update.isPending}
              onCancel={() => { setEditingAddress(null); setAddrError(null); }}
            />
          </div>
        )}

        {/* Add Address Form */}
        {adding ? (
          <div className="rounded-sm border border-gray-200 p-4 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30">
            <div className="mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wide">Add New Address</h4>
            </div>
            <AddressForm
              onSubmit={add}
              submitting={create.isPending}
              onCancel={() => { setAdding(false); setAddrError(null); }}
            />
          </div>
        ) : (
          !editingAddress && (
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs uppercase tracking-wide"
              onClick={() => { setEditingAddress(null); setAdding(true); setAddrError(null); }}
            >
              + Add New Address
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
