'use client';

import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Eye,
  ImageOff,
  IndianRupee,
  MoreHorizontal,
  Package,
  PackageCheck,
  RotateCcw,
  Search,
  Undo2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AuthImage } from '@/components/auth-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOrders, useAdminReturns, useReturnAction } from '@/features/admin';
import type { AdminOrder, AdminReturn } from '@/lib/types';
import { cn, formatDate, money } from '@/lib/utils';

const STATUSES = ['requested', 'approved', 'received', 'refunded', 'rejected'] as const;
type TabStatus = 'all' | (typeof STATUSES)[number];

const badgeVariant: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  requested: 'secondary',
  approved: 'default',
  received: 'default',
  refunded: 'success',
  rejected: 'destructive',
};

export default function AdminReturnsPage() {
  const { data: returns, isLoading: isReturnsLoading } = useAdminReturns();
  const { data: ordersData, isLoading: isOrdersLoading } = useAdminOrders();

  const orders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData : (ordersData?.items ?? [])),
    [ordersData],
  );
  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<TabStatus>('all');
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Evidence preview dialog
  const [previewImage, setPreviewImage] = useState<{ path: string; title: string } | null>(null);

  // Reset page when filter or search changes
  const handleStatusChange = (val: TabStatus) => {
    setStatusTab(val);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // Metrics
  const metrics = useMemo(() => {
    const list = returns ?? [];
    const requestedCount = list.filter((r) => r.status === 'requested').length;
    const approvedCount = list.filter((r) => r.status === 'approved').length;
    const receivedCount = list.filter((r) => r.status === 'received').length;
    const refundedCount = list.filter((r) => r.status === 'refunded').length;
    const totalRefunded = list
      .filter((r) => r.status === 'refunded')
      .reduce((sum, r) => sum + (r.refundMinor ?? 0), 0);

    return {
      total: list.length,
      requestedCount,
      approvedCount,
      receivedCount,
      refundedCount,
      totalRefunded,
    };
  }, [returns]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const list = returns ?? [];
    const counts: Record<string, number> = { all: list.length };
    STATUSES.forEach((s) => {
      counts[s] = list.filter((r) => r.status === s).length;
    });
    return counts;
  }, [returns]);

  const tabs: { value: TabStatus; label: string; count: number }[] = [
    { value: 'all', label: 'All returns', count: tabCounts.all },
    { value: 'requested', label: 'Requested', count: tabCounts.requested },
    { value: 'approved', label: 'Approved', count: tabCounts.approved },
    { value: 'received', label: 'Received', count: tabCounts.received },
    { value: 'refunded', label: 'Refunded', count: tabCounts.refunded },
    { value: 'rejected', label: 'Rejected', count: tabCounts.rejected },
  ];

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (returns ?? []).filter((r) => {
      if (statusTab !== 'all' && r.status !== statusTab) return false;
      const order = orderMap.get(r.orderId);
      const ref = order?.reference?.toLowerCase() ?? '';
      const email = order?.customerEmail?.toLowerCase() ?? '';
      const name = order?.shippingAddress?.fullName?.toLowerCase() ?? '';
      if (
        q &&
        !r.orderId.toLowerCase().includes(q) &&
        !(r.reason ?? '').toLowerCase().includes(q) &&
        !ref.includes(q) &&
        !email.includes(q) &&
        !name.includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [returns, search, statusTab, orderMap]);

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedReturns = useMemo(
    () => filtered.slice(startIndex, startIndex + pageSize),
    [filtered, startIndex, pageSize],
  );

  const isLoading = isReturnsLoading || isOrdersLoading;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Returns & Refunds (RMA)</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Review, approve, inspect returned items, and issue customer refunds
          </p>
        </div>
        <Link href="/admin/orders">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
            <Package className="size-4 text-muted-foreground" />
            <span>Go to Orders</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer"
          onClick={() => handleStatusChange('all')}
        >
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total Requests</span>
              <Undo2 className="size-4 text-[#187b7b]" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {isLoading ? <Skeleton className="h-6 w-12" /> : metrics.total}
            </div>
            <p className="text-[11px] text-muted-foreground">All time return requests</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer',
            metrics.requestedCount > 0 && 'border-amber-300 dark:border-amber-800/60 bg-amber-50/20',
          )}
          onClick={() => handleStatusChange('requested')}
        >
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Awaiting Approval</span>
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              {isLoading ? <Skeleton className="h-6 w-12" /> : metrics.requestedCount}
              {metrics.requestedCount > 0 && (
                <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Needs admin review</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer',
            metrics.approvedCount > 0 && 'border-purple-300 dark:border-purple-800/60 bg-purple-50/20',
          )}
          onClick={() => handleStatusChange('approved')}
        >
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">In Transit / Receiving</span>
              <PackageCheck className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              {isLoading ? <Skeleton className="h-6 w-12" /> : metrics.approvedCount}
              {metrics.approvedCount > 0 && (
                <span className="inline-block size-2 rounded-full bg-purple-500 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Approved, awaiting parcel</p>
          </CardContent>
        </Card>

        <Card
          className="border shadow-none bg-card hover:bg-muted/20 transition-colors cursor-pointer"
          onClick={() => handleStatusChange('refunded')}
        >
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total Refunded</span>
              <IndianRupee className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <>
                  <span>{money(metrics.totalRefunded, 'inr')}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({metrics.refundedCount})
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Closed RMA refunds</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9 text-xs sm:text-sm"
            placeholder="Search order reference, reason, customer, product…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Quick status dropdown for mobile */}
        <div className="sm:hidden">
          <Select value={statusTab} onValueChange={(v) => handleStatusChange(v as TabStatus)}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {t.label} ({t.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto border-b pb-px whitespace-nowrap scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleStatusChange(t.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm capitalize transition-colors',
              statusTab === t.value
                ? 'border-[#187b7b] font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <span>{t.label}</span>
            <span
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums',
                statusTab === t.value ? 'bg-[#187b7b] text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0 shadow-none border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Returned Items</th>
                <th className="px-4 py-3 font-medium">Refund</th>
                <th className="px-4 py-3 font-medium">Proof / Photos</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3" colSpan={8}>
                      <Skeleton className="h-12 w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground space-y-2">
                    <Undo2 className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="font-medium text-foreground">No return requests found.</p>
                    {(search || statusTab !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch('');
                          setStatusTab('all');
                        }}
                        className="mt-2 text-xs"
                      >
                        Clear filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((r) => (
                  <ReturnRow
                    key={r.id}
                    rma={r}
                    order={orderMap.get(r.orderId)}
                    onPreviewImage={(path, title) => setPreviewImage({ path, title })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-foreground">{startIndex + 1}</strong> to{' '}
                <strong className="text-foreground">{endIndex}</strong> of{' '}
                <strong className="text-foreground">{total}</strong> returns
              </span>
              <span className="text-muted-foreground/40">|</span>
              <div className="flex items-center gap-1.5">
                <span>Show:</span>
                <Select value={String(pageSize)} onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}>
                  <SelectTrigger className="h-7 w-[115px] text-xs">
                    <SelectValue placeholder="10 per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
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

                <span className="px-2 font-medium text-foreground">
                  Page {currentPage} of {totalPages}
                </span>

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

      {/* Evidence Image Lightbox Modal */}
      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold truncate">
              {previewImage?.title || 'Customer Evidence Image'}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="mt-2 flex justify-center bg-black/5 rounded-lg p-2 max-h-[70vh] overflow-hidden">
              <AuthImage
                path={previewImage.path}
                className="max-h-[65vh] w-auto max-w-full rounded object-contain shadow-sm"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReturnRow({
  rma: r,
  order,
  onPreviewImage,
}: {
  rma: AdminReturn;
  order?: AdminOrder;
  onPreviewImage: (path: string, title: string) => void;
}) {
  const act = useReturnAction();

  const run = (action: 'approve' | 'reject' | 'receive' | 'refund' | 'refund_no_restock') =>
    act
      .mutateAsync({ id: r.id, action })
      .then(() => toast.success(`Return request ${action.replace('_', ' ')}ed`))
      .catch((e) => toast.error((e as Error).message));

  const itemCount = r.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;
  const orderRef = order?.reference || `#${r.orderId.slice(0, 8)}`;
  const customerName = order?.shippingAddress?.fullName || '—';
  const customerEmail = order?.customerEmail;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      {/* Order Reference */}
      <td className="px-4 py-3">
        <div className="min-w-0">
          <Link
            href={`/admin/orders/${r.orderId}`}
            className="font-mono font-medium text-[#187b7b] hover:underline"
            title="View Order Details"
          >
            {orderRef}
          </Link>
          <div className="truncate text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</div>
        </div>
      </td>

      {/* Customer Info */}
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-xs text-foreground truncate max-w-[150px]">{customerName}</p>
          {customerEmail && (
            <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">{customerEmail}</p>
          )}
        </div>
      </td>

      {/* Return Status */}
      <td className="px-4 py-3">
        <Badge variant={badgeVariant[r.status] ?? 'secondary'} className="capitalize text-xs font-semibold">
          {r.status}
        </Badge>
      </td>

      {/* Reason */}
      <td className="px-4 py-3 max-w-[200px]">
        <span className="text-xs text-foreground line-clamp-2" title={r.reason || ''}>
          {r.reason || <span className="text-muted-foreground">—</span>}
        </span>
      </td>

      {/* Returned Items */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {r.items?.length ? (
          <span className="font-medium text-foreground">
            {r.items.length} {r.items.length === 1 ? 'item' : 'items'} · ({itemCount} qty)
          </span>
        ) : (
          '—'
        )}
      </td>

      {/* Refund Amount */}
      <td className="px-4 py-3 whitespace-nowrap">
        {r.refundMinor > 0 ? (
          <span className="font-medium text-xs text-emerald-600 dark:text-emerald-400">
            {money(r.refundMinor, 'inr')}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Evidence Images */}
      <td className="px-4 py-3">
        {r.images?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 items-center">
            {r.images.map((key, idx) => {
              const filename = key.split('/').pop();
              const path = `/api/returns/${r.id}/images/${filename}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPreviewImage(path, `${orderRef} — Proof #${idx + 1}`)}
                  className="relative group rounded-md overflow-hidden border size-9 hover:opacity-90 transition-opacity"
                  title="Click to zoom image"
                >
                  <AuthImage path={path} className="size-full object-cover" />
                  <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Eye className="size-3" />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <span className="inline-flex size-8 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
            <ImageOff className="size-3.5" />
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Actions" disabled={act.isPending}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/orders/${r.orderId}`} className="cursor-pointer gap-2">
                  <Package className="size-4 text-muted-foreground" /> View Order
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {r.status === 'requested' && (
                <>
                  <DropdownMenuItem onClick={() => run('approve')} className="gap-2 font-medium text-emerald-600">
                    <Check className="size-4" /> Approve Return
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => run('reject')} className="gap-2 font-medium text-destructive">
                    <X className="size-4" /> Reject Return
                  </DropdownMenuItem>
                </>
              )}

              {r.status === 'approved' && (
                <>
                  <DropdownMenuItem onClick={() => run('receive')} className="gap-2 font-medium text-purple-600">
                    <PackageCheck className="size-4" /> Mark Received
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => run('reject')} className="gap-2 font-medium text-destructive">
                    <X className="size-4" /> Reject Return
                  </DropdownMenuItem>
                </>
              )}

              {r.status === 'received' && (
                <>
                  <DropdownMenuItem onClick={() => run('refund')} className="gap-2 font-medium text-emerald-600">
                    <RotateCcw className="size-4" /> Refund & Restock
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => run('refund_no_restock')} className="gap-2 text-amber-600">
                    <AlertCircle className="size-4" /> Refund (No Restock)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => run('reject')} className="gap-2 text-destructive">
                    <X className="size-4" /> Reject (Damaged Goods)
                  </DropdownMenuItem>
                </>
              )}

              {(r.status === 'refunded' || r.status === 'rejected') && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Case Closed ({r.status})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
