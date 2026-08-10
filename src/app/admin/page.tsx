'use client';

import { IndianRupee, PackageSearch, ShoppingCart, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOrders, useAdminProducts, useAdminReturns } from '@/features/admin';
import { money } from '@/lib/utils';

export default function AdminDashboard() {
  const { data: orders, isLoading: ordersLoading } = useAdminOrders();
  const { data: products, isLoading: productsLoading } = useAdminProducts();
  const { data: returns, isLoading: returnsLoading } = useAdminReturns();

  const isLoading = ordersLoading || productsLoading || returnsLoading;

  const revenue = (orders ?? [])
    .filter((o) => ['paid', 'fulfilled', 'shipped', 'delivered'].includes(o.status))
    .reduce((s, o) => s + o.totalMinor - o.refundedMinor, 0);
  const pendingReturns = (returns ?? []).filter((r) => r.status === 'requested').length;
  const openOrders = (orders ?? []).filter((o) => ['paid', 'fulfilled'].includes(o.status)).length;

  const stats = [
    { label: 'Revenue', value: money(revenue), icon: IndianRupee, href: '/admin/orders' },
    { label: 'Orders to fulfil', value: String(openOrders), icon: ShoppingCart, href: '/admin/orders' },
    { label: 'Products', value: String(products?.length ?? 0), icon: PackageSearch, href: '/admin/products' },
    { label: 'Returns to review', value: String(pendingReturns), icon: Undo2, href: '/admin/returns' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of orders, products &amp; returns</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: stats.length }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-5">
                  <Skeleton className="size-11 shrink-0 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((s) => (
              <Link key={s.label} href={s.href}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="grid size-11 place-items-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                      <s.icon className="size-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Orders &amp; returns update live via the ● indicator in the sidebar.
      </p>
    </div>
  );
}
