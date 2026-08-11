'use client';

import { CreditCard, Headphones, LogOut, Tag, Truck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AuthImage } from '@/components/auth-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuthModal, useLogout, useMe } from '@/features/auth';
import {
  useAddresses,
  useCancelOrder,
  useCoupons,
  useCreateAddress,
  useDeleteAddress,
  useMyOrders,
  useMyReturns,
  useUpdateProfile,
  type AddressInput,
} from '@/features/account';
import { AddressForm } from '@/features/account/components/address-form';
import { ReturnForm } from '@/features/account/components/return-form';
import type { ActiveCoupon, AdminReturn, OrderStatus, User } from '@/lib/types';
import { cn, formatDate, money } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: 'Personal Information' },
  { key: 'orders', label: 'Manage Orders' },
  { key: 'addresses', label: 'Manage Address' },
  { key: 'coupons', label: 'Coupons' },
] as const;

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary', processing: 'secondary', paid: 'success', fulfilled: 'default',
  shipped: 'default', delivered: 'success', cancelled: 'destructive', failed: 'destructive', refunded: 'outline',
};

function AccountInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get('tab') ?? 'profile') as (typeof TABS)[number]['key'];
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">My account</h1>
      <div className="mt-6 flex flex-col gap-8 md:flex-row">
        {/* Sidebar — vertical tab cards + logout */}
        <nav className="flex flex-col gap-2.5 md:w-64">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => router.push(`/account?tab=${t.key}`)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-brand bg-brand text-brand-foreground'
                  : 'bg-card hover:bg-accent',
              )}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            <LogOut className="size-4" /> Logout
          </button>
        </nav>

        <div className="flex-1">
          {tab === 'profile' && <PersonalInfoTab me={me} />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'addresses' && <AddressesTab />}
          {tab === 'coupons' && <CouponsTab />}
        </div>
      </div>

      <ValueProps />
    </div>
  );
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initial = (name?.trim()?.[0] ?? email[0] ?? '?').toUpperCase();
  return (
    <div className="grid size-20 place-items-center rounded-full bg-brand/15 text-2xl font-semibold text-brand">
      {initial}
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
              <Label>Email</Label>
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
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Update changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
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

function ValueProps() {
  const items = [
    { icon: Truck, title: 'Free Shipping', desc: 'On orders above ₹500' },
    { icon: CreditCard, title: 'Flexible Payment', desc: 'Multiple secure payment options' },
    { icon: Headphones, title: '24×7 Support', desc: 'We support online all days' },
  ];
  return (
    <div className="mt-16 grid gap-6 border-t pt-10 sm:grid-cols-3">
      {items.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        </div>
      ))}
    </div>
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
  const del = useDeleteAddress();
  const [adding, setAdding] = useState(false);

  async function save(values: AddressInput) {
    try {
      await create.mutateAsync(values);
      setAdding(false);
      toast.success('Address added');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Addresses</CardTitle>
        {!adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add</Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {addresses?.map((a) => (
          <div key={a.id} className="flex items-start justify-between rounded-lg border p-3 text-sm">
            <div>
              <div className="font-medium">{a.fullName} {a.isDefault && <span className="text-xs text-muted-foreground">(default)</span>}</div>
              <div className="text-muted-foreground">{a.line1}, {a.city} {a.postalCode}</div>
              {a.phone && <div className="text-muted-foreground">{a.phone}</div>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => del.mutate(a.id)}>Remove</Button>
          </div>
        ))}
        {adding && (
          <div className="rounded-lg border p-4">
            <AddressForm onSubmit={save} submitting={create.isPending} />
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
