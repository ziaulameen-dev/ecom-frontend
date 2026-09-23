'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  Pencil,
  Phone,
  Printer,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AuthImage } from '@/components/auth-image';
import { confirm } from '@/components/confirm-dialog';
import { TaxInvoiceModal } from '@/components/invoice/tax-invoice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useMediaQuery } from '@/lib/use-media-query';
import {
  ShiprocketFulfillmentCard,
  useAdminCancelOrder,
  useAdminOrder,
  useAdminProducts,
  useAdminReturns,
  useRefundOrder,
  useReturnAction,
  useSetTracking,
  useShipOrder,
  useUpdateOrderStatus,
} from '@/features/admin';
import type { AdminOrder, AdminReturn, OrderStatus } from '@/lib/types';
import { cn, formatDate, mediaSrc, money } from '@/lib/utils';

const badge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'success',
  processing: 'default',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'destructive',
  failed: 'destructive',
  refunded: 'outline',
};

const returnBadge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  requested: 'secondary',
  approved: 'default',
  received: 'default',
  refunded: 'success',
  rejected: 'destructive',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  // Direct single-order query (always loads the exact order by ID)
  const { data: order, isLoading, error } = useAdminOrder(id);
  const { data: returns } = useAdminReturns();
  const { data: adminProducts } = useAdminProducts();

  const setStatus = useUpdateOrderStatus();
  const setTracking = useSetTracking();
  const ship = useShipOrder();
  const cancel = useAdminCancelOrder();
  const refund = useRefundOrder();
  const returnAct = useReturnAction();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [trackOpen, setTrackOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Admin notes persisted locally
  const [adminNote, setAdminNote] = useState('');
  const [savedNote, setSavedNote] = useState('');

  const orderReturns: AdminReturn[] = useMemo(() => {
    if (order?.returns && order.returns.length > 0) return order.returns;
    return (returns ?? []).filter((r) => r.orderId === id || (r as any).order_id === id);
  }, [order, returns, id]);

  useEffect(() => {
    if (id) {
      const stored = localStorage.getItem(`admin_order_note_${id}`);
      if (stored) {
        setAdminNote(stored);
        setSavedNote(stored);
      }
    }
  }, [id]);

  const handleSaveNote = () => {
    if (id) {
      localStorage.setItem(`admin_order_note_${id}`, adminNote);
      setSavedNote(adminNote);
      toast.success('Admin note saved');
    }
  };

  const copyReference = () => {
    if (!order) return;
    const ref = order.reference ?? order.id;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast.success('Order reference copied');
  };

  const copyAddress = () => {
    if (!order?.shippingAddress) return;
    const a = order.shippingAddress;
    const text = [
      a.fullName,
      a.phone,
      a.line1,
      a.line2,
      `${a.city}, ${a.state} ${a.postalCode}`,
      a.country,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
    toast.success('Shipping address copied');
  };

  const run = (p: Promise<unknown>, msg: string) =>
    p.then(() => toast.success(msg)).catch((e) => toast.error((e as Error).message));

  const runReturn = (
    rid: string,
    action: 'approve' | 'reject' | 'receive' | 'refund' | 'refund_no_restock',
  ) =>
    returnAct
      .mutateAsync({ id: rid, action })
      .then(() => toast.success(`Return ${action}d`))
      .catch((e) => toast.error((e as Error).message));

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Loading order details…</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to orders
        </Link>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Order not found.</p>
          <Button asChild className="mt-4" variant="outline" size="sm">
            <Link href="/admin/orders">Return to orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const isConfirmed = order.status === 'confirmed';
  const canFulfil = isConfirmed;
  const canShip = isConfirmed || order.status === 'processing';
  const canDeliver = order.status === 'shipped';
  const alreadyRefunded = order.refundedMinor >= order.totalMinor;
  // Refund button is for post-shipment / post-delivery claims (pre-shipment orders use Cancel which auto-refunds)
  const canRefund = ['shipped', 'delivered'].includes(order.status) && !alreadyRefunded;
  const canCancel = ['pending', 'confirmed', 'processing'].includes(order.status);
  const canEditTracking = ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status);
  const orderRef = order.reference ?? `#${order.id.slice(0, 8)}`;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Top Header & Breadcrumb */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/orders" className="hover:text-foreground">
            Orders
          </Link>
          <span>/</span>
          <span className="font-mono text-foreground">{orderRef}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b pb-4">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              href="/admin/orders"
              className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Back to orders"
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {orderRef}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={copyReference}
                title="Copy reference"
              >
                {copiedRef ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={badge[order.status] ?? 'secondary'} className="capitalize text-xs sm:text-sm font-semibold px-2.5 py-0.5">
                {order.status}
              </Badge>

              <Badge variant="outline" className="text-xs uppercase font-medium">
                {order.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
              </Badge>

              {orderReturns.length > 0 && (
                <Badge variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300">
                  <RotateCcw className="size-3.5" /> {orderReturns.length} Return{orderReturns.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-sm font-medium flex-1 sm:flex-initial"
              onClick={() => setInvoiceOpen(true)}
            >
              <Printer className="size-4" />
              <span>Tax Invoice</span>
            </Button>

            {canFulfil && (
              <Button
                size="sm"
                className="h-9 gap-2 text-sm font-medium bg-[#187b7b] hover:bg-[#187b7b]/90 text-white flex-1 sm:flex-initial"
                onClick={() =>
                  run(
                    setStatus.mutateAsync({ id: order.id, status: 'processing' as OrderStatus }),
                    'Marked processing',
                  )
                }
              >
                <CheckCircle2 className="size-4" />
                <span>Mark Processing</span>
              </Button>
            )}

            {canShip && (
              <Button
                size="sm"
                className="h-9 gap-2 text-sm font-medium bg-[#187b7b] hover:bg-[#187b7b]/90 text-white flex-1 sm:flex-initial"
                onClick={() => setTrackOpen(true)}
              >
                <Truck className="size-4" />
                <span>Mark Shipped</span>
              </Button>
            )}

            {canDeliver && (
              <Button
                size="sm"
                className="h-9 gap-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
                onClick={() =>
                  run(
                    setStatus.mutateAsync({ id: order.id, status: 'delivered' as OrderStatus }),
                    'Marked delivered',
                  )
                }
              >
                <PackageCheck className="size-4" />
                <span>Mark Delivered</span>
              </Button>
            )}

            {canRefund && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-sm font-medium text-amber-700 border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/20 flex-1 sm:flex-initial"
                onClick={() => setRefundOpen(true)}
              >
                <RotateCcw className="size-4" />
                <span>Refund</span>
              </Button>
            )}

            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                className="h-9 gap-2 text-sm font-medium flex-1 sm:flex-initial"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle className="size-4" />
                <span>Cancel</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Order Progression Stepper */}
      <OrderStepper order={order} />

      {/* Tabs Layout — Matching Orders List Page Tab Bar Style with w-fit container */}
      <div className="space-y-6">
        <div className="w-fit flex items-center gap-1.5 overflow-x-auto border-b pb-px whitespace-nowrap scrollbar-none">
          {[
            { key: 'overview', label: 'Overview', icon: null, count: null },
            { key: 'fulfillment', label: 'Shipping & Courier', icon: Truck, count: null },
            {
              key: 'returns',
              label: 'Returns',
              icon: RotateCcw,
              count: orderReturns.length > 0 ? orderReturns.length : null,
            },
            { key: 'activity', label: 'Timeline & Notes', icon: History, count: null },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'border-[#187b7b] font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {Icon && <Icon className="size-4" />}
                <span>{t.label}</span>
                {t.count !== null && (
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums',
                      isActive ? 'bg-[#187b7b] text-white' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

        {/* ── TAB 1: OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-5 mt-0">
          <div className="grid gap-5 lg:grid-cols-[1fr_360px] items-start">
            {/* Left: Items & Financial Breakdown */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Package className="size-4.5 text-primary" />
                    <span>Order Items</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {order.items.reduce((s, it) => s + it.quantity, 0)} {order.items.reduce((s, it) => s + it.quantity, 0) === 1 ? 'item' : 'items'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-5 py-3 font-semibold">Product</th>
                          <th className="px-5 py-3 font-semibold text-center">Qty</th>
                          <th className="px-5 py-3 font-semibold text-right">Price</th>
                          <th className="px-5 py-3 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((it, i) => {
                          const matchingProduct = adminProducts?.find((p) => p.id === it.productId);
                          const variantMatch = it.variantId
                            ? matchingProduct?.variants?.find((v) => v.id === it.variantId)
                            : null;
                          const resolvedImg =
                            it.imageUrl ||
                            variantMatch?.images?.[0] ||
                            matchingProduct?.imageUrl ||
                            matchingProduct?.media?.[0]?.url ||
                            null;

                          return (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  {resolvedImg ? (
                                    <img
                                      src={mediaSrc(resolvedImg)}
                                      alt={it.name}
                                      className="size-12 rounded-lg border object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="size-12 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                                      <Package className="size-5 text-muted-foreground/50" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground text-sm truncate">{it.name}</p>
                                    {it.variantLabel && (
                                      <p className="text-xs sm:text-sm text-muted-foreground">{it.variantLabel}</p>
                                    )}
                                    <p className="font-mono text-xs text-muted-foreground/70 mt-0.5">
                                      SKU: {it.variantId || it.productId.slice(0, 8)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-center text-muted-foreground font-medium text-sm">
                                {it.quantity}
                              </td>
                              <td className="px-5 py-3.5 text-right text-muted-foreground text-sm">
                                {money(it.unitAmountMinor, order.currency)}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-foreground text-sm">
                                {money(it.unitAmountMinor * it.quantity, order.currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Breakdown */}
              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CreditCard className="size-4.5 text-primary" />
                    <span>Payment & Totals</span>
                  </CardTitle>
                  <Badge variant={order.paymentMethod === 'cod' ? 'outline' : 'secondary'} className="capitalize text-xs font-medium">
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-sm">
                  <Row label="Subtotal" value={money(order.subtotalMinor, order.currency)} />
                  {order.discountMinor > 0 && (
                    <Row
                      label={
                        <span className="flex items-center gap-1.5">
                          <span>Discount</span>
                          {order.couponCode && (
                            <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0">
                              {order.couponCode}
                            </Badge>
                          )}
                        </span>
                      }
                      value={<span className="text-emerald-600 font-semibold">− {money(order.discountMinor, order.currency)}</span>}
                    />
                  )}
                  <Row
                    label="Shipping"
                    value={order.shippingMinor > 0 ? money(order.shippingMinor, order.currency) : <span className="text-emerald-600 font-semibold">Free</span>}
                  />
                  {order.taxMinor > 0 && <Row label="GST / Tax" value={money(order.taxMinor, order.currency)} />}
                  <div className="border-t pt-3 mt-1">
                    <Row
                      label={<span className="text-base font-bold text-foreground">Total</span>}
                      value={<span className="text-lg font-bold text-foreground">{money(order.totalMinor, order.currency)}</span>}
                      strong
                    />
                  </div>
                  {order.refundedMinor > 0 && (
                    <div className="border-t pt-3">
                      <Row
                        label={<span className="text-destructive font-medium text-sm">Total Refunded</span>}
                        value={<span className="text-destructive font-semibold">− {money(order.refundedMinor, order.currency)}</span>}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Status & Refund Lifecycle Timeline */}
              <OrderStatusTimeline order={order} orderReturns={orderReturns} />
            </div>

            {/* Right: Quick Customer & Shipping Snapshot */}
            <div className="space-y-5">
              {/* Customer Card */}
              {(() => {
                const phone = addr?.phone || (order as any).customerPhone || '';
                const cleanPhone = phone.replace(/\D/g, '');
                const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const waText = encodeURIComponent(`Hi ${addr?.fullName?.split(' ')[0] || ''}, regarding your order ${orderRef}: `);
                const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waText}` : null;

                return (
                  <Card>
                    <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <User className="size-4.5 text-muted-foreground" />
                        <span>Customer Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-[#187b7b] text-white flex items-center justify-center font-bold text-base shrink-0">
                          {(addr?.fullName || order.customerEmail || 'C').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-base text-foreground truncate">
                            {addr?.fullName || 'Registered User'}
                          </p>
                          <p className="text-muted-foreground truncate text-sm">{order.customerEmail ?? '—'}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3.5">
                        {addr?.phone && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 text-muted-foreground">
                              <Phone className="size-4 shrink-0" />
                              <span className="truncate text-foreground font-medium text-sm">{addr.phone}</span>
                            </div>
                            <a
                              href={`tel:${addr.phone}`}
                              className="text-[#187b7b] hover:underline text-xs font-semibold shrink-0 ml-1 uppercase"
                            >
                              Call
                            </a>
                          </div>
                        )}
                        {order.customerEmail && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 text-muted-foreground">
                              <Mail className="size-4 shrink-0" />
                              <span className="truncate text-foreground font-medium text-sm">{order.customerEmail}</span>
                            </div>
                            <a
                              href={`mailto:${order.customerEmail}?subject=Order%20${encodeURIComponent(orderRef)}`}
                              className="text-[#187b7b] hover:underline text-xs font-semibold shrink-0 ml-1 uppercase"
                            >
                              Email
                            </a>
                          </div>
                        )}
                      </div>

                      {waUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-9 text-sm gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
                          asChild
                        >
                          <a href={waUrl} target="_blank" rel="noopener noreferrer">
                            <svg className="size-4 fill-current text-emerald-600" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-10.416c-4.417 0-8 3.584-8 8 0 1.488.408 2.88 1.118 4.076l-1.188 4.342 4.453-1.168c1.139.625 2.443.972 3.823.972 4.417 0 8-3.584 8-8 0-4.416-3.583-8-8.006-8zm0 14.5c-1.229 0-2.38-.344-3.364-.943l-.241-.148-2.497.655.666-2.433-.162-.257c-.672-1.068-1.028-2.313-1.028-3.602 0-3.584 2.916-6.5 6.5-6.5s6.5 2.916 6.5 6.5-2.916 6.5-6.5 6.5z"/>
                            </svg>
                            <span>Chat on WhatsApp</span>
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Delivery Address Card */}
              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="size-4.5 text-muted-foreground" />
                    <span>Shipping Address</span>
                  </CardTitle>
                  {addr && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={copyAddress}
                    >
                      {copiedAddr ? <Check className="size-3.5 text-emerald-600 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                      <span>Copy</span>
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-5 space-y-2 text-sm text-muted-foreground">
                  {addr ? (
                    <>
                      <p className="font-semibold text-foreground text-base">{addr.fullName}</p>
                      <p className="text-foreground/90 leading-relaxed">{addr.line1}</p>
                      {addr.line2 && <p className="text-foreground/90 leading-relaxed">{addr.line2}</p>}
                      <p className="text-foreground/90 font-medium leading-relaxed">
                        {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-foreground/80">{addr.country}</p>
                    </>
                  ) : (
                    <p>No shipping address provided.</p>
                  )}
                </CardContent>
              </Card>

              {/* Shipping & Courier Card */}
              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Truck className="size-4.5 text-muted-foreground" />
                    <span>Shipping & Courier</span>
                  </CardTitle>
                  <Badge variant={badge[order.status] ?? 'secondary'} className="capitalize text-xs font-medium">
                    {order.status}
                  </Badge>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-sm">
                  {order.trackingNumber ? (
                    <div className="rounded-lg border p-3.5 bg-muted/20 space-y-2.5">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm">Carrier</span>
                        <span className="font-semibold text-foreground text-sm">{order.carrier || 'Courier'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tracking Number</span>
                        <span className="font-mono font-medium text-foreground text-sm">{order.trackingNumber}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center bg-muted/10 space-y-1.5">
                      <Package className="size-5 mx-auto text-muted-foreground/60" />
                      <p className="text-muted-foreground text-sm">No tracking number assigned yet</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    {canEditTracking && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-sm h-9 gap-2 font-medium"
                        onClick={() => setTrackOpen(true)}
                      >
                        <Package className="size-4" />
                        <span>{order.trackingNumber ? 'Update Tracking Info' : 'Add Tracking Info'}</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-sm h-8 text-muted-foreground hover:text-foreground font-medium"
                      onClick={() => setActiveTab('fulfillment')}
                    >
                      <span>Manage in Shipping & Courier →</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: SHIPPING & COURIER ── */}
        <TabsContent value="fulfillment" className="space-y-5 mt-0">
          <div className="grid gap-5 lg:grid-cols-[1fr_360px] items-start">
            {/* Left: Shiprocket fulfillment card & logistics */}
            <div className="space-y-5">
              <ShiprocketFulfillmentCard order={order} />

              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Truck className="size-4.5 text-primary" />
                    <span>Manual Carrier & Tracking</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If you are fulfilling this shipment manually outside Shiprocket, you can configure the carrier name and shipment tracking number here.
                  </p>

                  <div className="rounded-lg border p-4 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Tracking Status</p>
                      {order.trackingNumber ? (
                        <p className="text-base font-semibold font-mono mt-1 text-foreground">
                          {order.carrier} — {order.trackingNumber}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic mt-1">No tracking assigned yet</p>
                      )}
                    </div>
                    {canEditTracking && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-sm h-9 gap-2 font-medium"
                        onClick={() => setTrackOpen(true)}
                      >
                        <Pencil className="size-4" />
                        <span>{order.trackingNumber ? 'Edit Tracking' : 'Set Tracking'}</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Shipping Address Details */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="size-4.5 text-muted-foreground" />
                    <span>Shipping Destination</span>
                  </CardTitle>
                  {addr && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-medium"
                      onClick={copyAddress}
                    >
                      {copiedAddr ? <Check className="size-3.5 text-emerald-600 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                      <span>Copy Address</span>
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-5 space-y-2 text-sm text-muted-foreground">
                  {addr ? (
                    <div className="space-y-2 rounded-lg border p-3.5 bg-muted/10 text-sm">
                      <p className="font-semibold text-base text-foreground">{addr.fullName}</p>
                      {addr.phone && (
                        <p className="flex items-center gap-2 text-foreground/90 font-medium">
                          <Phone className="size-4 shrink-0 text-muted-foreground" />
                          <span>{addr.phone}</span>
                        </p>
                      )}
                      <p className="text-foreground/90 leading-relaxed">{addr.line1}</p>
                      {addr.line2 && <p className="text-foreground/90 leading-relaxed">{addr.line2}</p>}
                      <p className="text-foreground font-medium leading-relaxed">
                        {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-foreground/80">{addr.country}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No address available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: RETURNS & REFUNDS ── */}
        <TabsContent value="returns" className="space-y-5 mt-0">
          {orderReturns.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <RotateCcw className="size-6 text-muted-foreground/60" />
              </div>
              <h3 className="text-base font-semibold">No Returns Requested</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                There are currently no return or refund requests associated with this order.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {orderReturns.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="px-5 py-3.5 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={returnBadge[r.status] ?? 'secondary'} className="capitalize">
                        {r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Requested {formatDate(r.createdAt)}
                      </span>
                    </div>
                    {r.refundMinor > 0 && (
                      <Badge variant="outline" className="font-semibold text-emerald-600 border-emerald-300">
                        Refunded {money(r.refundMinor, order.currency)}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-sm">
                    {/* Return items */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Returned Items
                      </p>
                      <ul className="divide-y rounded-md border">
                        {r.items.map((it) => {
                          const oi = order.items.find((i) => i.productId === it.productId);
                          return (
                            <li key={it.productId} className="flex items-center justify-between p-3 text-sm">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{oi?.name ?? it.productId}</p>
                                {oi?.variantLabel && (
                                  <p className="text-xs text-muted-foreground">{oi.variantLabel}</p>
                                )}
                              </div>
                              <span className="font-semibold text-muted-foreground ml-3">
                                × {it.quantity}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {r.reason && (
                      <div className="rounded-lg bg-muted/40 p-3.5 text-sm">
                        <p className="font-semibold text-muted-foreground">Reason for return:</p>
                        <p className="mt-1 text-foreground leading-relaxed">{r.reason}</p>
                      </div>
                    )}

                    {r.images && r.images.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Customer Photos ({r.images.length})
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                          {r.images.map((key) => (
                            <AuthImage
                              key={key}
                              zoomable
                              path={`/api/returns/${r.id}/images/${key.split('/').pop()}`}
                              className="size-20 rounded-lg border object-cover shadow-xs"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* RMA Status Transition Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        Status:{' '}
                        <strong className="capitalize text-foreground font-semibold">{r.status}</strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {r.status === 'requested' && (
                          <>
                            <Button
                              size="sm"
                              className="text-sm h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              onClick={() => runReturn(r.id, 'approve')}
                              disabled={returnAct.isPending}
                            >
                              Approve Return
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-sm h-9 font-medium"
                              onClick={() => runReturn(r.id, 'reject')}
                              disabled={returnAct.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {r.status === 'approved' && (
                          <>
                            <Button
                              size="sm"
                              className="text-sm h-9 bg-[#187b7b] hover:bg-[#187b7b]/90 text-white font-medium"
                              onClick={() => runReturn(r.id, 'receive')}
                              disabled={returnAct.isPending}
                            >
                              Mark Received
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-sm h-9 font-medium"
                              onClick={() => runReturn(r.id, 'reject')}
                              disabled={returnAct.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {r.status === 'received' && (
                          <>
                            <Button
                              size="sm"
                              className="text-sm h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium"
                              onClick={() => runReturn(r.id, 'refund')}
                              disabled={returnAct.isPending}
                            >
                              <RotateCcw className="size-4" />
                              <span>{order.refundedMinor >= order.totalMinor ? 'Restock Items' : 'Refund & Restock'}</span>
                            </Button>
                            {order.refundedMinor < order.totalMinor && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-sm h-9 font-medium"
                                onClick={() => runReturn(r.id, 'refund_no_restock')}
                                disabled={returnAct.isPending}
                              >
                                Refund Only (No Restock)
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-sm h-9 font-medium"
                              onClick={() => runReturn(r.id, 'reject')}
                              disabled={returnAct.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {(r.status === 'refunded' || r.status === 'rejected') && (
                          <Link
                            href="/admin/returns"
                            className="text-sm text-muted-foreground hover:text-foreground font-medium"
                          >
                            Manage in Admin Returns Hub →
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 5: TIMELINE & NOTES ── */}
        <TabsContent value="activity" className="space-y-5 mt-0">
          <div className="grid gap-5 lg:grid-cols-[1fr_380px] items-start">
            {/* Left: Full Order Lifecycle & Audit History */}
            <div>
              <OrderStatusTimeline order={order} orderReturns={orderReturns} />
            </div>

            {/* Right: Staff Notes & Technical Metadata */}
            <div className="space-y-5">
              {/* Internal Staff Notes */}
              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="size-4.5 text-primary" />
                    <span>Internal Staff Notes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Private notes and handover comments for the operations team. These notes are never shown to the customer.
                  </p>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g. Customer requested special packing or called to confirm delivery date…"
                    className="min-h-[120px] text-sm"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {savedNote === adminNote && savedNote ? 'Saved' : 'Unsaved changes'}
                    </span>
                    <Button
                      size="sm"
                      className="h-9 px-4 text-sm font-medium bg-[#187b7b] hover:bg-[#187b7b]/90 text-white"
                      onClick={handleSaveNote}
                    >
                      Save Note
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Metadata */}
              <Card>
                <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShieldCheck className="size-4.5 text-primary" />
                    <span>Order Audit Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-sm">
                  <Row label="Order ID" value={<span className="font-mono text-sm">{order.id}</span>} />
                  <Row label="Reference" value={<span className="font-mono text-sm">{order.reference ?? '—'}</span>} />
                  <Row label="Customer User ID" value={<span className="font-mono text-sm">{order.userId ?? 'Guest'}</span>} />
                  <Row label="Placed At" value={formatDate(order.createdAt)} />
                  <Row label="Updated At" value={order.updatedAt ? formatDate(order.updatedAt) : '—'} />
                  <Row label="Payment Gateway" value={order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Cashfree Payments'} />
                  {order.paymentRef && (
                    <Row label="Payment Reference" value={<span className="font-mono text-sm">{order.paymentRef}</span>} />
                  )}
                  {order.cancelReason && (
                    <Row label="Cancellation Reason" value={<span className="text-destructive font-semibold text-sm">{order.cancelReason}</span>} />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* Ship / Tracking Dialog */}
      <ShipDialog
        open={trackOpen}
        onOpenChange={setTrackOpen}
        initialCarrier={order.carrier ?? ''}
        initialTracking={order.trackingNumber ?? ''}
        onSubmit={(carrier, trackingNumber) => {
          if (['confirmed', 'processing'].includes(order.status)) {
            // Atomic ship: sets tracking + transitions to 'shipped' in one call
            run(ship.mutateAsync({ id: order.id, carrier, trackingNumber }), 'Order shipped');
          } else {
            // Already shipped — just update tracking without changing status
            run(setTracking.mutateAsync({ id: order.id, carrier, trackingNumber }), 'Tracking updated');
          }
        }}
      />

      {/* Cancel Dialog (responsive modal on desktop, bottom drawer on mobile) */}
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderRef={orderRef}
        isPrepaid={order.paymentMethod === 'prepaid'}
        totalFormatted={money(order.totalMinor, order.currency)}
        onSubmit={(reason) =>
          run(cancel.mutateAsync({ id: order.id, reason: reason || undefined }), 'Order cancelled')
        }
      />

      {/* Refund Dialog — supports full and partial refunds */}
      <RefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        totalMinor={order.totalMinor}
        refundedMinor={order.refundedMinor}
        currency={order.currency}
        onSubmit={(amountMinor) =>
          run(refund.mutateAsync({ id: order.id, amountMinor: amountMinor || undefined }), 'Refund issued')
        }
      />

      {/* Tax Invoice Modal */}
      <TaxInvoiceModal
        order={order}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />
    </div>
  );
}

/** Visual Order Progression Stepper */
function OrderStepper({
  order,
  orderReturns = [],
}: {
  order: AdminOrder;
  orderReturns?: AdminReturn[];
}) {
  if (order.status === 'cancelled') {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 flex items-start gap-3.5 text-sm text-muted-foreground">
        <XCircle className="size-5 shrink-0 text-muted-foreground mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-base text-foreground">Order Cancelled</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {order.cancelReason ? `Reason: ${order.cancelReason}` : 'This order was cancelled.'}
          </p>
        </div>
      </div>
    );
  }

  if (order.status === 'failed') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-4 sm:p-5 flex items-start gap-3.5 text-sm text-red-800 dark:text-red-300">
        <AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-base">Payment Failed</p>
          <p className="text-sm text-red-600/90 dark:text-red-400/90 leading-relaxed">
            Payment could not be completed for this order.
          </p>
        </div>
      </div>
    );
  }

  if (order.status === 'refunded') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-purple-800 dark:text-purple-300">
          <div className="flex items-start gap-3.5">
            <RotateCcw className="size-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-base">Order Status: Refunded</p>
              <p className="text-sm text-purple-700/90 dark:text-purple-300/90 leading-relaxed">
                100% refund processed ({money(order.refundedMinor || order.totalMinor, order.currency)}).
                {orderReturns.length > 0
                  ? ` Completed via customer return request #${orderReturns[0].id.slice(0, 8)}.`
                  : ' Settled via direct refund.'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-300 text-purple-700 bg-white/60 dark:bg-purple-950/60 font-semibold px-2.5 py-1 shrink-0 text-xs">
            Settled & Closed
          </Badge>
        </div>
      </div>
    );
  }

  if (order.status === 'pending') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-base">Payment Pending / Awaiting Confirmation</p>
              <p className="text-sm text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                Customer started checkout. Awaiting payment authorization or bank settlement.
                {order.paymentRef && ` (Gateway Order ID: ${order.paymentRef})`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-800 bg-white/60 dark:bg-amber-950/60 font-semibold px-2.5 py-1 shrink-0 text-xs">
            Awaiting Payment
          </Badge>
        </div>

        <Card className="p-4 sm:p-6">
          <div className="relative flex items-center justify-between">
            <div className="absolute top-4 left-4 right-4 h-0.5 -translate-y-1/2 bg-muted z-0">
              <div className="h-full bg-[#187b7b] transition-all duration-500" style={{ width: '0%' }} />
            </div>

            {[
              { id: 'placed', label: 'Placed', desc: formatDate(order.createdAt).split(',')[0] },
              { id: 'confirmed', label: 'Confirmed', desc: 'Awaiting Payment' },
              { id: 'shipped', label: 'Shipped', desc: 'Pending' },
              { id: 'delivered', label: 'Delivered', desc: 'Expected' },
            ].map((step, idx) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    'size-8 sm:size-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all',
                    idx === 0
                      ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 shadow-xs'
                      : 'bg-background border-2 border-muted-foreground/30 text-muted-foreground/40',
                  )}
                >
                  {idx === 0 ? <span className="size-2.5 rounded-full bg-white animate-pulse" /> : <span className="size-2 rounded-full bg-muted-foreground/30" />}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn('text-xs sm:text-sm font-semibold', idx === 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground/60')}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block truncate max-w-[100px] mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const steps = [
    { id: 'placed', label: 'Placed', desc: formatDate(order.createdAt).split(',')[0] },
    {
      id: 'confirmed',
      label: 'Confirmed',
      desc: order.status === 'processing'
        ? 'Packing'
        : order.paymentMethod === 'cod'
        ? 'COD Confirmed'
        : 'Payment Verified',
    },
    {
      id: 'processing',
      label: 'Processing',
      desc: ['processing', 'shipped', 'delivered'].includes(order.status) ? 'Packing / Dispatch' : 'Pending',
    },
    {
      id: 'shipped',
      label: 'Shipped',
      desc: order.carrier || (['shipped', 'delivered'].includes(order.status) ? 'Dispatched' : 'Pending'),
    },
    { id: 'delivered', label: 'Delivered', desc: order.status === 'delivered' ? 'Completed' : 'Expected' },
  ];

  const getActiveIndex = (): number => {
    switch (order.status) {
      case 'pending':
        return 0;
      case 'confirmed':
        return 1;
      case 'processing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveIndex();
  const isDelivered = order.status === 'delivered';

  return (
    <Card className="p-4 sm:p-6">
      <div className="relative flex items-center justify-between">
        {/* Track */}
        <div className="absolute top-4 left-4 right-4 h-0.5 -translate-y-1/2 bg-muted z-0">
          <div
            className="h-full bg-[#187b7b] transition-all duration-500"
            style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, idx) => {
          const isCompleted = isDelivered || idx < activeIndex;
          const isCurrent = !isDelivered && idx === activeIndex;
          const isUpcoming = idx > activeIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  'size-8 sm:size-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all',
                  isCompleted && 'bg-[#187b7b] text-white shadow-xs',
                  isCurrent && 'bg-[#187b7b] text-white ring-4 ring-[#187b7b]/20 shadow-xs',
                  isUpcoming && 'bg-background border-2 border-muted-foreground/30 text-muted-foreground/40',
                )}
              >
                {isCompleted ? (
                  <Check className="size-4 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="size-2.5 rounded-full bg-white animate-pulse" />
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-xs sm:text-sm font-semibold',
                    isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground/60',
                    isCurrent && 'text-[#187b7b]',
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block truncate max-w-[100px] mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Rich Audit Trail & Status Lifecycle Timeline */
function OrderStatusTimeline({
  order,
  orderReturns,
}: {
  order: AdminOrder;
  orderReturns: AdminReturn[];
}) {
  const events = useMemo(() => {
    const list: {
      id: string;
      title: string;
      description: React.ReactNode;
      timestamp: string;
      status: string;
      badgeVariant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline';
      icon: React.ElementType;
      color: string;
    }[] = [];

    // 1. Order Placed
    list.push({
      id: 'order-created',
      title: 'Order Placed',
      description: `Order ${order.reference ?? `#${order.id.slice(0, 8)}`} created for ${money(order.totalMinor, order.currency)} with ${(order.items ?? []).length} item(s).`,
      timestamp: formatDate(order.createdAt),
      status: 'Placed',
      badgeVariant: 'secondary',
      icon: ShoppingCart,
      color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',
    });

    // 2. Payment Confirmation
    if (order.paymentMethod === 'cod') {
      list.push({
        id: 'payment-cod',
        title: 'COD Order Confirmed',
        description: `Cash on Delivery selected. Balance of ${money(order.totalMinor, order.currency)} payable at delivery.`,
        timestamp: formatDate(order.createdAt),
        status: 'Processing',
        badgeVariant: 'secondary',
        icon: CreditCard,
        color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
      });
    } else if (['confirmed', 'processing', 'shipped', 'delivered', 'refunded'].includes(order.status) || order.paymentRef) {
      list.push({
        id: 'payment-confirmed',
        title: 'Payment Confirmed',
        description: `Online payment of ${money(order.totalMinor, order.currency)} verified via Cashfree.${order.paymentRef ? ` (Ref: ${order.paymentRef})` : ''}`,
        timestamp: formatDate(order.createdAt),
        status: 'Confirmed',
        badgeVariant: 'success',
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
      });
    }

    // 3. Shipped / Dispatched
    if (order.trackingNumber || order.carrier || ['shipped', 'delivered', 'refunded'].includes(order.status)) {
      list.push({
        id: 'shipped',
        title: 'Dispatched & Handed to Carrier',
        description: order.trackingNumber
          ? `Package shipped via ${order.carrier || 'Courier'} with tracking number: ${order.trackingNumber}`
          : `Order marked as shipped and handed to logistics partner.`,
        timestamp: formatDate(order.updatedAt || order.createdAt),
        status: 'Shipped',
        badgeVariant: 'default',
        icon: Truck,
        color: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800',
      });
    }

    // 4. Delivered
    if (order.status === 'delivered' || (order.status === 'refunded' && orderReturns.length > 0)) {
      list.push({
        id: 'delivered',
        title: 'Delivered to Recipient',
        description: `Package delivered to ${order.shippingAddress?.fullName || 'Customer'} at ${order.shippingAddress?.city || ''}${order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''}.`,
        timestamp: formatDate(order.updatedAt || order.createdAt),
        status: 'Delivered',
        badgeVariant: 'success',
        icon: PackageCheck,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
      });
    }

    // 5. Return Requests (RMA)
    orderReturns.forEach((r) => {
      list.push({
        id: `return-req-${r.id}`,
        title: `Return Request Initiated (RMA #${r.id.slice(0, 8)})`,
        description: (
          <div className="space-y-1 mt-0.5">
            <p>Customer requested return for {r.items?.length || 1} item(s).</p>
            {r.reason && (
              <p className="italic text-muted-foreground">Reason: "{r.reason}"</p>
            )}
          </div>
        ),
        timestamp: formatDate(r.createdAt),
        status: 'Return: Requested',
        badgeVariant: 'secondary',
        icon: RotateCcw,
        color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800',
      });

      if (['approved', 'received', 'refunded'].includes(r.status)) {
        list.push({
          id: `return-app-${r.id}`,
          title: `Return Request Approved`,
          description: `Admin approved the return claim. Return transit authorization issued.`,
          timestamp: formatDate(r.updatedAt || r.createdAt),
          status: 'Return: Approved',
          badgeVariant: 'default',
          icon: Check,
          color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',
        });
      }

      if (['received', 'refunded'].includes(r.status)) {
        list.push({
          id: `return-rec-${r.id}`,
          title: `Returned Goods Received at Facility`,
          description: `Physical return package received at warehouse and verified by staff.`,
          timestamp: formatDate(r.updatedAt || r.createdAt),
          status: 'Return: Received',
          badgeVariant: 'default',
          icon: Package,
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800',
        });
      }

      if (r.status === 'refunded') {
        list.push({
          id: `return-ref-${r.id}`,
          title: `Return Settled: Refund Issued & Restocked`,
          description: `Refund of ${money(r.refundMinor || order.refundedMinor, order.currency)} completed. Item returned to sellable stock.`,
          timestamp: formatDate(r.updatedAt || r.createdAt),
          status: 'Return: Refunded',
          badgeVariant: 'success',
          icon: RotateCcw,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
        });
      }
    });

    // 6. Direct Cancellations or Order-Level Refund
    if (order.status === 'cancelled') {
      list.push({
        id: 'order-cancelled',
        title: 'Order Cancelled',
        description: order.cancelReason
          ? `Order cancelled. Reason: "${order.cancelReason}"`
          : 'Order was cancelled.',
        timestamp: formatDate(order.updatedAt || order.createdAt),
        status: 'Cancelled',
        badgeVariant: 'destructive',
        icon: XCircle,
        color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800',
      });
    } else if (order.status === 'refunded') {
      list.push({
        id: 'order-refunded-final',
        title: 'Order Status Transitioned to Refunded',
        description: `100% of order value (${money(order.totalMinor, order.currency)}) refunded. Final order status closed as 'refunded'.`,
        timestamp: formatDate(order.updatedAt || order.createdAt),
        status: 'Refunded',
        badgeVariant: 'outline',
        icon: RotateCcw,
        color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800',
      });
    }

    return list;
  }, [order, orderReturns]);

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <History className="size-4.5 text-primary" />
          <span>Order Lifecycle & Status History</span>
        </CardTitle>
        <Badge variant="outline" className="text-xs font-medium">
          {events.length} Event{events.length > 1 ? 's' : ''}
        </Badge>
      </CardHeader>
      <CardContent className="p-5">
        <div className="relative pl-10 sm:pl-12 space-y-6 before:absolute before:left-[13px] sm:before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
          {events.map((ev) => {
            const Icon = ev.icon;
            return (
              <div key={ev.id} className="relative group">
                {/* Node icon */}
                <div
                  className={cn(
                    'absolute -left-10 sm:-left-12 top-0 flex size-7 sm:size-8 items-center justify-center rounded-full border bg-background shadow-xs shrink-0 z-10',
                    ev.color,
                  )}
                >
                  <Icon className="size-3.5 sm:size-4 stroke-[2.2]" />
                </div>

                {/* Event Content */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{ev.title}</span>
                      <Badge variant={ev.badgeVariant} className="text-xs px-2 py-0">
                        {ev.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{ev.timestamp}</span>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {ev.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-bold text-foreground' : 'text-right font-medium text-foreground'}>{value}</span>
    </div>
  );
}

/** Collect carrier + tracking number dialog */
function ShipDialog({
  open,
  onOpenChange,
  initialCarrier = '',
  initialTracking = '',
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCarrier?: string;
  initialTracking?: string;
  onSubmit: (carrier: string, trackingNumber: string) => void;
}) {
  const [carrier, setCarrier] = useState(initialCarrier);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const commonCarriers = ['Shiprocket', 'Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Shadowfax', 'Ecom Express'];

  useEffect(() => {
    if (open) {
      setCarrier(initialCarrier);
      setTrackingNumber(initialTracking);
    }
  }, [open, initialCarrier, initialTracking]);

  function submit() {
    if (!carrier.trim()) return toast.error('Carrier is required');
    if (!trackingNumber.trim()) return toast.error('Tracking number is required');
    onSubmit(carrier.trim(), trackingNumber.trim());
    onOpenChange(false);
  }

  const formBody = (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="ship-carrier" className="text-sm font-medium">Courier / Carrier Partner</Label>
        <div className="flex flex-wrap gap-2 mb-1.5">
          {commonCarriers.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCarrier(c)}
              className={cn(
                'text-xs sm:text-sm px-3 py-1.5 rounded-lg border transition-colors',
                carrier.toLowerCase() === c.toLowerCase()
                  ? 'border-[#187b7b] bg-[#187b7b]/10 text-[#187b7b] font-semibold'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <Input
          id="ship-carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="e.g. BlueDart, Delhivery, DTDC"
          className="text-sm h-10"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ship-tracking" className="text-sm font-medium">AWB / Tracking Number</Label>
        <Input
          id="ship-tracking"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="e.g. 123456789012"
          className="text-sm h-10 font-mono"
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3">
        <Button type="button" variant="outline" className="h-11 sm:h-10 text-sm font-medium sm:w-auto w-full" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" className="h-11 sm:h-10 text-sm font-semibold sm:w-auto w-full bg-[#187b7b] hover:bg-[#187b7b]/90 text-white gap-2" onClick={submit}>
          <Truck className="size-4" />
          <span>Save Tracking Info</span>
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-5 pb-8 sm:pb-6 rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="text-left p-0 pb-3">
            <DrawerTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              <span>{initialTracking ? 'Edit Shipment Tracking' : 'Mark as Shipped'}</span>
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-0.5">
              Enter courier partner name and tracking number to update dispatch details.
            </DrawerDescription>
          </DrawerHeader>
          {formBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Truck className="size-4 text-primary" />
            <span>{initialTracking ? 'Edit Shipment Tracking' : 'Mark as Shipped'}</span>
          </DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

/** Cancel order with reason dialog (responsive modal on desktop, bottom drawer on mobile) */
function CancelDialog({
  open,
  onOpenChange,
  orderRef,
  isPrepaid,
  totalFormatted,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderRef?: string;
  isPrepaid?: boolean;
  totalFormatted?: string;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const quickReasons = [
    'Customer requested cancellation',
    'Item is out of stock',
    'Incorrect shipping address',
    'Duplicate order placed',
    'Payment discrepancy',
  ];

  function handleOpenChange(next: boolean) {
    if (next) setReason('');
    onOpenChange(next);
  }

  function submit() {
    if (!reason.trim()) {
      toast.error('Please select or enter a cancellation reason');
      return;
    }
    onSubmit(reason.trim());
    onOpenChange(false);
  }

  const contentBody = (
    <div className="space-y-4 py-2">
      {/* Alert banner */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
        <div className="size-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="size-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">
            {orderRef ? `Cancelling Order ${orderRef}` : 'Are you sure you want to cancel this order?'}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Reserved inventory will be returned to stock.
            {isPrepaid && totalFormatted
              ? ` A 100% gateway refund (${totalFormatted}) will be automatically initiated via Cashfree.`
              : ''}
          </p>
        </div>
      </div>

      {/* Quick reason pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-foreground font-medium">
            Select Reason <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs text-muted-foreground">Click to select quickly</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickReasons.map((qr) => (
            <button
              key={qr}
              type="button"
              onClick={() => setReason(qr)}
              className={cn(
                'text-xs sm:text-sm px-3 py-1.5 rounded-lg border transition-colors text-left',
                reason === qr
                  ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {qr}
            </button>
          ))}
        </div>
      </div>

      {/* Reason text input */}
      <div className="space-y-2">
        <Label htmlFor="cancel-reason" className="text-sm font-medium">
          Cancellation Reason <span className="text-destructive">*</span>{' '}
          <span className="text-muted-foreground font-normal text-xs">(logged in audit history & sent to customer)</span>
        </Label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Type or select a reason for cancelling this order (mandatory)…"
          className="min-h-[90px] text-sm resize-none"
        />
        {!reason.trim() && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            * A cancellation reason must be provided before confirming.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 sm:h-10 text-sm font-medium sm:w-auto w-full"
          onClick={() => onOpenChange(false)}
        >
          Keep Order
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="h-11 sm:h-10 text-sm font-semibold sm:w-auto w-full gap-2"
          onClick={submit}
        >
          <XCircle className="size-4" />
          <span>Confirm Cancellation</span>
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="px-5 pb-8 sm:pb-6 rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="text-left p-0 pb-3">
            <DrawerTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <XCircle className="size-5 text-destructive" />
              <span>Cancel Order</span>
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-0.5">
              Please specify the cancellation reason for the customer and audit log.
            </DrawerDescription>
          </DrawerHeader>
          {contentBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <XCircle className="size-4 text-destructive" />
            <span>Cancel Order</span>
          </DialogTitle>
        </DialogHeader>
        {contentBody}
      </DialogContent>
    </Dialog>
  );
}

/** Full or partial refund dialog (responsive modal on desktop, bottom drawer on mobile). */
function RefundDialog({
  open,
  onOpenChange,
  totalMinor,
  refundedMinor,
  currency,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalMinor: number;
  refundedMinor: number;
  currency: string;
  onSubmit: (amountMinor: number | null) => void;
}) {
  const outstanding = totalMinor - refundedMinor;
  const [partial, setPartial] = useState('');
  const [isPartial, setIsPartial] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  function handleOpenChange(next: boolean) {
    if (next) { setPartial(''); setIsPartial(false); }
    onOpenChange(next);
  }

  function submit() {
    if (isPartial) {
      const rupees = parseFloat(partial);
      if (isNaN(rupees) || rupees <= 0) return;
      const minor = Math.round(rupees * 100);
      if (minor > outstanding) return;
      onSubmit(minor);
    } else {
      onSubmit(null); // full refund
    }
    onOpenChange(false);
  }

  const outstandingRupees = (outstanding / 100).toFixed(2);
  const partialRupees = parseFloat(partial);
  const partialValid = !isPartial || (!isNaN(partialRupees) && partialRupees > 0 && partialRupees * 100 <= outstanding);

  const formBody = (
    <div className="space-y-4 py-2">
      <div className="rounded-xl border p-4 bg-muted/20 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Outstanding Refundable:</span>
        <strong className="text-base font-bold text-foreground">{money(outstanding, currency)}</strong>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPartial(false)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors flex-1',
              !isPartial ? 'border-[#187b7b] bg-[#187b7b]/10 text-[#187b7b]' : 'border-border bg-muted/20 text-muted-foreground hover:border-foreground/30',
            )}
          >
            <RotateCcw className="size-4" />
            Full ({money(outstanding, currency)})
          </button>
          <button
            type="button"
            onClick={() => setIsPartial(true)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors flex-1',
              isPartial ? 'border-[#187b7b] bg-[#187b7b]/10 text-[#187b7b]' : 'border-border bg-muted/20 text-muted-foreground hover:border-foreground/30',
            )}
          >
            Custom Amount
          </button>
        </div>
        {isPartial && (
          <div className="flex flex-col gap-1.5 pt-1">
            <Label htmlFor="refund-amount" className="text-sm font-medium">Refund Amount (₹, max {outstandingRupees})</Label>
            <Input
              id="refund-amount"
              type="number"
              min="1"
              max={outstandingRupees}
              step="0.01"
              value={partial}
              onChange={(e) => setPartial(e.target.value)}
              placeholder={`e.g. ${outstandingRupees}`}
              className="text-sm h-10 font-mono"
            />
            {!partialValid && partial && (
              <p className="text-xs text-destructive">Amount must be between ₹1 and ₹{outstandingRupees}</p>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3">
        <Button type="button" variant="outline" className="h-11 sm:h-10 text-sm font-medium sm:w-auto w-full" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button
          type="button"
          variant="destructive"
          className="h-11 sm:h-10 text-sm font-semibold sm:w-auto w-full"
          onClick={submit}
          disabled={!partialValid || (isPartial && !partial)}
        >
          Issue Refund
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="px-5 pb-8 sm:pb-6 rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="text-left p-0 pb-3">
            <DrawerTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="size-5 text-primary" />
              <span>Issue Refund</span>
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-0.5">
              Select full or partial refund amount to process via payment gateway.
            </DrawerDescription>
          </DrawerHeader>
          {formBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <RotateCcw className="size-4 text-primary" />
            <span>Issue Refund</span>
          </DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
