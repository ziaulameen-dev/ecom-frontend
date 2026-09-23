'use client';

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Server,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePickupAddresses } from '@/features/admin';

export function ShiprocketSettingsCard() {
  const { data: addresses, isLoading, isError, refetch, isFetching } = usePickupAddresses();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              <CardTitle>Shiprocket Logistics Integration</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1.5 font-mono text-xs py-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              Simulator Mode Active
            </Badge>
          </div>
          <CardDescription>
            Manage automated shipment creation, courier assignment, pickup scheduling, and live tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center gap-2">
                <Server className="size-4 text-muted-foreground" /> API Endpoint Connection
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Test Ping
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Currently connected to the built-in <strong>Shiprocket API Simulator</strong>. All request and response
              structures match Shiprocket&apos;s production APIs with 100% fidelity.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded border bg-background p-2.5">
                <span className="text-muted-foreground block text-[11px]">Simulator URL (Dev):</span>
                <code className="font-mono text-xs">/api/shiprocket-sim/v1/external</code>
              </div>
              <div className="rounded border bg-background p-2.5">
                <span className="text-muted-foreground block text-[11px]">Live Shiprocket URL (Prod):</span>
                <code className="font-mono text-xs">https://apiv2.shiprocket.in/v1/external</code>
              </div>
            </div>
          </div>

          {/* Environment Variables Reference */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
              Production Configuration (.env)
            </h4>
            <div className="rounded-lg border bg-muted/20 p-3 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span>SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external', 'base')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>SHIPROCKET_EMAIL=your-api-user@example.com</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('SHIPROCKET_EMAIL=your-api-user@example.com', 'email')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>SHIPROCKET_PASSWORD=your-api-password</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('SHIPROCKET_PASSWORD=your-api-password', 'pwd')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>SHIPROCKET_PICKUP_CODE=Primary</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('SHIPROCKET_PICKUP_CODE=Primary', 'pickup')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              To go live, create an API User in your Shiprocket Dashboard (Settings → API → Add New API User) and set
              these variables in your backend <code>.env</code> file.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Pickup Locations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <CardTitle className="text-base">Warehouse Pickup Locations</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="size-8"
              title="Refresh warehouses"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Locations where couriers are scheduled to collect packages for delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isLoading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin" /> Loading pickup addresses…
            </div>
          ) : isError || !addresses || addresses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              No pickup locations found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {addresses.map((addr: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-3 bg-muted/20 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {addr.pickup_location || 'Primary Location'}
                      <Badge variant="secondary" className="text-[10px] py-0">
                        Default
                      </Badge>
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">PIN: {addr.pin_code}</span>
                  </div>
                  <div className="text-muted-foreground">{addr.address}</div>
                  <div className="text-muted-foreground">
                    {addr.city}, {addr.state}, {addr.country}
                  </div>
                  <div className="pt-1 text-[11px] text-muted-foreground flex justify-between border-t mt-2">
                    <span>Contact: {addr.name}</span>
                    <span>Phone: {addr.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Reference Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            <CardTitle className="text-base">Integrated Shipping Lifecycle</CardTitle>
          </div>
          <CardDescription>
            How Shiprocket is integrated into your admin order processing flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                Fulfilled Trigger
              </div>
              <p className="text-muted-foreground text-[11px]">
                When an order is packed and marked <strong>Fulfilled</strong>, the Shiprocket creation action activates.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                Courier & AWB
              </div>
              <p className="text-muted-foreground text-[11px]">
                Compare real-time rates (Delhivery, Bluedart, Xpressbees) and generate the official tracking AWB.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                Pickup & Labels
              </div>
              <p className="text-muted-foreground text-[11px]">
                Schedule warehouse pickup date and generate print-ready shipping label PDFs directly.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                Live Tracking
              </div>
              <p className="text-muted-foreground text-[11px]">
                View live transit scan milestones inline or test progression using the simulator advance tool.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
