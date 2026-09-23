'use client';

import { format } from 'date-fns';
import {
  ArrowDownUp,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FilterX,
  IndianRupee,
  MessageCircle,
  MoreHorizontal,
  Package,
  PackageCheck,
  Phone,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminCancelOrder,
  useAdminOrders,
  useAdminProducts,
  useAdminReturns,
  useRefundOrder,
  useReturnAction,
  useSetTracking,
  useShipOrder,
  useUpdateOrderStatus,
} from '@/features/admin';
import { fetchAdminOrders } from '@/features/admin/services/admin.service';
import { useContent } from '@/features/catalog';
import type { AdminOrder, AdminOrdersQuery, AdminOrdersResponse, AdminReturn, OrderStatus } from '@/lib/types';
import { cn, formatDate, mediaSrc, money } from '@/lib/utils';

const LIFECYCLE_TABS: { value: TabValue; label: string; alwaysShow?: boolean }[] = [
  { value: 'all', label: 'All orders', alwaysShow: true },
  { value: 'pending', label: 'Pending', alwaysShow: true },
  { value: 'confirmed', label: 'Confirmed', alwaysShow: true },
  { value: 'processing', label: 'Processing', alwaysShow: true },
  { value: 'shipped', label: 'Shipped', alwaysShow: true },
  { value: 'delivered', label: 'Delivered', alwaysShow: true },
  { value: 'cancelled', label: 'Cancelled', alwaysShow: true },
  { value: 'refunded', label: 'Refunded', alwaysShow: true },
  { value: 'failed', label: 'Failed', alwaysShow: true },
];

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

type TabValue = 'all' | OrderStatus;
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'items-desc';
type PaymentFilter = 'all' | 'cod' | 'prepaid';

export default function AdminOrdersPage() {
  const router = useRouter();

  // Search state with debounce
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filters & Sorting state
  const [status, setStatusTab] = useState<TabValue>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [range, setRange] = useState<DateRange | undefined>();

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination state: default 15 items per page
  const [pageSize, setPageSize] = useState<number>(15);
  const [page, setPage] = useState<number>(1);

  // Reset to page 1 whenever any filter or search changes
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [debouncedSearch, status, paymentFilter, sortBy, range, pageSize]);

  // Server-side query parameters
  const queryParams: AdminOrdersQuery = useMemo(() => {
    const p: AdminOrdersQuery = {
      page,
      limit: pageSize,
      sortBy,
    };
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim();
    if (status !== 'all') p.status = status;
    if (paymentFilter !== 'all') p.paymentMethod = paymentFilter;
    if (range?.from) p.startDate = range.from.toISOString();
    if (range?.to) {
      const end = new Date(range.to);
      end.setHours(23, 59, 59, 999);
      p.endDate = end.toISOString();
    } else if (range?.from) {
      const end = new Date(range.from);
      end.setHours(23, 59, 59, 999);
      p.endDate = end.toISOString();
    }
    return p;
  }, [page, pageSize, sortBy, debouncedSearch, status, paymentFilter, range]);

  const { data: ordersData, isLoading, isFetching } = useAdminOrders(queryParams);
  const { data: returns } = useAdminReturns();
  const { data: adminProducts } = useAdminProducts();
  const { data: siteContent } = useContent();
  const setStatus = useUpdateOrderStatus();

  const rawOrders: AdminOrder[] = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    return (ordersData as AdminOrdersResponse).items ?? [];
  }, [ordersData]);

  const isServerPaginated = Boolean(
    ordersData && !Array.isArray(ordersData) && typeof (ordersData as any).total === 'number',
  );

  const returnsByOrder = useMemo(() => {
    const m = new Map<string, AdminReturn[]>();
    (returns ?? []).forEach((r) => {
      const orderId = r.orderId || (r as any).order_id;
      if (!orderId) return;
      const a = m.get(orderId) ?? [];
      a.push(r);
      m.set(orderId, a);
    });
    return m;
  }, [returns]);

  const filteredFallback = useMemo(() => {
    if (isServerPaginated) return rawOrders;
    return rawOrders
      .filter((o) => {
        if (status !== 'all' && o.status !== status) return false;
        if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase();
          const addr = o.shippingAddress;
          const matches =
            (o.reference ?? '').toLowerCase().includes(q) ||
            o.id.toLowerCase().includes(q) ||
            (o.customerEmail ?? '').toLowerCase().includes(q) ||
            (o.trackingNumber ?? '').toLowerCase().includes(q) ||
            (o.carrier ?? '').toLowerCase().includes(q) ||
            (addr?.fullName ?? '').toLowerCase().includes(q) ||
            (addr?.phone ?? '').toLowerCase().includes(q) ||
            (addr?.city ?? '').toLowerCase().includes(q) ||
            (addr?.state ?? '').toLowerCase().includes(q) ||
            (addr?.postalCode ?? '').toLowerCase().includes(q) ||
            (o.items ?? []).some((i) => i.name.toLowerCase().includes(q));
          if (!matches) return false;
        }
        if (range?.from) {
          const d = new Date(o.createdAt);
          if (d < range.from) return false;
          if (range.to) {
            const end = new Date(range.to);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'amount-desc') return b.totalMinor - a.totalMinor;
        if (sortBy === 'amount-asc') return a.totalMinor - b.totalMinor;
        if (sortBy === 'items-desc') return (b.items?.length ?? 0) - (a.items?.length ?? 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [isServerPaginated, rawOrders, status, paymentFilter, debouncedSearch, range, sortBy, returnsByOrder]);

  const orders = useMemo(() => {
    if (isServerPaginated) return rawOrders;
    const start = (page - 1) * pageSize;
    return filteredFallback.slice(start, start + pageSize);
  }, [isServerPaginated, rawOrders, filteredFallback, page, pageSize]);

  const total = isServerPaginated
    ? (ordersData as AdminOrdersResponse).total ?? rawOrders.length
    : filteredFallback.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const serverCounts = useMemo(() => {
    if (isServerPaginated && (ordersData as AdminOrdersResponse).counts) {
      return (ordersData as AdminOrdersResponse).counts;
    }
    const c: Record<string, number> = { all: rawOrders.length };
    rawOrders.forEach((o) => {
      c[o.status] = (c[o.status] ?? 0) + 1;
    });
    c.returns = returns?.filter((r) => ['requested', 'approved', 'received'].includes(r.status)).length ?? 0;
    return c;
  }, [isServerPaginated, ordersData, rawOrders, returns]);

  const metrics = useMemo(() => {
    if (isServerPaginated && (ordersData as AdminOrdersResponse).metrics) {
      return (ordersData as AdminOrdersResponse).metrics;
    }
    const validOrders = rawOrders.filter((o) => !['cancelled', 'failed'].includes(o.status));
    const totalRev = validOrders.reduce(
      (sum, o) => sum + Math.max(0, o.totalMinor - (o.refundedMinor ?? 0)),
      0,
    );
    const toShip = rawOrders.filter((o) => o.status === 'confirmed').length;
    const delivered = rawOrders.filter((o) => o.status === 'delivered').length;
    const cod = rawOrders.filter((o) => o.paymentMethod === 'cod').length;
    const online = rawOrders.filter((o) => o.paymentMethod !== 'cod').length;

    return {
      totalRevenueMinor: totalRev,
      totalOrders: validOrders.length,
      toShipCount: toShip,
      codCount: cod,
      onlineCount: online,
      deliveredCount: delivered,
      deliveryRate: validOrders.length > 0 ? Math.round((delivered / validOrders.length) * 100) : 0,
      aovMinor: validOrders.length > 0 ? Math.round(totalRev / validOrders.length) : 0,
      activeReturnsCount:
        returns?.filter((r) => ['requested', 'approved', 'received'].includes(r.status)).length ?? 0,
    };
  }, [isServerPaginated, ordersData, rawOrders, returns]);

  const isCodActive = Boolean(siteContent?.codEnabled) || metrics.codCount > 0;



  // Tab configurations from server-computed counts in chronological lifecycle order
  const tabs = useMemo(() => {
    return LIFECYCLE_TABS
      .filter((tab) => tab.alwaysShow || (serverCounts[tab.value as string] ?? 0) > 0)
      .map((tab) => ({
        value: tab.value,
        label: tab.label,
        count: serverCounts[tab.value as string] ?? 0,
      }));
  }, [serverCounts]);

  const hasActiveFilters = Boolean(
    searchInput.trim() || paymentFilter !== 'all' || range?.from || sortBy !== 'date-desc',
  );

  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setPaymentFilter('all');
    setRange(undefined);
    setSortBy('date-desc');
  };

  // Pagination bounds
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + orders.length, total);

  // Bulk Selection Handlers
  const isAllPageSelected =
    orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      orders.forEach((o) => next.delete(o.id));
    } else {
      orders.forEach((o) => next.add(o.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // CSV Export (Server-aware)
  const [isExporting, setIsExporting] = useState(false);

  async function exportCsv(customOrders?: AdminOrder[]) {
    try {
      setIsExporting(true);
      let targetOrders: AdminOrder[] = [];
      if (customOrders && customOrders.length > 0) {
        targetOrders = customOrders;
      } else {
        const res = await fetchAdminOrders({
          ...queryParams,
          page: 1,
          limit: 100,
        });
        targetOrders = Array.isArray(res) ? res : (res?.items ?? []);
      }

      if (!targetOrders || targetOrders.length === 0) {
        toast.error('No orders to export');
        return;
      }

      const headers = [
        'Order Reference',
        'Order ID',
        'Date',
        'Status',
        'Payment Method',
        'Customer Email',
        'Recipient Name',
        'Phone',
        'Shipping Address',
        'City',
        'State',
        'Pincode',
        'Items Count',
        'Items Summary',
        'Subtotal (INR)',
        'Discount (INR)',
        'Coupon Code',
        'Shipping Fee (INR)',
        'Tax (INR)',
        'Total Amount (INR)',
        'Refunded (INR)',
        'Carrier',
        'Tracking Number',
      ];

      const escapeCsv = (val: unknown) => {
        if (val === null || val === undefined) return '""';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      };

      const rows = targetOrders.map((o) => {
        const addr = o.shippingAddress;
        const addrLine = [addr?.line1, addr?.line2].filter(Boolean).join(', ');
        const itemsSummary = (o.items ?? [])
          .map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}`)
          .join('; ');

        return [
          escapeCsv(o.reference ?? o.id),
          escapeCsv(o.id),
          escapeCsv(format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm:ss')),
          escapeCsv(o.status),
          escapeCsv(o.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'),
          escapeCsv(o.customerEmail ?? ''),
          escapeCsv(addr?.fullName ?? ''),
          escapeCsv(addr?.phone ?? ''),
          escapeCsv(addrLine),
          escapeCsv(addr?.city ?? ''),
          escapeCsv(addr?.state ?? ''),
          escapeCsv(addr?.postalCode ?? ''),
          escapeCsv(o.items?.length ?? 0),
          escapeCsv(itemsSummary),
          escapeCsv((o.subtotalMinor / 100).toFixed(2)),
          escapeCsv((o.discountMinor / 100).toFixed(2)),
          escapeCsv(o.couponCode ?? ''),
          escapeCsv((o.shippingMinor / 100).toFixed(2)),
          escapeCsv((o.taxMinor / 100).toFixed(2)),
          escapeCsv((o.totalMinor / 100).toFixed(2)),
          escapeCsv(((o.refundedMinor ?? 0) / 100).toFixed(2)),
          escapeCsv(o.carrier ?? ''),
          escapeCsv(o.trackingNumber ?? ''),
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }

  // Bulk mark-processing action
  const handleBulkFulfill = async () => {
    const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
    const eligible = selectedOrders.filter((o) => o.status === 'confirmed');

    if (eligible.length === 0) {
      toast.error('None of the selected orders are eligible to be marked as processing');
      return;
    }

    if (
      !(await confirm({
        title: `Mark ${eligible.length} orders as Processing?`,
        description: 'This will mark all eligible confirmed orders as being packed and ready to ship.',
        confirmText: `Mark Processing (${eligible.length})`,
      }))
    ) {
      return;
    }

    let successCount = 0;
    for (const order of eligible) {
      try {
        await setStatus.mutateAsync({ id: order.id, status: 'processing' as OrderStatus });
        successCount += 1;
      } catch {}
    }

    toast.success(`Marked ${successCount} orders as processing`);
    setSelectedIds(new Set());
  };

  const selectedOrdersList = useMemo(() => {
    return orders.filter((o) => selectedIds.has(o.id));
  }, [orders, selectedIds]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header with Title and Export Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage, dispatch, and track customer orders across all channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv()}
            disabled={isLoading || total === 0 || isExporting}
            className="gap-2 font-medium"
          >
            <Download className="size-4" />
            {isExporting ? 'Exporting…' : `Export CSV (${total})`}
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer"
          onClick={() => setStatusTab('all')}
        >
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total Revenue</span>
              <IndianRupee className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5 flex-wrap">
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <>
                  <span>{money(metrics.totalRevenueMinor, 'inr')}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({metrics.totalOrders} {metrics.totalOrders === 1 ? 'order' : 'orders'})
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              AOV: <strong className="text-foreground">{money(metrics.aovMinor, 'inr')}</strong>
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer',
            metrics.toShipCount > 0 && 'border-amber-300 dark:border-amber-800/60 bg-amber-50/20',
          )}
          onClick={() => setStatusTab('confirmed')}
        >
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">To Dispatch</span>
              <Truck className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              {isLoading ? <Skeleton className="h-6 w-12" /> : metrics.toShipCount}
              {metrics.toShipCount > 0 && (
                <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Needs packing/shipping</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer',
            metrics.activeReturnsCount > 0 &&
              'border-purple-300 dark:border-purple-800/60 bg-purple-50/20',
          )}
          onClick={() => router.push('/admin/returns')}
        >
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Returns</span>
              <RotateCcw className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              {isLoading ? <Skeleton className="h-6 w-12" /> : metrics.activeReturnsCount}
              {metrics.activeReturnsCount > 0 && (
                <span className="inline-block size-2 rounded-full bg-purple-500 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>Open RMA desk</span>
              <ExternalLink className="size-3 inline" />
            </p>
          </CardContent>
        </Card>

        {isCodActive ? (
          <Card className="border shadow-none bg-card hover:bg-muted/20 transition-colors">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Payment Mix</span>
                <TrendingUp className="size-4 text-[#187b7b]" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
                  Prepaid: {metrics.totalOrders > 0 ? Math.round((metrics.onlineCount / metrics.totalOrders) * 100) : 0}%
                </Badge>
                <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
                  COD: {metrics.totalOrders > 0 ? Math.round((metrics.codCount / metrics.totalOrders) * 100) : 0}%
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground pt-0.5">Prepaid vs COD ratio</p>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer"
            onClick={() => setStatusTab('delivered')}
          >
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Delivered</span>
                <PackageCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                {isLoading ? <Skeleton className="h-6 w-12" /> : metrics.deliveredCount}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {metrics.deliveryRate}% fulfillment rate
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modern Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search input */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9 text-xs sm:text-sm"
            placeholder="Search reference, customer, phone, tracking, city…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Payment Method filter */}
        {isCodActive && (
          <Select value={paymentFilter} onValueChange={(val) => setPaymentFilter(val as PaymentFilter)}>
            <SelectTrigger className="h-9 w-[145px] text-xs">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="prepaid">Prepaid (Online)</SelectItem>
              <SelectItem value="cod">Cash on Delivery</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Sort By selector */}
        <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <ArrowDownUp className="size-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="amount-desc">Total: High to Low</SelectItem>
            <SelectItem value="amount-asc">Total: Low to High</SelectItem>
            <SelectItem value="items-desc">Most items</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 justify-start gap-2 font-normal text-xs">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              {range?.from ? (
                range.to ? (
                  `${format(range.from, 'LLL d')} – ${format(range.to, 'LLL d, yyyy')}`
                ) : (
                  format(range.from, 'LLL d, yyyy')
                )
              ) : (
                <span className="text-muted-foreground">Date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="range" numberOfMonths={1} selected={range} onSelect={setRange} autoFocus />
            {range?.from && (
              <div className="border-t p-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => setRange(undefined)}>
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Clear all filters shortcut */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <FilterX className="size-3.5" />
            <span>Reset filters</span>
          </Button>
        )}
      </div>

      {/* Status tabs — horizontal scroll without wrap, round pill badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b pb-px whitespace-nowrap scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setStatusTab(t.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm capitalize transition-colors',
              status === t.value
                ? 'border-[#187b7b] font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <span>{t.label}</span>
            <span
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums',
                status === t.value ? 'bg-[#187b7b] text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Floating / Sticky Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/60 p-2.5 px-4 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-[#187b7b]" />
            <span>
              <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'order' : 'orders'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleBulkFulfill}
            >
              <PackageCheck className="size-3.5" />
              <span>Mark Fulfilled</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => exportCsv(selectedOrdersList)}
            >
              <Download className="size-3.5" />
              <span>Export Selected ({selectedIds.size})</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect all
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0 shadow-none border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-3 py-3 text-center">
                  <Checkbox
                    checked={isAllPageSelected}
                    onCheckedChange={toggleSelectAllPage}
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3" colSpan={6}>
                      <Skeleton className="h-12 w-full" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground space-y-2">
                    <Package className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="font-medium text-foreground">
                      {hasActiveFilters ? 'No orders match your filters.' : 'No orders in this status yet.'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-2 text-xs">
                        Clear filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    orderReturns={(o.returns && o.returns.length > 0) ? o.returns : (returnsByOrder.get(o.id) ?? [])}
                    adminProducts={adminProducts ?? []}
                    isSelected={selectedIds.has(o.id)}
                    onToggleSelect={() => toggleSelectOne(o.id)}
                    showStatusBadge={status === 'all'}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && orders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-foreground">{total === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong className="text-foreground">{endIndex}</strong> of{' '}
                <strong className="text-foreground">{total}</strong> orders
              </span>
              <span className="text-muted-foreground/40">|</span>
              <div className="flex items-center gap-1.5">
                <span>Show:</span>
                <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="h-7 w-[115px] text-xs">
                    <SelectValue placeholder="15 per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 per page</SelectItem>
                    <SelectItem value="30">30 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => setPage(1)}
                  disabled={currentPage <= 1}
                  title="First page"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  title="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {/* Page number buttons */}
                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                    p === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={`page-${p}`}
                        variant={currentPage === p ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'size-8 p-0 text-xs font-medium',
                          currentPage === p && 'pointer-events-none bg-[#187b7b] text-white',
                        )}
                        onClick={() => setPage(Number(p))}
                      >
                        {p}
                      </Button>
                    ),
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  title="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  title="Last page"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', total];
  }
  if (current >= total - 3) {
    return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

function OrderRow({
  order: o,
  orderReturns,
  adminProducts,
  isSelected,
  onToggleSelect,
  showStatusBadge,
}: {
  order: AdminOrder;
  orderReturns: AdminReturn[];
  adminProducts: any[];
  isSelected: boolean;
  onToggleSelect: () => void;
  showStatusBadge?: boolean;
}) {
  const router = useRouter();
  const setStatus = useUpdateOrderStatus();
  const ship = useShipOrder();
  const cancel = useAdminCancelOrder();
  const refund = useRefundOrder();
  const returnAct = useReturnAction();

  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const run = (p: Promise<unknown>, msg: string) =>
    p.then(() => toast.success(msg)).catch((e) => toast.error((e as Error).message));

  const actionableReturns = orderReturns.filter((r) =>
    ['requested', 'approved', 'received'].includes(r.status),
  );
  const runReturn = (
    rid: string,
    action: 'approve' | 'reject' | 'receive' | 'refund' | 'refund_no_restock',
  ) =>
    returnAct
      .mutateAsync({ id: rid, action })
      .then(() => toast.success(`Return ${action}d`))
      .catch((e) => toast.error((e as Error).message));

  const totalQuantity = o.items.reduce((n, it) => n + it.quantity, 0);
  const alreadyRefunded = o.refundedMinor >= o.totalMinor;

  const isConfirmed = o.status === 'confirmed';
  const canFulfil = isConfirmed;
  const canShip = isConfirmed || o.status === 'processing';
  const canDeliver = o.status === 'shipped';
  const canRefund =
    ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status) &&
    !alreadyRefunded;
  const canCancel = ['pending', 'confirmed', 'processing'].includes(o.status);
  const hasActions = canFulfil || canShip || canDeliver || canRefund || canCancel;

  const addr = o.shippingAddress;
  const phone = addr?.phone || (o as any).customerPhone || '';
  const cleanPhone = phone.replace(/\D/g, '');
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const waText = encodeURIComponent(
    `Hi ${addr?.fullName?.split(' ')[0] || ''}, regarding your order ${o.reference ?? `#${o.id.slice(0, 8)}`}: `,
  );
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waText}` : null;

  const copyRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(o.reference ?? o.id);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 1500);
    toast.success('Reference copied');
  };

  return (
    <>
      <tr
        className={cn(
          'border-b last:border-0 hover:bg-muted/30 transition-colors',
          isSelected && 'bg-muted/40',
        )}
      >
        {/* Checkbox */}
        <td className="w-10 px-3 py-3 text-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select order ${o.reference ?? o.id}`}
          />
        </td>

        {/* Order Reference + Date & Status + Carrier / Tracking */}
        <td className="px-4 py-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/admin/orders/${o.id}`}
                className="font-mono font-semibold text-foreground hover:text-[#187b7b] hover:underline"
              >
                {o.reference ?? `#${o.id.slice(0, 8)}`}
              </Link>
              <button
                type="button"
                onClick={copyRef}
                className="text-muted-foreground/60 hover:text-foreground p-0.5"
                title="Copy reference"
              >
                {copiedRef ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatDate(o.createdAt)}
              </span>
              {showStatusBadge && (
                <Badge variant={badge[o.status] ?? 'secondary'} className="capitalize text-[10px] px-1.5 py-0 font-medium">
                  {o.status}
                </Badge>
              )}
              {orderReturns
                .filter((r) => r.status !== 'refunded')
                .map((r) => (
                  <Badge
                    key={r.id}
                    variant={returnBadge[r.status] ?? 'outline'}
                    className="gap-1 capitalize text-[10px] px-1.5 py-0"
                    title="Return status"
                  >
                    <RotateCcw className="size-2.5" /> {r.status}
                  </Badge>
                ))}
            </div>
            {o.trackingNumber && (
              <div className="truncate text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
                <Truck className="size-3 shrink-0 text-muted-foreground" />
                <span>{o.carrier}:</span>
                <span className="font-mono">{o.trackingNumber}</span>
              </div>
            )}
          </div>
        </td>

        {/* Customer Contact Details */}
        <td className="px-4 py-3">
          <div className="min-w-0 text-xs space-y-0.5 max-w-[200px]">
            <p className="font-semibold text-foreground truncate">
              {addr?.fullName || o.customerEmail?.split('@')[0] || 'Customer'}
            </p>
            {o.customerEmail && (
              <p className="text-muted-foreground truncate text-[11px]">{o.customerEmail}</p>
            )}
            <div className="flex items-center gap-2 pt-0.5">
              {phone && (
                <span className="text-[11px] font-mono text-muted-foreground/80">{phone}</span>
              )}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 hover:underline text-[11px] font-medium"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </td>

        {/* Products & Total */}
        <td className="px-4 py-3">
          <div className="space-y-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 p-1 rounded-md hover:bg-muted/60 transition-colors text-left group"
                >
                  <div className="flex items-center -space-x-2 shrink-0">
                    {o.items.slice(0, 3).map((it, idx) => {
                      const match = adminProducts.find((p) => p.id === it.productId);
                      const varMatch = it.variantId
                        ? match?.variants?.find((v: any) => v.id === it.variantId)
                        : null;
                      const img =
                        it.imageUrl ||
                        varMatch?.images?.[0] ||
                        match?.imageUrl ||
                        match?.media?.[0]?.url;

                      return (
                        <div
                          key={idx}
                          className="size-7 rounded-md border bg-background overflow-hidden shrink-0 ring-1 ring-background shadow-xs"
                        >
                          {img ? (
                            <img
                              src={mediaSrc(img)}
                              alt={it.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center bg-muted text-muted-foreground/40">
                              <Package className="size-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-xs">
                    <span className="font-medium text-foreground group-hover:underline">
                      {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                    </span>
                    {o.items.length > 3 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        (+{o.items.length - 3})
                      </span>
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 text-xs space-y-2" align="start">
                <div className="font-semibold text-xs border-b pb-1.5 text-foreground flex items-center justify-between">
                  <span>Order Items ({o.items.length})</span>
                  <span className="text-muted-foreground font-normal">
                    Total: {money(o.totalMinor, o.currency)}
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {o.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{it.name}</p>
                        {it.variantLabel && (
                          <p className="text-[11px] text-muted-foreground">{it.variantLabel}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-muted-foreground">x{it.quantity}</span>
                        <p className="font-medium">{money(it.unitAmountMinor * it.quantity, o.currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Total & Payment Method */}
            <div className="flex items-center gap-1.5 pl-1">
              <span className="font-bold text-xs text-foreground">{money(o.totalMinor, o.currency)}</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 font-medium',
                  ['cancelled', 'failed'].includes(o.status)
                    ? 'border-border text-muted-foreground bg-muted/40'
                    : o.paymentMethod === 'cod'
                      ? 'border-amber-400 text-amber-700 bg-amber-50/50 dark:border-amber-800 dark:text-amber-300'
                      : 'border-emerald-400 text-emerald-700 bg-emerald-50/50 dark:border-emerald-800 dark:text-emerald-300',
                )}
              >
                {o.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
              </Badge>
              {o.refundedMinor > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  (-{money(o.refundedMinor, o.currency)})
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Shipping Address */}
        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
          {addr ? (
            <div className="space-y-0.5 min-w-0">
              <p className="font-medium text-foreground truncate" title={addr.fullName || ''}>
                {addr.fullName}
              </p>
              <p className="truncate text-[11px]" title={[addr.line1, addr.line2].filter(Boolean).join(', ')}>
                {[addr.line1, addr.line2].filter(Boolean).join(', ')}
              </p>
              <p className="text-[11px] text-muted-foreground truncate" title={[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}>
                {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground/50 italic">—</span>
          )}
        </td>

        {/* Action Dropdown Menu */}
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem onClick={() => router.push(`/admin/orders/${o.id}`)}>
                  <Eye className="size-3.5 mr-1" /> View details
                </DropdownMenuItem>
                {['processing', 'shipped', 'delivered'].includes(o.status) && (
                  <DropdownMenuItem onClick={() => router.push(`/admin/orders/${o.id}`)}>
                    <Truck className="size-3.5 mr-1 text-[#187b7b]" /> Shiprocket Logistics
                  </DropdownMenuItem>
                )}
                {hasActions && <DropdownMenuSeparator />}
                {canFulfil && (
                  <DropdownMenuItem
                    onClick={() =>
                      run(
                        setStatus.mutateAsync({ id: o.id, status: 'processing' as OrderStatus }),
                        'Marked processing',
                      )
                    }
                  >
                    <CheckCircle2 className="size-3.5 mr-1" /> Mark Processing
                  </DropdownMenuItem>
                )}
                {canShip && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setShipOpen(true);
                    }}
                  >
                    <Truck className="size-3.5 mr-1" /> Ship
                  </DropdownMenuItem>
                )}
                {canDeliver && (
                  <DropdownMenuItem
                    onClick={() =>
                      run(
                        setStatus.mutateAsync({ id: o.id, status: 'delivered' as OrderStatus }),
                        'Marked delivered',
                      )
                    }
                  >
                    <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" /> Mark delivered
                  </DropdownMenuItem>
                )}
                {canRefund && (
                  <DropdownMenuItem
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Refund this order?',
                          description: 'A full refund will be issued and stock restored.',
                          confirmText: 'Refund',
                          destructive: true,
                        })
                      ) {
                        run(refund.mutateAsync({ id: o.id }), 'Refunded');
                      }
                    }}
                  >
                    <RotateCcw className="size-3.5 mr-1 text-amber-600" /> Refund
                  </DropdownMenuItem>
                )}
                {(canFulfil || canShip || canDeliver || canRefund) && canCancel && (
                  <DropdownMenuSeparator />
                )}
                {canCancel && (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      setCancelOpen(true);
                    }}
                  >
                    <XCircle className="size-3.5 mr-1" /> Cancel
                  </DropdownMenuItem>
                )}

                {actionableReturns.length > 0 && <DropdownMenuSeparator />}
                {actionableReturns.map((r) => {
                  if (r.status === 'requested')
                    return (
                      <Fragment key={r.id}>
                        <DropdownMenuItem onClick={() => runReturn(r.id, 'approve')}>
                          <CheckCircle2 className="size-3.5 mr-1" /> Approve return
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => runReturn(r.id, 'reject')}>
                          <XCircle className="size-3.5 mr-1" /> Reject return
                        </DropdownMenuItem>
                      </Fragment>
                    );
                  if (r.status === 'approved')
                    return (
                      <Fragment key={r.id}>
                        <DropdownMenuItem onClick={() => runReturn(r.id, 'receive')}>
                          <PackageCheck className="size-3.5 mr-1" /> Mark return received
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => runReturn(r.id, 'reject')}>
                          <XCircle className="size-3.5 mr-1" /> Reject return
                        </DropdownMenuItem>
                      </Fragment>
                    );
                  return (
                    <Fragment key={r.id}>
                      <DropdownMenuItem onClick={() => runReturn(r.id, 'refund')}>
                        <RotateCcw className="size-3.5 mr-1" />{' '}
                        {alreadyRefunded ? 'Restock items' : 'Refund return + restock'}
                      </DropdownMenuItem>
                      {!alreadyRefunded && (
                        <DropdownMenuItem onClick={() => runReturn(r.id, 'refund_no_restock')}>
                          <RotateCcw className="size-3.5 mr-1" /> Refund only (no restock)
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem variant="destructive" onClick={() => runReturn(r.id, 'reject')}>
                        <XCircle className="size-3.5 mr-1" /> Reject return
                      </DropdownMenuItem>
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
          run(ship.mutateAsync({ id: o.id, carrier, trackingNumber }), 'Shipped')
        }
      />
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={(reason) =>
          run(cancel.mutateAsync({ id: o.id, reason: reason || undefined }), 'Cancelled')
        }
      />
    </>
  );
}

/** Collect carrier + tracking number, then mark the order shipped. */
function ShipDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (carrier: string, trackingNumber: string) => void;
}) {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  function handleOpenChange(next: boolean) {
    if (next) {
      setCarrier('');
      setTrackingNumber('');
    }
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
        <DialogHeader>
          <DialogTitle>Ship order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ship-carrier">Carrier</Label>
            <Input
              id="ship-carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. BlueDart, Delhivery, DTDC"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ship-tracking">Tracking number</Label>
            <Input
              id="ship-tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} className="bg-[#187b7b] hover:bg-[#187b7b]/90 text-white">
            Mark shipped
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Cancel an order with an optional reason. */
function CancelDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  function handleOpenChange(next: boolean) {
    if (next) setReason('');
    onOpenChange(next);
  }

  function submit() {
    if (!reason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    onSubmit(reason.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer requested, out of stock (required)"
            />
            {!reason.trim() && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                * A cancellation reason is required.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep order
          </Button>
          <Button type="button" variant="destructive" onClick={submit}>
            Cancel order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
