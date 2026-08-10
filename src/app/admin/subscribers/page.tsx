'use client';

import { Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscribers } from '@/features/admin';
import { formatDate } from '@/lib/utils';

export default function AdminSubscribersPage() {
  const { data: subs, isLoading } = useSubscribers();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (subs ?? []).filter((x) => !s || x.email.toLowerCase().includes(s));
  }, [subs, q]);

  const active = (subs ?? []).filter((s) => s.status === 'active').length;

  function exportCsv() {
    const rows = [
      ['email', 'status', 'source', 'subscribed_at'],
      ...(subs ?? []).map((s) => [s.email, s.status, s.source ?? '', s.createdAt]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Subscribers</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${active} active · ${subs?.length ?? 0} total`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!subs?.length}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td colSpan={4} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    No subscribers{q ? ' match your search' : ' yet'}.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'} className="capitalize">
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.source ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(s.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
