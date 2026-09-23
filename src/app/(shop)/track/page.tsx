'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import type { OrderStatus } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

interface PublicTrackingDetails {
  orderId: string;
  reference: string | null;
  status: OrderStatus;
  paymentMethod: 'prepaid' | 'cod';
  carrier: string | null;
  trackingNumber: string | null;
  trackUrl: string | null;
  etd: string | null;
  currentStatus: string;
  origin: string;
  destination: string;
  consigneeName: string;
  shippingAddress: {
    city?: string;
    state?: string;
    country?: string;
  } | null;
  items: Array<{ name: string; quantity: number; variantLabel: string | null }>;
  activities: Array<{
    date: string;
    activity: string;
    location: string;
    status?: string;
    srStatusLabel?: string;
  }>;
}

const statusBadge: Record<OrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'success',
  processing: 'default',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'destructive',
  failed: 'destructive',
  refunded: 'outline',
};

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-muted-foreground">Loading tracking...</div>}>
      <TrackOrderInner />
    </Suspense>
  );
}

function TrackOrderInner() {
  const sp = useSearchParams();
  const initialRef = sp.get('ref') ?? '';
  const initialPhone = sp.get('phone') ?? '';

  const [reference, setReference] = useState(initialRef);
  const [phoneOrEmail, setPhoneOrEmail] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicTrackingDetails | null>(null);

  const fetchTracking = async (ref: string, contact: string) => {
    if (!ref.trim()) {
      setError('Please enter your Order Reference or ID');
      return;
    }
    if (!contact.trim()) {
      setError('Please enter the Mobile Number or Email used during checkout');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post<PublicTrackingDetails>('/api/orders/public-track', {
        reference: ref.trim(),
        phoneOrEmail: contact.trim(),
      });
      setData(res);
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'Unable to locate order. Please check the reference and phone number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef && initialPhone) {
      fetchTracking(initialRef, initialPhone);
    }
  }, [initialRef, initialPhone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(reference, phoneOrEmail);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#187b7b]/10 text-[#187b7b]">
          <Truck className="size-3.5" />
          Live Shipment Tracking
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Enter your Order Reference Number and Phone/Email to check live transit status and delivery updates.
        </p>
      </div>

      {/* Lookup Form */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="order-ref" className="text-xs font-semibold">
                Order Reference / ID
              </Label>
              <Input
                id="order-ref"
                placeholder="e.g. ORD-20260922-XXXXXX"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="text-xs sm:text-sm uppercase font-mono"
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="order-contact" className="text-xs font-semibold">
                Mobile Number or Email
              </Label>
              <Input
                id="order-contact"
                placeholder="e.g. 9876543210 or name@example.com"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                className="text-xs sm:text-sm"
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 sm:h-10 text-xs font-bold uppercase tracking-wider bg-[#187b7b] hover:bg-[#187b7b]/90 text-white gap-1.5"
              >
                {loading ? (
                  <span>Checking…</span>
                ) : (
                  <>
                    <Search className="size-3.5" />
                    <span>Track</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking Results */}
      {data && (
        <div className="space-y-6">
          {/* Main Status Snapshot */}
          <Card className="border shadow-xs overflow-hidden">
            <div className="bg-muted/40 p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base sm:text-lg text-foreground">
                    {data.reference ?? `#${data.orderId.slice(0, 8)}`}
                  </span>
                  <Badge variant={statusBadge[data.status] ?? 'secondary'} className="capitalize">
                    {data.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recipient: <strong className="text-foreground">{data.consigneeName}</strong> • {data.destination}
                </p>
              </div>

              {data.etd && (
                <div className="bg-[#187b7b]/10 border border-[#187b7b]/20 px-3 py-1.5 rounded text-right">
                  <span className="text-[10px] uppercase font-bold text-[#187b7b] tracking-wider block">Estimated Delivery</span>
                  <span className="text-xs font-bold text-foreground">{data.etd}</span>
                </div>
              )}
            </div>

            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Stepper Progress */}
              <TrackingStepper status={data.status} />

              {/* Courier Partner & AWB Banner */}
              {data.trackingNumber && (
                <div className="rounded-lg border bg-muted/30 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-[#187b7b]/15 text-[#187b7b] flex items-center justify-center font-bold">
                      <Truck className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Shipped via <span className="font-bold">{data.carrier || 'Logistics Partner'}</span>
                      </p>
                      <p className="font-mono text-muted-foreground text-[11px]">
                        AWB Tracking No: <strong className="text-foreground">{data.trackingNumber}</strong>
                      </p>
                    </div>
                  </div>

                  {data.trackUrl && (
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <a href={data.trackUrl} target="_blank" rel="noopener noreferrer">
                        <span>Courier Portal</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {/* Live Activity Timeline */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#187b7b]" />
                  <span>Shipment Activity Logs</span>
                </h3>

                <div className="relative pl-6 space-y-4 border-l-2 border-muted ml-2">
                  {data.activities.map((act, i) => (
                    <div key={i} className="relative">
                      {/* Timeline dot */}
                      <span
                        className={cn(
                          'absolute -left-[31px] top-1 size-3.5 rounded-full border-2 bg-background',
                          i === 0 ? 'border-[#187b7b] bg-[#187b7b]' : 'border-muted-foreground/40',
                        )}
                      />
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-xs text-foreground">{act.activity}</p>
                          <span className="text-[11px] text-muted-foreground font-mono">{act.date}</span>
                        </div>
                        {act.location && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground/60" />
                            <span>{act.location}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Summary Card */}
              <div className="pt-4 border-t space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Order Items ({data.items.length})</h4>
                <div className="divide-y divide-border/60 text-xs">
                  {data.items.map((it, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{it.name}</p>
                        {it.variantLabel && (
                          <p className="text-[11px] text-muted-foreground">{it.variantLabel}</p>
                        )}
                      </div>
                      <span className="font-bold text-muted-foreground">Qty: {it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help & Support Shortcut */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              Need assistance with your delivery?
            </span>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
            >
              <MessageCircle className="size-3.5" />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackingStepper({ status }: { status: OrderStatus }) {
  const steps = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Dispatched' },
    { key: 'delivered', label: 'Delivered' },
  ];

  let currentIdx = 0;
  if (status === 'confirmed') currentIdx = 1;
  if (status === 'processing') currentIdx = 2;
  if (status === 'shipped') currentIdx = 3;
  if (status === 'delivered') currentIdx = 4;

  if (status === 'cancelled') {
    return (
      <div className="rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <XCircle className="size-4 text-muted-foreground shrink-0" />
        <span>This order was cancelled.</span>
      </div>
    );
  }

  return (
    <div className="relative py-2">
      <div className="flex justify-between items-center">
        {steps.map((s, idx) => {
          const isDone = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={s.key} className="flex flex-col items-center text-center flex-1 relative z-10">
              <div
                className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors border-2',
                  isDone
                    ? 'bg-[#187b7b] border-[#187b7b] text-white'
                    : 'bg-background border-muted text-muted-foreground',
                  isCurrent && 'ring-4 ring-[#187b7b]/20',
                )}
              >
                {idx < currentIdx ? <CheckCircle2 className="size-4" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs mt-1.5 font-medium',
                  isDone ? 'text-foreground font-semibold' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Connector line */}
      <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-muted -z-0">
        <div
          className="h-full bg-[#187b7b] transition-all duration-500"
          style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
