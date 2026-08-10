'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomers, useSubscribers } from '@/features/admin';
import { cn, formatDate } from '@/lib/utils';

type Tab = 'all' | 'subscribers' | 'active' | 'deleted';

export default function AdminCustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const { data: subs } = useSubscribers();
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');

  // Emails of active newsletter subscribers → to flag subscribed customers.
  const subscribedEmails = useMemo(
    () =>
      new Set(
        (subs ?? []).filter((s) => s.status === 'active').map((s) => s.email.toLowerCase()),
      ),
    [subs],
  );

  const rows = useMemo(
    () =>
      (customers ?? []).map((c) => ({
        ...c,
        subscribed: subscribedEmails.has(c.email.toLowerCase()),
      })),
    [customers, subscribedEmails],
  );

  const counts = {
    all: rows.length,
    subscribers: rows.filter((r) => r.subscribed).length,
    active: rows.filter((r) => !r.deleted).length,
    deleted: rows.filter((r) => r.deleted).length,
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'subscribers' && !r.subscribed) return false;
      if (tab === 'active' && r.deleted) return false;
      if (tab === 'deleted' && !r.deleted) return false;
      if (s && !r.email.toLowerCase().includes(s) && !(r.name ?? '').toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, tab, q]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'subscribers', label: `Subscribers (${counts.subscribers})` },
    { id: 'active', label: `Active (${counts.active})` },
    { id: 'deleted', label: `Deleted (${counts.deleted})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">{isLoading ? 'Loading…' : `${counts.all} total`}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm',
              tab === t.id
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Subscribed</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td colSpan={5} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No customers found.</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className={cn('font-medium', c.deleted && 'text-muted-foreground line-through')}>
                        {c.name || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {c.subscribed ? <Badge variant="success">Subscribed</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.roles.includes('admin') ? <Badge>Admin</Badge> : <span className="text-muted-foreground">Customer</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.deleted ? 'destructive' : 'secondary'}>{c.deleted ? 'Deleted' : 'Active'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
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
