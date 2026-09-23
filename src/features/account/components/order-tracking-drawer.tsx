'use client';

import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  FastForward,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContent } from '@/features/catalog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useOrderTracking } from '@/features/account';
import { api } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';

interface OrderTrackingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  reference?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
}

export function OrderTrackingDrawer({
  open,
  onOpenChange,
  orderId,
  reference,
  carrier: fallbackCarrier,
  trackingNumber: fallbackAwb,
}: OrderTrackingDrawerProps) {
  const { data: tracking, isLoading, refetch, isFetching } = useOrderTracking(orderId, { enabled: open });
  const { data: content } = useContent();
  const [copied, setCopied] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const awb = tracking?.trackingNumber || fallbackAwb;
  const carrier = tracking?.carrier || fallbackCarrier;
  const status = tracking?.status;
  const currentStatusLabel = tracking?.currentStatus || status || 'PROCESSING';
  const trackUrl = tracking?.trackUrl || (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : null);

  const handleCopyAwb = async () => {
    if (!awb) return;
    try {
      await navigator.clipboard.writeText(awb);
      setCopied(true);
      toast.success('AWB tracking number copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSimAdvance = async () => {
    if (!awb) return;
    setAdvancing(true);
    try {
      const res = await api.post<{ success: boolean; current_status?: string; message?: string }>(
        `/api/shiprocket-sim/v1/external/debug/advance/${encodeURIComponent(awb)}`,
        {},
      );
      if (res?.success) {
        toast.success(`Shipment advanced to: ${res.current_status}`);
        await refetch();
      } else {
        toast.info(res?.message || 'No further transitions available in simulator');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not advance simulation state');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-0 sm:p-0 overflow-hidden flex flex-col max-h-[90vh] md:max-h-full">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-full bg-[#187b7b]/15 text-[#187b7b] flex items-center justify-center shrink-0">
              <Truck className="size-4" />
            </div>
            <div className="min-w-0">
              <DrawerTitle className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                <span>Track Shipment</span>
                {reference && (
                  <span className="font-mono text-xs text-muted-foreground font-normal">
                    {reference}
                  </span>
                )}
              </DrawerTitle>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                Live logistics updates & checkpoint scans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              title="Refresh tracking scans"
            >
              <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin text-[#187b7b]')} />
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </Button>
            </DrawerClose>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs">
              <Loader2 className="size-6 animate-spin text-[#187b7b]" />
              <span>Fetching latest logistics checkpoints…</span>
            </div>
          ) : (
            <>
              {/* Route Path Banner */}
              <div className="rounded-sm border border-border/70 bg-muted/20 p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5 text-[#187b7b]" /> Origin
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    Destination <MapPin className="size-3.5 text-primary-button" />
                  </span>
                </div>

                <div className="relative flex items-center justify-between">
                  <div className="h-0.5 w-full bg-muted-foreground/20 absolute top-1/2 -translate-y-1/2 z-0" />
                  <div className="relative z-10 size-3 rounded-full bg-[#187b7b] ring-4 ring-background" />
                  <div className="relative z-10 bg-background px-2 text-[#187b7b]">
                    <Truck className="size-4" />
                  </div>
                  <div className="relative z-10 size-3 rounded-full bg-primary-button ring-4 ring-background" />
                </div>

                <div className="flex items-start justify-between text-xs">
                  <div className="max-w-[45%] text-left">
                    <p className="font-bold text-foreground truncate">{tracking?.origin || 'Origin Warehouse'}</p>
                    <p className="text-[11px] text-muted-foreground">Okhla Hub</p>
                  </div>
                  <div className="max-w-[45%] text-right">
                    <p className="font-bold text-foreground truncate">{tracking?.destination || 'Customer Address'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{tracking?.consigneeName || 'Consignee'}</p>
                  </div>
                </div>
              </div>

              {/* Status & Courier Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border bg-card p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                    Current Status
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={status === 'delivered' ? 'success' : 'default'} className="capitalize text-xs font-bold">
                      {currentStatusLabel}
                    </Badge>
                  </div>
                  {tracking?.etd && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                      <Clock className="size-3 text-muted-foreground" />
                      ETA: {tracking.etd.split(' ')[0]}
                    </p>
                  )}
                </div>

                <div className="rounded-sm border bg-card p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                    Courier & AWB
                  </span>
                  <p className="text-xs font-bold text-foreground truncate">
                    {carrier || 'Logistics Partner'}
                  </p>
                  {awb ? (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="font-mono text-[11px] text-muted-foreground truncate">
                        {awb}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAwb}
                        className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                        title="Copy AWB number"
                      >
                        {copied ? <Check className="size-3 text-[#7EC151]" /> : <Copy className="size-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">AWB pending</span>
                  )}
                </div>
              </div>

              {/* Activity Timeline Checkpoints */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-foreground">
                    Shipment Journey & Hub Scans
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {tracking?.activities?.length || 0} checkpoints
                  </span>
                </div>

                {!tracking?.activities || tracking.activities.length === 0 ? (
                  <div className="rounded-sm border border-dashed p-6 text-center text-xs text-muted-foreground">
                    Waiting for first courier scan…
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted-foreground/20">
                    {tracking.activities.map((act, idx) => {
                      const isLatest = idx === 0;
                      const isDelivered = act.status === 'X-DEL' || act.activity.toLowerCase().includes('delivered');

                      return (
                        <div key={idx} className="relative group">
                          {/* Node Icon on Track */}
                          <div
                            className={cn(
                              'absolute -left-6 top-0.5 size-4 rounded-full flex items-center justify-center ring-4 ring-background transition-colors',
                              isDelivered && 'bg-[#7EC151] text-white',
                              !isDelivered && isLatest && 'bg-[#187b7b] text-white',
                              !isDelivered && !isLatest && 'bg-muted text-muted-foreground border border-border',
                            )}
                          >
                            {isDelivered ? (
                              <CheckCircle2 className="size-3" />
                            ) : isLatest ? (
                              <Truck className="size-2.5" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="space-y-0.5">
                            <p className={cn('text-xs font-semibold leading-tight', isLatest ? 'text-foreground font-bold' : 'text-foreground/80')}>
                              {act.activity}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              {act.location && (
                                <span className="inline-flex items-center gap-0.5 font-medium text-foreground/70">
                                  <MapPin className="size-2.5 text-muted-foreground" />
                                  {act.location}
                                </span>
                              )}
                              <span>•</span>
                              <span>{formatDate(act.date)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Package Line Items Snippet */}
              {tracking?.items && tracking.items.length > 0 && (
                <div className="rounded-sm border bg-muted/20 p-3 space-y-2 text-xs">
                  <p className="font-bold text-foreground text-xs">Package Items ({tracking.items.length})</p>
                  <div className="divide-y divide-border/40">
                    {tracking.items.map((it, idx) => (
                      <div key={idx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate pr-2">
                          {it.name} {it.variantLabel && <span className="text-muted-foreground">({it.variantLabel})</span>}
                        </span>
                        <span className="text-muted-foreground shrink-0">Qty: {it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/30 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Simulator Advance (Dev only) */}
          {awb && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimAdvance}
              disabled={advancing || status === 'delivered'}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8"
              title="Test next courier scan in Shiprocket simulator"
            >
              {advancing ? <Loader2 className="size-3 animate-spin" /> : <FastForward className="size-3 text-[#187b7b]" />}
              Advance Scan (Sim)
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {content?.contactSupportEnabled === true && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-support-chat', {
                      detail: {
                        text: `Hi, I have an inquiry regarding order #${reference || orderId.slice(0, 8)} (AWB: ${awb || 'N/A'})`,
                      },
                    }),
                  );
                  onOpenChange(false);
                }}
                className="text-xs h-8 gap-1 text-[#187b7b] border-[#187b7b]/30 hover:bg-[#187b7b]/10"
              >
                Need Help?
              </Button>
            )}
            {trackUrl && (
              <a
                href={trackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#187b7b] hover:bg-[#187b7b]/90 px-3 py-1.5 rounded-sm transition-colors"
              >
                Track on Shiprocket <ExternalLink className="size-3" />
              </a>
            )}
            <DrawerClose asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">
                Close
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
