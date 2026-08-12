'use client';

import {
  ChevronRight, Gift, ImagePlus, LifeBuoy, LogOut, Mail,
  MapPin, Package, Star, Tag, User as UserIcon, X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
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
  useReferral,
  useRequestEmailChange,
  useRequestPayout,
  useVerifyAccount,
  useReviewable,
  useSubmitReview,
  useUpdateProfile,
  useVerifyNewEmail,
  useVerifyOldEmail,
  type AddressInput,
} from '@/features/account';
import { AddressForm } from '@/features/account/components/address-form';
import { ReturnForm } from '@/features/account/components/return-form';
import type { ActiveCoupon, AdminReturn, OrderStatus, ReviewableProduct, User } from '@/lib/types';
import { cn, formatDate, mediaSrc, money } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: 'Personal Information', icon: UserIcon },
  { key: 'orders', label: 'Manage Orders', icon: Package },
  { key: 'addresses', label: 'Manage Address', icon: MapPin },
  { key: 'coupons', label: 'Coupons', icon: Tag },
  { key: 'referral', label: 'Refer & Earn', icon: Gift },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'help', label: 'Help Center', icon: LifeBuoy },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary', processing: 'secondary', paid: 'success', fulfilled: 'default',
  shipped: 'default', delivered: 'success', cancelled: 'destructive', failed: 'destructive', refunded: 'outline',
};

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
    toast.success('Logged out');
    router.push('/');
  }

  function renderTab(t: TabKey) {
    switch (t) {
      case 'profile': return <PersonalInfoTab me={me!} />;
      case 'orders': return <OrdersTab />;
      case 'addresses': return <AddressesTab />;
      case 'coupons': return <CouponsTab />;
      case 'referral': return <ReferralTab />;
      case 'reviews': return <ReviewsTab authorName={me!.name} />;
      case 'help': return <HelpCenterTab />;
    }
  }

  const activeLabel = TABS.find((t) => t.key === rawTab)?.label ?? '';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="hidden text-2xl font-semibold md:block">My account</h1>

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
        className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
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
            {t.label}
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

  // Only enable "Update changes" when something actually changed.
  const dirty =
    form.name !== (me.name ?? '') ||
    form.mobile !== (me.mobile ?? '') ||
    form.gender !== (me.gender ?? '');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        name: form.name || undefined,
        mobile: form.mobile || undefined,
        gender: form.gender || undefined,
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error((err as Error).message);
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
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
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
              <Input id="mobile" type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={update.isPending || !dirty} variant="primary">
            {update.isPending ? 'Saving…' : 'Update changes'}
          </Button>
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

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sentTo, setSentTo] = useState('');

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) { setStep(1); setNewEmail(''); setOtp(''); setSentTo(''); }
  }

  async function sendToCurrent() {
    try {
      const r = await request.mutateAsync();
      setSentTo(r.sentTo);
      setOtp('');
      setStep(2);
      toast.success(`Code sent to ${r.sentTo}`);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function submitOld() {
    try {
      const r = await verifyOld.mutateAsync({ newEmail: newEmail.trim(), otp: otp.trim() });
      setSentTo(r.sentTo);
      setOtp('');
      setStep(3);
      toast.success(`Code sent to ${r.sentTo}`);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function submitNew() {
    try {
      await verifyNew.mutateAsync({ otp: otp.trim() });
      toast.success('Email updated');
      handleOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-primary-button hover:underline">
        Change
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>
            {step === 1 && `We'll send a verification code to your current email (${currentEmail}).`}
            {step === 2 && `Enter the code sent to ${sentTo}, then your new email address.`}
            {step === 3 && `Enter the code sent to your new email (${sentTo}).`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Button onClick={sendToCurrent} disabled={request.isPending}>
            {request.isPending ? 'Sending…' : 'Send verification code'}
          </Button>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); submitOld(); }} className="space-y-4">
            <div className="space-y-1.5">
              <OtpInput value={otp} onChange={setOtp} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">New email address</Label>
              <Input id="new-email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" />
            </div>
            <Button type="submit" className="w-full" disabled={verifyOld.isPending || otp.trim().length < 6 || !newEmail.trim()}>
              {verifyOld.isPending ? 'Verifying…' : 'Continue'}
            </Button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); submitNew(); }} className="space-y-4">
            <div className="flex flex-col items-center gap-2.5">
              <Label className="self-start">Code from new email</Label>
              <OtpInput value={otp} onChange={setOtp} onComplete={() => submitNew()} autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={verifyNew.isPending || otp.trim().length < 6}>
              {verifyNew.isPending ? 'Updating…' : 'Update email'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CouponsTab() {
  const { data: coupons, isLoading } = useCoupons();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!coupons?.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Tag className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No coupons available right now. Check back soon!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {coupons.map((c) => <CouponCard key={c.code} coupon={c} />)}
    </div>
  );
}

function CouponCard({ coupon }: { coupon: ActiveCoupon }) {
  const off = coupon.type === 'percent'
    ? `${coupon.value}% OFF`
    : `${money(coupon.value, 'INR')} OFF`;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed p-4">
      <div className="min-w-0">
        <div className="text-base font-semibold">{off}</div>
        <div className="mt-0.5 font-mono text-sm">{coupon.code}</div>
        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {coupon.minSubtotalMinor > 0 && <div>Min. spend {money(coupon.minSubtotalMinor, 'INR')}</div>}
          {coupon.type === 'percent' && coupon.maxDiscountMinor != null && (
            <div>Up to {money(coupon.maxDiscountMinor, 'INR')} off</div>
          )}
          {coupon.expiresAt && <div>Expires {formatDate(coupon.expiresAt)}</div>}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => {
          navigator.clipboard?.writeText(coupon.code);
          toast.success(`Copied "${coupon.code}"`);
        }}
      >
        Copy
      </Button>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

const rupees = (m: number) => `₹${(m / 100).toFixed(0)}`;

function ReferralTab() {
  const { data, isLoading } = useReferral();

  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = `${origin}/?ref=${data.code}`;
  const remaining = Math.max(0, data.unlockThreshold - data.confirmedCount);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">Your referral code</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-dashed px-3 py-1.5 font-mono text-lg font-semibold tracking-widest">{data.code}</span>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(data.code); toast.success('Code copied'); }}>Copy code</Button>
            <Button variant="primary" size="sm" onClick={() => { navigator.clipboard?.writeText(link); toast.success('Share link copied'); }}>Copy share link</Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Share your link and earn <span className="font-medium text-foreground">{rupees(data.commissionMinor)}</span> for every order your friends place.
            {!data.unlocked && ` Unlock your balance after ${data.unlockThreshold} confirmed referrals.`}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total balance" value={rupees(data.balanceMinor)} note={`${rupees(data.totalEarnedMinor)} earned`} />
        <StatCard
          label={data.unlocked ? 'Available' : 'Locked'}
          value={data.unlocked ? rupees(data.availableMinor) : rupees(data.balanceMinor)}
          note={data.unlocked ? 'Spend at checkout or withdraw' : `${remaining} more referral${remaining === 1 ? '' : 's'} to unlock`}
        />
        <StatCard label="Confirmed referrals" value={String(data.confirmedCount)} note={`${data.pendingCount} pending`} />
      </div>

      {data.unlocked && data.availableMinor >= data.minPayoutMinor && (
        <PayoutForm minPayoutMinor={data.minPayoutMinor} availableMinor={data.availableMinor} />
      )}

      <Card>
        <CardHeader><CardTitle>Your referrals</CardTitle></CardHeader>
        <CardContent>
          {data.referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet — share your link to start earning.</p>
          ) : (
            <div className="divide-y text-sm">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-mono">{r.orderReference ?? 'Order'}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{rupees(r.commissionMinor)}</span>
                    <Badge variant={r.status === 'confirmed' ? 'success' : r.status === 'void' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.payouts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payout requests</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y text-sm">
              {data.payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">{p.method}{p.verifiedName ? ` · ${p.verifiedName}` : ''}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{rupees(p.amountMinor)}</span>
                    <Badge variant={p.status === 'paid' ? 'success' : p.status === 'rejected' ? 'destructive' : 'secondary'}>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PayoutForm({ minPayoutMinor, availableMinor }: { minPayoutMinor: number; availableMinor: number }) {
  const payout = useRequestPayout();
  const verify = useVerifyAccount();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  const account = () =>
    method === 'upi'
      ? { method, upiId: upiId.trim() }
      : { method, accountName: accountName.trim(), accountNumber: accountNumber.trim(), ifsc: ifsc.trim().toUpperCase() };
  const filled = method === 'upi'
    ? !!upiId.trim()
    : !!accountName.trim() && !!accountNumber.trim() && !!ifsc.trim();
  const reset = () => setVerifiedName(null);

  async function onVerify() {
    try {
      const r = await verify.mutateAsync(account());
      if (!r.available) { toast.message('Verification isn’t enabled — your details will be saved as entered.'); return; }
      if (r.valid) { setVerifiedName(r.name ?? null); toast.success(r.name ? `Verified: ${r.name}` : 'Account verified'); }
      else { setVerifiedName(null); toast.error(r.message ?? 'Could not verify this account'); }
    } catch (e) { toast.error((e as Error).message); }
  }

  async function submit() {
    const paise = Math.round(Number(amount) * 100);
    if (!paise || paise <= 0) { toast.error('Enter an amount'); return; }
    if (!filled) { toast.error('Enter your payout details'); return; }
    try {
      await payout.mutateAsync({ amountMinor: paise, ...account() });
      toast.success('Payout requested');
      setAmount(''); setUpiId(''); setAccountName(''); setAccountNumber(''); setIfsc(''); reset();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Request a payout</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Minimum {rupees(minPayoutMinor)}. You can also spend your balance at checkout.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input type="number" placeholder={`Max ${rupees(availableMinor)}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payout to</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v as 'upi' | 'bank'); reset(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">UPI ID</SelectItem>
                <SelectItem value="bank">Bank account</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {method === 'upi' ? (
          <div className="space-y-1.5">
            <Label>UPI ID</Label>
            <Input placeholder="name@bank" value={upiId} onChange={(e) => { setUpiId(e.target.value); reset(); }} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Account holder name</Label><Input value={accountName} onChange={(e) => { setAccountName(e.target.value); reset(); }} /></div>
            <div className="space-y-1.5"><Label>Account number</Label><Input value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value); reset(); }} /></div>
            <div className="space-y-1.5"><Label>IFSC</Label><Input value={ifsc} onChange={(e) => { setIfsc(e.target.value.toUpperCase()); reset(); }} /></div>
          </div>
        )}

        {verifiedName && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-sm text-emerald-600 dark:text-emerald-400">
            Account holder: <span className="font-medium">{verifiedName}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onVerify} disabled={!filled || verify.isPending}>{verify.isPending ? 'Verifying…' : 'Verify account'}</Button>
          <Button variant="primary" onClick={submit} disabled={payout.isPending}>{payout.isPending ? 'Requesting…' : 'Request payout'}</Button>
        </div>
      </CardContent>
    </Card>
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

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const res = await upload.mutateAsync(file);
        urls.push(res.url);
      }
      setF((s) => ({ ...s, images: [...s.images, ...urls].slice(0, 8) }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    try {
      await submit.mutateAsync({
        productId: product.productId,
        rating: f.rating,
        title: f.title || undefined,
        body: f.body,
        authorName: authorName || undefined,
        images: f.images,
      });
      toast.success('Thanks for your review!');
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setF({ ...f, rating: n })} aria-label={`${n} star`}>
            <Star className={cn('size-6', n <= f.rating ? 'fill-current text-brand' : 'text-muted-foreground')} />
          </button>
        ))}
      </div>
      <Input placeholder="Title (optional)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Textarea className="min-h-24" placeholder="Share your experience…" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />

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
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
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

function OrdersTab() {
  const { data: orders, isLoading } = useMyOrders();
  const { data: returns } = useMyReturns();
  const cancel = useCancelOrder();
  const [returningId, setReturningId] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading orders…</p>;
  if (!orders?.length) return <p className="text-muted-foreground">No orders yet.</p>;

  const returnFor = (orderId: string): AdminReturn | undefined =>
    returns?.find((r) => r.orderId === orderId);

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const ret = returnFor(o.id);
        return (
          <Card key={o.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{o.reference ?? `#${o.id.slice(0, 8)}`}</span>
                <Badge variant={statusVariant[o.status] ?? 'secondary'}>{o.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDate(o.createdAt)}</div>
              <div className="mt-3 space-y-1 text-sm">
                {o.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{it.name}{it.variantLabel ? ` · ${it.variantLabel}` : ''} × {it.quantity}</span>
                    <span>{money(it.unitAmountMinor * it.quantity, o.currency)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{money(o.totalMinor, o.currency)}</span>
                <div className="flex items-center gap-2">
                  {CANCELLABLE.includes(o.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancel.isPending}
                      onClick={() => {
                        const reason = window.prompt('Reason for cancelling? (optional)');
                        if (reason === null) return;
                        cancel.mutate(
                          { id: o.id, reason: reason || undefined },
                          { onSuccess: () => toast.success('Order cancelled'), onError: (e) => toast.error((e as Error).message) },
                        );
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  {RETURNABLE.includes(o.status) && !ret && returningId !== o.id && (
                    <Button variant="outline" size="sm" onClick={() => setReturningId(o.id)}>Request return</Button>
                  )}
                </div>
              </div>

              {ret && (
                <div className="mt-3 rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Return:</span>
                    <Badge variant={returnBadge[ret.status] ?? 'secondary'}>{ret.status}</Badge>
                    {ret.refundMinor > 0 && <span className="text-xs text-muted-foreground">refunded {money(ret.refundMinor, o.currency)}</span>}
                  </div>
                  {ret.images?.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {ret.images.map((key) => (
                        <AuthImage key={key} zoomable path={`/api/returns/${ret.id}/images/${key.split('/').pop()}`} className="size-14 rounded-md border object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {returningId === o.id && (
                <ReturnForm order={o} onDone={() => setReturningId(null)} />
              )}
            </CardContent>
          </Card>
        );
      })}
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

  async function add(values: AddressInput) {
    try {
      await create.mutateAsync(values);
      setAdding(false);
      toast.success('Address added');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function saveEdit(id: string, values: AddressInput) {
    try {
      await update.mutateAsync({ id, input: values });
      setEditingId(null);
      toast.success('Address updated');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Addresses</CardTitle>
        {!adding && <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditingId(null); }}>+ Add</Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {addresses?.map((a) => (
          editingId === a.id ? (
            <div key={a.id} className="rounded-lg border p-4">
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
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{a.fullName} {a.isDefault && <span className="text-xs text-muted-foreground">(default)</span>}</div>
                <div className="text-muted-foreground">{a.line1}, {a.city} {a.postalCode}</div>
                {a.phone && <div className="text-muted-foreground">{a.phone}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditingId(a.id); setAdding(false); }}>Edit</Button>
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
                      del.mutate(a.id, { onError: (e) => toast.error((e as Error).message) });
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
          <div className="rounded-lg border p-4">
            <AddressForm onSubmit={add} submitting={create.isPending} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountInner />
    </Suspense>
  );
}
