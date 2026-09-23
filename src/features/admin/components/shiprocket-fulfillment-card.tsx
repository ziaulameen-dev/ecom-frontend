'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FastForward,
  FileText,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Send,
  Truck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAdvanceShiprocketState,
  useAssignAwb,
  useCancelShiprocketShipment,
  useCreateShiprocketOrder,
  useGenerateLabel,
  useSchedulePickup,
  useShippingRates,
  useShiprocketOrder,
  useTrackShipment,
} from '@/features/admin';
import { API_BASE } from '@/lib/config';
import type { AdminOrder, ShiprocketCourier } from '@/lib/types';

interface Props {
  order: AdminOrder;
}

export function ShiprocketFulfillmentCard({ order }: Props) {
  const { data: sr, isLoading, refetch } = useShiprocketOrder(order.id);
  const createSr = useCreateShiprocketOrder(order.id);
  const assignAwb = useAssignAwb(order.id);
  const schedulePickup = useSchedulePickup(order.id);
  const generateLabel = useGenerateLabel(order.id);
  const cancelSr = useCancelShiprocketShipment(order.id);

  const [assignOpen, setAssignOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  const isFulfilled = ['fulfilled', 'shipped', 'delivered'].includes(order.status);
  const isCancelled = order.status === 'cancelled';

  const handleCreate = async () => {
    try {
      await createSr.mutateAsync();
      toast.success('Shipment created in Shiprocket');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create Shiprocket shipment');
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Cancel Shiprocket Shipment?',
      description: 'This will cancel the shipment in Shiprocket.',
      confirmText: 'Cancel Shipment',
      destructive: true,
    });
    if (!ok) return;

    try {
      await cancelSr.mutateAsync();
      toast.success('Shipment cancelled');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel shipment');
    }
  };

  const resolveLabelUrl = (url: string) => (url.startsWith('http') ? url : `${API_BASE}${url}`);

  const handleDirectPrint = async () => {
    try {
      const res = await generateLabel.mutateAsync();
      if (!res?.labelUrl) {
        toast.error('No label URL returned from Shiprocket');
        return;
      }
      const fullUrl = resolveLabelUrl(res.labelUrl);

      // Open dedicated print window; auto-triggers window.print()
      const printWindow = window.open(
        fullUrl,
        'PrintShiprocketLabel',
        'width=460,height=680,menubar=no,toolbar=no,location=no,status=no',
      );
      if (printWindow) {
        printWindow.focus();
        printWindow.onload = () => {
          try {
            printWindow.print();
          } catch {
            // Handled inside child document if cross-origin
          }
        };
      }
      toast.success('Print window opened');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to trigger print');
    }
  };

  const handleOpenLabel = async () => {
    try {
      const res = await generateLabel.mutateAsync();
      if (!res?.labelUrl) {
        toast.error('No label URL returned');
        return;
      }
      window.open(resolveLabelUrl(res.labelUrl), '_blank');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open label');
    }
  };

  return (
    <Card>
      <CardHeader className="px-5 py-3.5 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Shiprocket Logistics</CardTitle>
        </div>
        {sr && (
          <Badge
            variant={
              sr.srStatus === 'DELIVERED'
                ? 'success'
                : sr.srStatus === 'CANCELLED'
                ? 'destructive'
                : 'default'
            }
            className="uppercase font-mono text-xs font-normal"
          >
            {sr.srStatus || 'Active'}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-4 text-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="size-4 animate-spin" /> Loading Shiprocket details…
          </div>
        ) : !sr ? (
          <div className="space-y-3">
            {!isFulfilled ? (
              <div className="rounded-md border border-dashed p-3 text-muted-foreground text-xs space-y-1">
                <div className="flex items-center gap-1 font-medium text-foreground">
                  <AlertCircle className="size-3.5" /> Order not ready for shipment
                </div>
                <p>
                  Mark this order as <strong>Fulfilled</strong> once packed to enable Shiprocket
                  shipment creation.
                </p>
              </div>
            ) : isCancelled ? (
              <p className="text-xs text-muted-foreground">Order was cancelled.</p>
            ) : (
              <div className="rounded-md bg-muted/40 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Order is fulfilled. Create a shipment to generate AWB and schedule pickup via
                  Shiprocket.
                </p>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={createSr.isPending}
                  className="gap-1.5 w-full sm:w-auto"
                >
                  {createSr.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Create Shiprocket Shipment
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Meta summary grid */}
            <div className="grid grid-cols-2 gap-2 text-xs rounded-md bg-muted/30 p-2.5">
              <div>
                <span className="text-muted-foreground block">SR Order ID:</span>
                <span className="font-mono font-medium">#{sr.shiprocketOrderId}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Shipment ID:</span>
                <span className="font-mono font-medium">#{sr.shipmentId}</span>
              </div>
              {sr.courierName && (
                <div>
                  <span className="text-muted-foreground block">Courier:</span>
                  <span className="font-medium">{sr.courierName}</span>
                </div>
              )}
              {sr.awb && (
                <div>
                  <span className="text-muted-foreground block">AWB:</span>
                  <span className="font-mono font-medium">{sr.awb}</span>
                </div>
              )}
              {sr.pickupScheduledDate && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Pickup Date:</span>
                  <span className="font-medium">{sr.pickupScheduledDate}</span>
                </div>
              )}
            </div>

            {/* Action buttons based on current state */}
            <div className="flex flex-wrap gap-2 pt-1">
              {!sr.awb && (
                <Button
                  size="sm"
                  onClick={() => setAssignOpen(true)}
                  className="gap-1.5"
                >
                  <Package className="size-3.5" /> Assign Courier & AWB
                </Button>
              )}

              {sr.awb && !sr.pickupScheduledDate && (
                <Button
                  size="sm"
                  onClick={() => setPickupOpen(true)}
                  className="gap-1.5"
                >
                  <Calendar className="size-3.5" /> Schedule Pickup
                </Button>
              )}

              {sr.awb && (
                <>
                  <Button
                    size="sm"
                    onClick={handleDirectPrint}
                    disabled={generateLabel.isPending}
                    className="gap-1.5"
                    title="Direct print thermal 4x6 label with window.print"
                  >
                    {generateLabel.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Printer className="size-3.5" />
                    )}
                    Print Label (4x6&quot;)
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenLabel}
                    disabled={generateLabel.isPending}
                    className="gap-1.5 text-xs"
                    title="Open label in new tab"
                  >
                    <ExternalLink className="size-3" /> View
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTrackOpen(true)}
                    className="gap-1.5"
                  >
                    <Truck className="size-3.5" /> Track Shipment
                  </Button>
                </>
              )}

              {sr.srStatus !== 'CANCELLED' && sr.srStatus !== 'DELIVERED' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={cancelSr.isPending}
                  className="text-destructive hover:text-destructive gap-1.5 ml-auto text-xs"
                >
                  <XCircle className="size-3.5" /> Cancel Shipment
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Dialogs */}
        <AssignCourierDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          orderId={order.id}
          onAssigned={() => {
            setAssignOpen(false);
            refetch();
          }}
        />

        <SchedulePickupDialog
          open={pickupOpen}
          onOpenChange={setPickupOpen}
          orderId={order.id}
          onScheduled={() => {
            setPickupOpen(false);
            refetch();
          }}
        />

        {sr?.awb && (
          <TrackDialog
            open={trackOpen}
            onOpenChange={setTrackOpen}
            orderId={order.id}
            awb={sr.awb}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ── Dialog: Select Courier & Assign AWB ─────────────────────────────────── */

function AssignCourierDialog({
  open,
  onOpenChange,
  orderId,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onAssigned: () => void;
}) {
  const { data: rates, isLoading } = useShippingRates(orderId, open);
  const assign = useAssignAwb(orderId);
  const [selectedCourierId, setSelectedCourierId] = useState<number | undefined>();

  const handleAssign = async (courierId?: number) => {
    try {
      await assign.mutateAsync(courierId);
      toast.success('Courier assigned and AWB generated');
      onAssigned();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign courier');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Courier & Generate AWB</DialogTitle>
          <DialogDescription>
            Choose a courier partner based on serviceability and rates for this order.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-5 animate-spin" /> Fetching available couriers…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {(rates ?? []).map((courier: ShiprocketCourier) => {
                const isSelected = selectedCourierId === courier.id;
                return (
                  <div
                    key={courier.id}
                    onClick={() => setSelectedCourierId(courier.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {courier.name}
                        {courier.is_surface && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            Surface
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ETD: {courier.etd} ({courier.etd_hours} hrs) · Perf: {courier.pickup_performance}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">₹{courier.rate}</div>
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'secondary'}
                        className="h-7 text-xs mt-1"
                        disabled={assign.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssign(courier.id);
                        }}
                      >
                        {assign.isPending && selectedCourierId === courier.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssign(undefined)}
                disabled={assign.isPending}
              >
                Auto-assign (Cheapest)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Dialog: Schedule Pickup ─────────────────────────────────────────────── */

function SchedulePickupDialog({
  open,
  onOpenChange,
  orderId,
  onScheduled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onScheduled: () => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDate);
  const schedule = useSchedulePickup(orderId);

  const handleSubmit = async () => {
    try {
      await schedule.mutateAsync(date);
      toast.success(`Pickup scheduled for ${date}`);
      onScheduled();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to schedule pickup');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule Courier Pickup</DialogTitle>
          <DialogDescription>
            Select a date for courier pickup from your warehouse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pickup-date">Pickup Date</Label>
            <Input
              id="pickup-date"
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={schedule.isPending}>
              {schedule.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Confirm Pickup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Dialog: Live Tracking ───────────────────────────────────────────────── */

function TrackDialog({
  open,
  onOpenChange,
  orderId,
  awb,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  awb: string;
}) {
  const { data: trackData, isLoading, refetch } = useTrackShipment(orderId, open);
  const advance = useAdvanceShiprocketState(orderId);

  const tracking = trackData?.tracking_data;
  const currentStatus = tracking?.shipment_track?.[0]?.current_status;
  const activities: any[] = tracking?.shipment_track_activities ?? [];

  const handleAdvance = async () => {
    try {
      const res = await advance.mutateAsync(awb);
      if (res?.success) {
        toast.success(`Simulator advanced to: ${res.current_status}`);
        refetch();
      } else {
        toast.info(res?.message || 'No further transitions');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to advance status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <DialogTitle className="text-base flex items-center gap-2">
              <Truck className="size-4" /> Tracking #{awb}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live updates from Shiprocket logistics network
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="size-8"
            title="Refresh tracking"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-5 animate-spin" /> Fetching latest scans…
          </div>
        ) : !tracking ? (
          <p className="text-sm text-muted-foreground py-4">No tracking data available.</p>
        ) : (
          <div className="space-y-4">
            {/* Current status header */}
            <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Current Status</span>
                <span className="font-semibold text-sm capitalize">{currentStatus || 'Processing'}</span>
              </div>
              {tracking?.etd && (
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Estimated Delivery</span>
                  <span className="font-medium text-xs">{tracking.etd}</span>
                </div>
              )}
            </div>

            {/* Timeline scans */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">Waiting for courier scans…</p>
              ) : (
                activities.map((act, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="size-2 rounded-full bg-primary mt-1.5" />
                      {idx !== activities.length - 1 && <div className="w-px flex-1 bg-border my-0.5" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="font-medium">{act.activity}</div>
                      <div className="text-muted-foreground text-[11px] flex justify-between mt-0.5">
                        <span>{act.location}</span>
                        <span>{act.date}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Simulator Advance button */}
            <div className="border-t pt-3 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvance}
                disabled={advance.isPending || currentStatus === 'DELIVERED'}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                title="Only available in simulator to test order delivery progression"
              >
                {advance.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FastForward className="size-3" />
                )}
                Advance State (Sim)
              </Button>

              {tracking?.track_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs"
                >
                  <a href={tracking.track_url} target="_blank" rel="noopener noreferrer">
                    Open Public Tracker <ExternalLink className="size-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
