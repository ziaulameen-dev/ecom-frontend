'use client';

import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminCoupons, useCreateCoupon, useDeleteCoupon, useUpdateCoupon } from '@/features/admin';
import type { Coupon } from '@/lib/types';
import { formatDate, money } from '@/lib/utils';

export default function AdminCouponsPage() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (coupons ?? []).filter((c) => {
      if (q && !c.code.toLowerCase().includes(q)) return false;
      if (status === 'active' && !c.active) return false;
      if (status === 'inactive' && c.active) return false;
      return true;
    });
  }, [coupons, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Coupons</h1>
          <p className="text-sm text-muted-foreground">{coupons?.length ?? 0} coupons</p>
        </div>
        <CouponDialog trigger={<Button><Plus className="size-4" /> Add Coupon</Button>} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by code…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type / Value</th>
                <th className="px-4 py-3 font-medium">Min subtotal</th>
                <th className="px-4 py-3 font-medium">Max discount</th>
                <th className="px-4 py-3 font-medium">Redemptions</th>
                <th className="px-4 py-3 font-medium">Per Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="px-4 py-3" colSpan={9}><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No coupons found.</td></tr>
              ) : (
                filtered.map((c) => <CouponRow key={c.id} coupon={c} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CouponRow({ coupon }: { coupon: Coupon }) {
  const del = useDeleteCoupon();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3 font-mono font-semibold">{coupon.code}</td>
        <td className="px-4 py-3">
          <Badge variant="secondary">{coupon.type === 'percent' ? `${coupon.value}%` : money(coupon.value)}</Badge>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{money(coupon.minSubtotalMinor)}</td>
        <td className="px-4 py-3 text-muted-foreground">{coupon.maxDiscountMinor != null ? money(coupon.maxDiscountMinor) : '—'}</td>
        <td className="px-4 py-3 text-muted-foreground">
          {coupon.timesRedeemed} / {coupon.maxRedemptions ?? '∞'}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {coupon.maxPerUser != null ? `${coupon.maxPerUser}` : '∞'}
        </td>
        <td className="px-4 py-3">
          <Badge variant={coupon.active ? 'default' : 'secondary'}>{coupon.active ? 'Active' : 'Inactive'}</Badge>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{coupon.expiresAt ? formatDate(coupon.expiresAt) : '—'}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => {
                    if (await confirm({
                      title: 'Delete coupon?',
                      description: `Coupon "${coupon.code}" will be removed.`,
                      confirmText: 'Delete',
                      destructive: true,
                    })) {
                      del.mutate(coupon.id, { onError: (e) => toast.error((e as Error).message) });
                    }
                  }}
                >
                  <Trash2 className="size-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {/* Edit Coupon Dialog */}
      {editOpen && (
        <CouponDialog
          coupon={coupon}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}

interface CouponDialogProps {
  trigger?: React.ReactNode;
  coupon?: Coupon;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Add or edit a coupon in a dialog (code, type, value, min subtotal, max uses, expiration, status). */
function CouponDialog({ trigger, coupon, open: controlledOpen, onOpenChange }: CouponDialogProps) {
  const isEditing = !!coupon;
  const create = useCreateCoupon();
  const update = useUpdateCoupon();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setUncontrolledOpen;

  const [f, setF] = useState({
    code: coupon?.code ?? '',
    type: (coupon?.type ?? 'percent') as 'percent' | 'fixed',
    value: coupon?.value ?? 10,
    minSubtotalMinor: coupon?.minSubtotalMinor ?? 0,
    maxDiscountMinor: coupon?.maxDiscountMinor != null ? String(coupon.maxDiscountMinor) : '',
    maxRedemptions: coupon?.maxRedemptions != null ? String(coupon.maxRedemptions) : '',
    maxPerUser: coupon?.maxPerUser != null ? String(coupon.maxPerUser) : '',
    active: coupon?.active ?? true,
    expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      setF({
        code: coupon?.code ?? '',
        type: (coupon?.type ?? 'percent') as 'percent' | 'fixed',
        value: coupon?.value ?? 10,
        minSubtotalMinor: coupon?.minSubtotalMinor ?? 0,
        maxDiscountMinor: coupon?.maxDiscountMinor != null ? String(coupon.maxDiscountMinor) : '',
        maxRedemptions: coupon?.maxRedemptions != null ? String(coupon.maxRedemptions) : '',
        maxPerUser: coupon?.maxPerUser != null ? String(coupon.maxPerUser) : '',
        active: coupon?.active ?? true,
        expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      });
    }
    setOpen(next);
  }

  async function submit() {
    try {
      if (isEditing) {
        await update.mutateAsync({
          id: coupon.id,
          body: {
            type: f.type,
            value: Number(f.value),
            minSubtotalMinor: Number(f.minSubtotalMinor) || 0,
            maxDiscountMinor: f.maxDiscountMinor ? Number(f.maxDiscountMinor) : null,
            maxRedemptions: f.maxRedemptions ? Number(f.maxRedemptions) : null,
            maxPerUser: f.maxPerUser ? Number(f.maxPerUser) : null,
            active: f.active,
            expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59Z`).toISOString() : null,
          },
        });
        toast.success('Coupon updated');
      } else {
        await create.mutateAsync({
          code: f.code.trim().toUpperCase(),
          type: f.type,
          value: Number(f.value),
          minSubtotalMinor: Number(f.minSubtotalMinor) || 0,
          maxDiscountMinor: f.maxDiscountMinor ? Number(f.maxDiscountMinor) : undefined,
          maxRedemptions: f.maxRedemptions ? Number(f.maxRedemptions) : undefined,
          maxPerUser: f.maxPerUser ? Number(f.maxPerUser) : undefined,
          active: f.active,
          expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59Z`).toISOString() : undefined,
        });
        toast.success('Coupon created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit Coupon: ${coupon.code}` : 'Add Coupon'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-code">Code</Label>
              <Input
                id="co-code"
                value={f.code}
                disabled={isEditing}
                onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME10"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={f.active ? 'active' : 'inactive'}
                onValueChange={(v) => setF({ ...f, active: v === 'active' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as 'percent' | 'fixed' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (paise)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-value">{f.type === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount (paise)'}</Label>
              <Input id="co-value" type="number" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-min">Min Order Subtotal (paise)</Label>
              <Input id="co-min" type="number" value={f.minSubtotalMinor} onChange={(e) => setF({ ...f, minSubtotalMinor: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-maxdisc">Max Discount Cap (paise)</Label>
              <Input
                id="co-maxdisc"
                type="number"
                value={f.maxDiscountMinor}
                onChange={(e) => setF({ ...f, maxDiscountMinor: e.target.value })}
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-max">Total Max Redemptions</Label>
              <Input id="co-max" type="number" value={f.maxRedemptions} onChange={(e) => setF({ ...f, maxRedemptions: e.target.value })} placeholder="Unlimited (∞)" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-peruser">Max Uses Per Customer</Label>
              <Input id="co-peruser" type="number" value={f.maxPerUser} onChange={(e) => setF({ ...f, maxPerUser: e.target.value })} placeholder="Unlimited (∞)" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="co-expires">Expiration Date</Label>
            <Input
              id="co-expires"
              type="date"
              value={f.expiresAt}
              onChange={(e) => setF({ ...f, expiresAt: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={submit}
              disabled={f.code.trim().length < 3 || isPending}
            >
              {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Coupon'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
