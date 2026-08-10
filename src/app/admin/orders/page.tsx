'use client';

import { format } from 'date-fns';
import { CalendarDays, CheckCircle2, Eye, MoreHorizontal, Package, PackageCheck, RotateCcw, Search, Truck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminCancelOrder, useAdminOrders, useAdminReturns, useRefundOrder, useReturnAction, useSetTracking, useUpdateOrderStatus,
} from '@/features/admin';
import type { AdminOrder, AdminReturn, OrderStatus } from '@/lib/types';
import { cn, formatDate, money } from '@/lib/utils';

const STATUSES: OrderStatus[] = [
  'pending', 'processing', 'paid', 'failed',
  'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded',
];

const badge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary', processing: 'secondary', paid: 'success', fulfilled: 'default',
  shipped: 'default', delivered: 'success', cancelled: 'destructive', failed: 'destructive', refunded: 'outline',
};

const returnBadge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  requested: 'secondary', approved: 'default', received: 'default', refunded: 'success', rejected: 'destructive',
};

type TabValue = 'all' | 'returns' | OrderStatus;

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const { data: returns } = useAdminReturns();
  const returnsByOrder = useMemo(() => {
    const m = new Map<string, AdminReturn[]>();
    (returns ?? []).forEach((r) => { const a = m.get(r.orderId) ?? []; a.push(r); m.set(r.orderId, a); });
    return m;
  }, [returns]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TabValue>('all');
  const [range, setRange] = useState<DateRange | undefined>();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    (orders ?? []).forEach((o) => m.set(o.status, (m.get(o.status) ?? 0) + 1));
    return m;
  }, [orders]);

  // Only show tabs for statuses that actually have orders.
  const tabs = useMemo(() => {
    // A return is "done" once the order is refunded — drop those from the tab.
    const returnCount = (orders ?? []).filter((o) => returnsByOrder.has(o.id) && o.status !== 'refunded').length;
    return [
      { value: 'all' as TabValue, label: 'All orders', count: orders?.length ?? 0 },
      ...STATUSES.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => ({ value: s as TabValue, label: s as string, count: counts.get(s)! })),
      ...(returnCount > 0 ? [{ value: 'returns' as TabValue, label: 'Returns', count: returnCount }] : []),
    ];
  }, [orders, counts, returnsByOrder]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromT = range?.from ? range.from.getTime() : null;
    const endDay = range?.to ?? range?.from;
    const toT = endDay ? endDay.getTime() + 86_400_000 : null; // inclusive end-of-day
    return (orders ?? []).filter((o) => {
      if (status === 'returns') {
        if (!returnsByOrder.has(o.id) || o.status === 'refunded') return false;
      } else if (status !== 'all' && o.status !== status) return false;
      const t = new Date(o.createdAt).getTime();
      if (fromT !== null && t < fromT) return false;
      if (toT !== null && t >= toT) return false;
      if (q) {
        const ref = (o.reference ?? o.id).toLowerCase();
        const email = (o.customerEmail ?? '').toLowerCase();
        if (!ref.includes(q) && !email.includes(q) && !o.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, status, range, returnsByOrder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders?.length ?? 0} orders</p>
        </div>
      </div>

      {/* Toolbar / filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by reference or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start gap-2 font-normal">
              <CalendarDays className="size-4" />
              {range?.from ? (
                range.to
                  ? `${format(range.from, 'LLL d')} – ${format(range.to, 'LLL d, yyyy')}`
                  : format(range.from, 'LLL d, yyyy')
              ) : (
                <span className="text-muted-foreground">Date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="range" numberOfMonths={1} selected={range} onSelect={setRange} autoFocus />
            {range?.from && (
              <div className="border-t p-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => setRange(undefined)}>Clear</Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Status tabs — only statuses that have orders */}
      <div className="flex flex-wrap gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setStatus(t.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm capitalize',
              status === t.value ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className={cn('rounded-full px-1.5 text-xs', status === t.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3" colSpan={7}><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No orders found.</td></tr>
              ) : (
                filtered.map((o) => <OrderRow key={o.id} order={o} orderReturns={returnsByOrder.get(o.id) ?? []} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OrderRow({ order: o, orderReturns }: { order: AdminOrder; orderReturns: AdminReturn[] }) {
  const router = useRouter();
  const setStatus = useUpdateOrderStatus();
  const setTracking = useSetTracking();
  const cancel = useAdminCancelOrder();
  const refund = useRefundOrder();
  const returnAct = useReturnAction();

  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const run = (p: Promise<unknown>, msg: string) =>
    p.then(() => toast.success(msg)).catch((e) => toast.error((e as Error).message));

  const actionableReturns = orderReturns.filter((r) => ['requested', 'approved', 'received'].includes(r.status));
  const runReturn = (rid: string, action: 'approve' | 'reject' | 'receive' | 'refund' | 'refund_no_restock') =>
    returnAct.mutateAsync({ id: rid, action }).then(() => toast.success(`Return ${action}d`)).catch((e) => toast.error((e as Error).message));

  const itemCount = o.items.reduce((n, it) => n + it.quantity, 0);
  const alreadyRefunded = o.refundedMinor >= o.totalMinor; // order money already back → return just restocks
  const canFulfil = o.status === 'paid';
  const canShip = ['paid', 'fulfilled'].includes(o.status);
  const canDeliver = o.status === 'shipped';
  // Direct refund only before the goods ship. Once shipped/delivered, money is
  // returned only through the return flow — after the item is received back.
  const canRefund = ['paid', 'fulfilled'].includes(o.status);
  const canCancel = ['pending', 'paid'].includes(o.status);
  const hasActions = canFulfil || canShip || canDeliver || canRefund || canCancel;

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3">
          <div className="min-w-0">
            <Link href={`/admin/orders/${o.id}`} className="block truncate font-mono font-medium hover:underline">{o.reference ?? `#${o.id.slice(0, 8)}`}</Link>
            {o.trackingNumber && (
              <div className="truncate text-xs text-muted-foreground">
                <Package className="mr-1 inline size-3" />{o.carrier} {o.trackingNumber}
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-muted-foreground">{o.customerEmail ?? '—'}</span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{itemCount}</td>
        <td className="px-4 py-3">
          <span className="font-medium">{money(o.totalMinor, o.currency)}</span>
          {o.refundedMinor > 0 && (
            <div className="text-xs text-muted-foreground">refunded {money(o.refundedMinor, o.currency)}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={badge[o.status] ?? 'secondary'} className="capitalize">{o.status}</Badge>
            {orderReturns
              .filter((r) => r.status !== 'refunded')
              .map((r) => (
                <Badge key={r.id} variant={returnBadge[r.status] ?? 'outline'} className="gap-1 capitalize" title="Return status">
                  <RotateCcw className="size-3" /> {r.status}
                </Badge>
              ))}
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/admin/orders/${o.id}`)}>
                  <Eye className="size-4" /> View details
                </DropdownMenuItem>
                {hasActions && <DropdownMenuSeparator />}
                {canFulfil && (
                  <DropdownMenuItem onClick={() => run(setStatus.mutateAsync({ id: o.id, status: 'fulfilled' as OrderStatus }), 'Marked fulfilled')}>
                    <CheckCircle2 className="size-4" /> Fulfil
                  </DropdownMenuItem>
                )}
                {canShip && (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShipOpen(true); }}>
                    <Truck className="size-4" /> Ship
                  </DropdownMenuItem>
                )}
                {canDeliver && (
                  <DropdownMenuItem onClick={() => run(setStatus.mutateAsync({ id: o.id, status: 'delivered' as OrderStatus }), 'Marked delivered')}>
                    <CheckCircle2 className="size-4" /> Mark delivered
                  </DropdownMenuItem>
                )}
                {canRefund && (
                  <DropdownMenuItem onClick={async () => { if (await confirm({ title: 'Refund this order?', description: 'A full refund will be issued and stock restored.', confirmText: 'Refund', destructive: true })) run(refund.mutateAsync({ id: o.id }), 'Refunded'); }}>
                    <RotateCcw className="size-4" /> Refund
                  </DropdownMenuItem>
                )}
                {(canFulfil || canShip || canDeliver || canRefund) && canCancel && <DropdownMenuSeparator />}
                {canCancel && (
                  <DropdownMenuItem variant="destructive" onSelect={(e) => { e.preventDefault(); setCancelOpen(true); }}>
                    <XCircle className="size-4" /> Cancel
                  </DropdownMenuItem>
                )}

                {actionableReturns.length > 0 && <DropdownMenuSeparator />}
                {actionableReturns.map((r) => {
                  if (r.status === 'requested') return (
                    <Fragment key={r.id}>
                      <DropdownMenuItem onClick={() => runReturn(r.id, 'approve')}><CheckCircle2 className="size-4" /> Approve return</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => runReturn(r.id, 'reject')}><XCircle className="size-4" /> Reject return</DropdownMenuItem>
                    </Fragment>
                  );
                  if (r.status === 'approved') return (
                    <Fragment key={r.id}>
                      <DropdownMenuItem onClick={() => runReturn(r.id, 'receive')}><PackageCheck className="size-4" /> Mark return received</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => runReturn(r.id, 'reject')}><XCircle className="size-4" /> Reject return</DropdownMenuItem>
                    </Fragment>
                  );
                  return (
                    <Fragment key={r.id}>
                      <DropdownMenuItem onClick={() => runReturn(r.id, 'refund')}><RotateCcw className="size-4" /> {alreadyRefunded ? 'Restock items' : 'Refund return + restock'}</DropdownMenuItem>
                      {!alreadyRefunded && (
                        <DropdownMenuItem onClick={() => runReturn(r.id, 'refund_no_restock')}><RotateCcw className="size-4" /> Refund only (no restock)</DropdownMenuItem>
                      )}
                      <DropdownMenuItem variant="destructive" onClick={() => runReturn(r.id, 'reject')}><XCircle className="size-4" /> Reject return</DropdownMenuItem>
                    </Fragment>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      <ShipDialog
        open={shipOpen}
        onOpenChange={setShipOpen}
        onSubmit={(carrier, trackingNumber) =>
          run(
            setTracking.mutateAsync({ id: o.id, carrier, trackingNumber })
              .then(() => setStatus.mutateAsync({ id: o.id, status: 'shipped' as OrderStatus })),
            'Shipped',
          )
        }
      />
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={(reason) => run(cancel.mutateAsync({ id: o.id, reason: reason || undefined }), 'Cancelled')}
      />
    </>
  );
}

/** Collect carrier + tracking number, then mark the order shipped. */
function ShipDialog({
  open, onOpenChange, onSubmit,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (carrier: string, trackingNumber: string) => void }) {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  function handleOpenChange(next: boolean) {
    if (next) { setCarrier(''); setTrackingNumber(''); }
    onOpenChange(next);
  }

  function submit() {
    if (!carrier.trim()) return toast.error('Carrier is required');
    if (!trackingNumber.trim()) return toast.error('Tracking number is required');
    onSubmit(carrier.trim(), trackingNumber.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ship order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ship-carrier">Carrier</Label>
            <Input id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. BlueDart" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ship-tracking">Tracking number</Label>
            <Input id="ship-tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. 1Z999AA10123456784" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={submit}>Mark shipped</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Cancel an order with an optional reason. */
function CancelDialog({
  open, onOpenChange, onSubmit,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('');

  function handleOpenChange(next: boolean) {
    if (next) setReason('');
    onOpenChange(next);
  }

  function submit() {
    onSubmit(reason.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cancel order</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancel-reason">Reason <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer requested" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Keep order</Button>
          <Button type="button" variant="destructive" onClick={submit}>Cancel order</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
