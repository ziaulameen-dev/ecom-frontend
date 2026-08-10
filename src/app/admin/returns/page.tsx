'use client';

import { Check, ImageOff, MoreHorizontal, PackageCheck, RotateCcw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AuthImage } from '@/components/auth-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminReturns, useReturnAction } from '@/features/admin';
import type { AdminReturn } from '@/lib/types';
import { formatDate, money } from '@/lib/utils';

const STATUSES = ['requested', 'approved', 'received', 'refunded', 'rejected'] as const;

const badge: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  requested: 'secondary', approved: 'default', received: 'default', refunded: 'success', rejected: 'destructive',
};

export default function AdminReturnsPage() {
  const { data: returns, isLoading } = useAdminReturns();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | (typeof STATUSES)[number]>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (returns ?? []).filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (q && !r.orderId.toLowerCase().includes(q) && !(r.reason ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [returns, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Returns (RMA)</h1>
          <p className="text-sm text-muted-foreground">{returns?.length ?? 0} return requests</p>
        </div>
      </div>

      {/* Toolbar / filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by order or reason…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Refund</th>
                <th className="px-4 py-3 font-medium">Images</th>
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No returns found.</td></tr>
              ) : (
                filtered.map((r) => <ReturnRow key={r.id} rma={r} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReturnRow({ rma: r }: { rma: AdminReturn }) {
  const act = useReturnAction();

  const run = (action: 'approve' | 'reject' | 'receive' | 'refund') =>
    act.mutateAsync({ id: r.id, action }).then(() => toast.success(`Return ${action}d`)).catch((e) => toast.error((e as Error).message));

  const itemCount = r.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <div className="font-mono font-medium">#{r.orderId.slice(0, 8)}</div>
          <div className="truncate text-xs text-muted-foreground">{formatDate(r.createdAt)}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={badge[r.status] ?? 'secondary'} className="capitalize">{r.status}</Badge>
      </td>
      <td className="px-4 py-3">
        <span className="text-muted-foreground">{r.reason || '—'}</span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {r.items?.length ? `${r.items.length} line${r.items.length > 1 ? 's' : ''} · ${itemCount} qty` : '—'}
      </td>
      <td className="px-4 py-3">
        {r.refundMinor > 0 ? <span className="font-medium">{money(r.refundMinor)}</span> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3">
        {r.images?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {r.images.map((key) => (
              <AuthImage
                key={key}
                path={`/api/returns/${r.id}/images/${key.split('/').pop()}`}
                className="size-10 rounded-md border object-cover"
              />
            ))}
          </div>
        ) : (
          <span className="grid size-10 place-items-center rounded-md border bg-muted/40"><ImageOff className="size-4 text-muted-foreground" /></span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions" disabled={act.isPending}><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {r.status === 'requested' && (
                <>
                  <DropdownMenuItem onClick={() => run('approve')}><Check className="size-4" /> Approve</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => run('reject')}><X className="size-4" /> Reject</DropdownMenuItem>
                </>
              )}
              {r.status === 'approved' && (
                <>
                  <DropdownMenuItem onClick={() => run('receive')}><PackageCheck className="size-4" /> Mark received</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => run('reject')}><X className="size-4" /> Reject</DropdownMenuItem>
                </>
              )}
              {r.status === 'received' && (
                <>
                  <DropdownMenuItem onClick={() => run('refund')}><RotateCcw className="size-4" /> Refund + restock</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => run('reject')}><X className="size-4" /> Reject (damaged)</DropdownMenuItem>
                </>
              )}
              {(r.status === 'refunded' || r.status === 'rejected') && (
                <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
