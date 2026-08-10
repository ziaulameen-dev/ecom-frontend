'use client';

import { MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
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
import { useAdminCoupons, useCreateCoupon, useDeleteCoupon } from '@/features/admin';
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
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="px-4 py-3" colSpan={8}><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No coupons found.</td></tr>
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
  return (
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
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => { if (await confirm({ title: 'Delete coupon?', description: `Coupon "${coupon.code}" will be removed.`, confirmText: 'Delete', destructive: true })) del.mutate(coupon.id, { onError: (e) => toast.error((e as Error).message) }); }}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

/** Add a coupon in a dialog (code, type, value, min subtotal, max uses). */
function CouponDialog({ trigger }: { trigger: React.ReactNode }) {
  const create = useCreateCoupon();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: '', type: 'percent' as 'percent' | 'fixed', value: 10, minSubtotalMinor: 0, maxRedemptions: '' });

  function handleOpenChange(next: boolean) {
    if (next) setF({ code: '', type: 'percent', value: 10, minSubtotalMinor: 0, maxRedemptions: '' });
    setOpen(next);
  }

  async function submit() {
    try {
      await create.mutateAsync({
        code: f.code.trim(),
        type: f.type,
        value: Number(f.value),
        minSubtotalMinor: Number(f.minSubtotalMinor) || 0,
        maxRedemptions: f.maxRedemptions ? Number(f.maxRedemptions) : undefined,
      });
      toast.success('Coupon created');
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add coupon</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="co-code">Code</Label>
            <Input id="co-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as 'percent' | 'fixed' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed (paise)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-value">{f.type === 'percent' ? 'Percent' : 'Amount (paise)'}</Label>
              <Input id="co-value" type="number" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-min">Min subtotal (paise)</Label>
              <Input id="co-min" type="number" value={f.minSubtotalMinor} onChange={(e) => setF({ ...f, minSubtotalMinor: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="co-max">Max uses</Label>
              <Input id="co-max" type="number" value={f.maxRedemptions} onChange={(e) => setF({ ...f, maxRedemptions: e.target.value })} placeholder="∞" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={submit} disabled={f.code.trim().length < 3 || create.isPending}>{create.isPending ? 'Saving…' : 'Add coupon'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
