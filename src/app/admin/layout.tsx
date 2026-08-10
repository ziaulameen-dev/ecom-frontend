'use client';

import {
  BadgePercent, Boxes, LayoutDashboard, ListTree, Menu, PackageSearch,
  ShoppingCart, Star, Undo2, Settings, Store, Users, X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthModal, useMe } from '@/features/auth';
import { sseUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'Products', icon: PackageSearch },
  { href: '/admin/categories', label: 'Categories', icon: ListTree },
  { href: '/admin/attributes', label: 'Attributes', icon: Boxes },
  { href: '/admin/returns', label: 'Returns', icon: Undo2 },
  { href: '/admin/coupons', label: 'Coupons', icon: BadgePercent },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  const pathname = usePathname();
  const qc = useQueryClient();
  const openLogin = useAuthModal((s) => s.openLogin);
  const isAdmin = !!me?.roles?.includes('admin');
  const [live, setLive] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !me) openLogin('/admin');
  }, [isLoading, me, openLogin]);

  // Live updates: refresh orders/returns as they change server-side (SSE).
  useEffect(() => {
    if (!isAdmin) return;
    const es = new EventSource(sseUrl('/api/admin/events'), {
      withCredentials: true,
    });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'returns'] });
      try {
        const ev = JSON.parse(e.data);
        if (ev?.type?.startsWith('order')) toast.info(`Order ${ev.status ?? 'updated'}`);
        if (ev?.type?.startsWith('return')) toast.info('Return updated');
      } catch {}
    };
    return () => es.close();
  }, [isAdmin, qc]);

  if (!isAdmin) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Admins only — redirecting…</div>;
  }

  const sidebar = (
    <>
      <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-6 py-5 text-lg font-bold">
        <Store className="size-5 text-foreground" /> {process.env.NEXT_PUBLIC_STORE_NAME ?? 'Admin'}
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/" className="border-t px-6 py-4 text-sm text-muted-foreground hover:text-foreground">
        ← Back to store
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile top bar with burger */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-md p-1 hover:bg-sidebar-accent">
          <Menu className="size-5" />
        </button>
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold">
          <Store className="size-5 text-foreground" /> Admin
        </Link>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
          {sidebar}
        </aside>

        {/* Mobile drawer (kept mounted so it can slide in/out) */}
        <div className={cn('fixed inset-0 z-40 md:hidden', !mobileOpen && 'pointer-events-none')}>
          <div
            onClick={() => setMobileOpen(false)}
            className={cn(
              'absolute inset-0 bg-black/50 transition-opacity duration-300',
              mobileOpen ? 'opacity-100' : 'opacity-0',
            )}
          />
          <aside
            className={cn(
              'absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 ease-in-out',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-2 top-3 rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
