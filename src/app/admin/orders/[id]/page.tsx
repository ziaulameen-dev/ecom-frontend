'use client';

import { ArrowLeft, Package, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AuthImage } from '@/components/auth-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminOrders, useAdminReturns, useReturnAction, useSetTracking } from '@/features/admin';
import { formatDate, money } from '@/lib/utils';

const badge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary', processing: 'secondary', paid: 'success', fulfilled: 'default',
  shipped: 'default', delivered: 'success', cancelled: 'destructive', failed: 'destructive', refunded: 'outline',
};

const returnBadge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  requested: 'secondary', approved: 'default', received: 'default', refunded: 'success', rejected: 'destructive',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: orders, isLoading } = useAdminOrders();
  const { data: returns } = useAdminReturns();
  const act = useReturnAction();
  const setTracking = useSetTracking();
  const [trackOpen, setTrackOpen] = useState(false);
  const order = orders?.find((o) => o.id === id);
  const orderReturns = (returns ?? []).filter((r) => r.orderId === id);

  const runReturn = (rid: string, action: 'approve' | 'reject' | 'receive' | 'refund' | 'refund_no_restock') =>
    act.mutateAsync({ id: rid, action }).then(() => toast.success(`Return ${action}d`)).catch((e) => toast.error((e as Error).message));

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!order) {
    return (
      <div className="space-y-3">
        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to orders
        </Link>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const addr = order.shippingAddress;
  // Tracking is editable while the order is in a shippable/shipped state.
  const canEditTracking = ['paid', 'fulfilled', 'shipped', 'delivered'].includes(order.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="flex size-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent" aria-label="Back to orders">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Back to orders</p>
          <h1 className="truncate font-mono text-lg font-semibold sm:text-xl">{order.reference ?? `#${order.id.slice(0, 8)}`}</h1>
        </div>
        <Badge variant={badge[order.status] ?? 'secondary'} className="ml-auto capitalize">{order.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: items + summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Items ({order.items.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Qty</th>
                      <th className="px-4 py-2 font-medium">Unit</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2">
                          <div className="font-medium">{it.name}</div>
                          {it.variantLabel && <div className="text-xs text-muted-foreground">{it.variantLabel}</div>}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{it.quantity}</td>
                        <td className="px-4 py-2 text-muted-foreground">{money(it.unitAmountMinor, order.currency)}</td>
                        <td className="px-4 py-2 text-right font-medium">{money(it.unitAmountMinor * it.quantity, order.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Subtotal" value={money(order.subtotalMinor, order.currency)} />
              {order.discountMinor > 0 && <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`− ${money(order.discountMinor, order.currency)}`} />}
              <Row label="Shipping" value={money(order.shippingMinor, order.currency)} />
              {order.taxMinor > 0 && <Row label="Tax" value={money(order.taxMinor, order.currency)} />}
              <div className="border-t pt-2"><Row label="Total" value={money(order.totalMinor, order.currency)} strong /></div>
              {order.refundedMinor > 0 && <Row label="Refunded" value={`− ${money(order.refundedMinor, order.currency)}`} />}
            </CardContent>
          </Card>
        </div>

        {/* Right: customer + address + fulfillment */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>{order.customerEmail ?? '—'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Shipping address</CardTitle></CardHeader>
            <CardContent className="space-y-0.5 text-sm">
              {addr ? (
                <>
                  <div className="font-medium">{addr.fullName}</div>
                  {addr.phone && <div className="text-muted-foreground">{addr.phone}</div>}
                  <div className="text-muted-foreground">{addr.line1}</div>
                  {addr.line2 && <div className="text-muted-foreground">{addr.line2}</div>}
                  <div className="text-muted-foreground">
                    {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                  </div>
                  <div className="text-muted-foreground">{addr.country}</div>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Fulfillment</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Status" value={<Badge variant={badge[order.status] ?? 'secondary'} className="capitalize">{order.status}</Badge>} />
              <Row label="Placed" value={formatDate(order.createdAt)} />
              {order.trackingNumber ? (
                <Row label="Tracking" value={
                  <span className="inline-flex items-center gap-1">
                    <Package className="size-3.5" />{order.carrier} {order.trackingNumber}
                    {canEditTracking && (
                      <button type="button" onClick={() => setTrackOpen(true)} className="ml-1 text-muted-foreground hover:text-foreground" aria-label="Edit tracking">
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                  </span>
                } />
              ) : canEditTracking ? (
                <Row label="Tracking" value={
                  <Button variant="outline" size="sm" className="h-7" onClick={() => setTrackOpen(true)}>
                    <Package className="size-3.5" /> Add tracking
                  </Button>
                } />
              ) : null}
              {order.paymentRef && <Row label="Payment ref" value={<span className="font-mono text-xs">{order.paymentRef}</span>} />}
              {order.cancelReason && <Row label="Cancel reason" value={order.cancelReason} />}
            </CardContent>
          </Card>

          {orderReturns.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Returns ({orderReturns.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {orderReturns.map((r) => (
                  <div key={r.id} className="space-y-3 rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={returnBadge[r.status] ?? 'secondary'} className="capitalize">{r.status}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                      {r.refundMinor > 0 && (
                        <span className="ml-auto text-xs font-medium">Refunded {money(r.refundMinor, order.currency)}</span>
                      )}
                    </div>

                    {/* Returned line items (resolve names from the order snapshot). */}
                    <ul className="space-y-1">
                      {r.items.map((it) => {
                        const oi = order.items.find((i) => i.productId === it.productId);
                        return (
                          <li key={it.productId} className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate">
                              {oi?.name ?? it.productId}
                              {oi?.variantLabel && <span className="text-muted-foreground"> · {oi.variantLabel}</span>}
                            </span>
                            <span className="shrink-0 text-muted-foreground">× {it.quantity}</span>
                          </li>
                        );
                      })}
                    </ul>

                    {r.reason && (
                      <p className="text-sm"><span className="text-muted-foreground">Reason: </span>{r.reason}</p>
                    )}

                    {r.images.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs text-muted-foreground">Photos ({r.images.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {r.images.map((key) => (
                            <AuthImage
                              key={key}
                              zoomable
                              path={`/api/returns/${r.id}/images/${key.split('/').pop()}`}
                              className="size-16 rounded-md border object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {r.status === 'requested' && (
                        <>
                          <Button size="sm" onClick={() => runReturn(r.id, 'approve')} disabled={act.isPending}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => runReturn(r.id, 'reject')} disabled={act.isPending}>Reject</Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <>
                          <Button size="sm" onClick={() => runReturn(r.id, 'receive')} disabled={act.isPending}>Mark received</Button>
                          <Button size="sm" variant="outline" onClick={() => runReturn(r.id, 'reject')} disabled={act.isPending}>Reject</Button>
                        </>
                      )}
                      {r.status === 'received' && (
                        <>
                          <Button size="sm" onClick={() => runReturn(r.id, 'refund')} disabled={act.isPending}>{order.refundedMinor >= order.totalMinor ? 'Restock items' : 'Refund + restock'}</Button>
                          {order.refundedMinor < order.totalMinor && (
                            <Button size="sm" variant="outline" onClick={() => runReturn(r.id, 'refund_no_restock')} disabled={act.isPending}>Refund only</Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => runReturn(r.id, 'reject')} disabled={act.isPending}>Reject</Button>
                        </>
                      )}
                      {(r.status === 'refunded' || r.status === 'rejected') && (
                        <Link href="/admin/returns" className="text-xs text-muted-foreground hover:text-foreground">View in Returns →</Link>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <TrackingDialog
        open={trackOpen}
        onOpenChange={setTrackOpen}
        initialCarrier={order.carrier ?? ''}
        initialTracking={order.trackingNumber ?? ''}
        onSubmit={(carrier, trackingNumber) =>
          setTracking
            .mutateAsync({ id: order.id, carrier, trackingNumber })
            .then(() => toast.success('Tracking updated'))
            .catch((e) => toast.error((e as Error).message))
        }
      />
    </div>
  );
}

/** Add or edit an order's carrier + tracking number (no status change). */
function TrackingDialog({
  open, onOpenChange, initialCarrier, initialTracking, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCarrier: string;
  initialTracking: string;
  onSubmit: (carrier: string, trackingNumber: string) => void;
}) {
  const [carrier, setCarrier] = useState(initialCarrier);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);

  // Sync the form to the saved values whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) { setCarrier(initialCarrier); setTrackingNumber(initialTracking); }
  }, [open, initialCarrier, initialTracking]);

  function submit() {
    if (!carrier.trim()) return toast.error('Carrier is required');
    if (!trackingNumber.trim()) return toast.error('Tracking number is required');
    onSubmit(carrier.trim(), trackingNumber.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initialTracking ? 'Edit tracking' : 'Add tracking'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="track-carrier">Carrier</Label>
            <Input id="track-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. BlueDart" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="track-number">Tracking number</Label>
            <Input id="track-number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. 1Z999AA10123456784" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={submit}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold' : 'text-right'}>{value}</span>
    </div>
  );
}
