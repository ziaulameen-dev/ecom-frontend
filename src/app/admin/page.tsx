'use client';

import {
  ArrowUpRight,
  CreditCard,
  Download,
  IndianRupee,
  Package,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAdminOrders, useAdminProducts, useAdminReturns } from '@/features/admin';
import type { AdminOrder } from '@/lib/types';
import { cn, money } from '@/lib/utils';

export default function AdminDashboard() {
  const { data: ordersData, isLoading: ordersLoading } = useAdminOrders({ limit: 100 });
  const { data: products, isLoading: productsLoading } = useAdminProducts();
  const { data: returns, isLoading: returnsLoading } = useAdminReturns();

  const orders: AdminOrder[] = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    return ordersData.items ?? [];
  }, [ordersData]);

  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isLoading = ordersLoading || productsLoading || returnsLoading;

  const validOrders = useMemo(() => {
    return orders.filter((o) =>
      ['paid', 'processing', 'fulfilled', 'shipped', 'delivered'].includes(o.status),
    );
  }, [orders]);

  const calculatedRevenue = useMemo(() => {
    return validOrders.reduce((s, o) => s + (o.totalMinor - (o.refundedMinor ?? 0)), 0);
  }, [validOrders]);

  const totalRevenue = ordersData?.metrics?.totalRevenueMinor ?? calculatedRevenue;

  const openOrders = ordersData?.metrics?.toShipCount ?? orders.filter((o) =>
    ['paid', 'processing', 'fulfilled'].includes(o.status),
  ).length;
  const pendingReturns = (returns ?? []).filter((r) => r.status === 'requested').length;

  const stats = [
    { label: 'Total Revenue', value: money(totalRevenue), icon: IndianRupee, href: '/admin/orders' },
    { label: 'Orders to Fulfil', value: String(openOrders), icon: ShoppingCart, href: '/admin/orders' },
    { label: 'Active Products', value: String(products?.length ?? 0), icon: PackageSearch, href: '/admin/products' },
    { label: 'Returns to Review', value: String(pendingReturns), icon: Undo2, href: '/admin/returns' },
  ];

  // Daily timeline breakdown for chart
  const timelineData = useMemo(() => {
    const daysCount = period === '7d' ? 7 : 30;
    const now = new Date();
    const days = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = startOfDay(subDays(now, i));
      const dayOrders = validOrders.filter((o) => isSameDay(new Date(o.createdAt), d));
      const dayRev = dayOrders.reduce(
        (acc, o) => acc + (o.totalMinor - (o.refundedMinor ?? 0)),
        0,
      );
      days.push({
        date: d,
        label: format(d, period === '7d' ? 'EEE, MMM d' : 'MMM d'),
        shortLabel: format(d, period === '7d' ? 'EEE' : 'd'),
        revenueMinor: dayRev,
        orderCount: dayOrders.length,
      });
    }
    return days;
  }, [validOrders, period]);

  const maxDailyRevenue = useMemo(() => {
    const max = Math.max(...timelineData.map((d) => d.revenueMinor), 0);
    return max > 0 ? max : 50000; // minimum ₹500 scale
  }, [timelineData]);

  const periodRevenue = useMemo(() => {
    return timelineData.reduce((acc, d) => acc + d.revenueMinor, 0);
  }, [timelineData]);

  const periodOrdersCount = useMemo(() => {
    return timelineData.reduce((acc, d) => acc + d.orderCount, 0);
  }, [timelineData]);

  const avgOrderValue = useMemo(() => {
    return periodOrdersCount > 0 ? Math.round(periodRevenue / periodOrdersCount) : 0;
  }, [periodRevenue, periodOrdersCount]);

  // Payment method breakdown in period
  const paymentBreakdown = useMemo(() => {
    let codCount = 0;
    let onlineCount = 0;
    (orders ?? []).forEach((o) => {
      if (o.paymentMethod === 'cod') codCount++;
      else onlineCount++;
    });
    const total = codCount + onlineCount;
    return {
      codCount,
      onlineCount,
      codPercent: total > 0 ? Math.round((codCount / total) * 100) : 0,
      onlinePercent: total > 0 ? Math.round((onlineCount / total) * 100) : 0,
    };
  }, [orders]);

  // Top selling products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenueMinor: number }>();
    validOrders.forEach((o) => {
      (o.items ?? []).forEach((item) => {
        const existing = map.get(item.productId || item.name) ?? {
          name: item.name,
          quantity: 0,
          revenueMinor: 0,
        };
        existing.quantity += item.quantity;
        existing.revenueMinor += item.unitAmountMinor * item.quantity;
        map.set(item.productId || item.name, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [validOrders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Store performance, revenue analytics &amp; order trends</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/orders">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              View All Orders <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: stats.length }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-5">
                  <Skeleton className="size-11 shrink-0 rounded-sm" />
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
                    <div className="grid size-11 place-items-center rounded-sm bg-sidebar-accent text-sidebar-accent-foreground">
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

      {/* Main Analytics Grid: Revenue Chart + Top Products */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue & Orders Trend Chart (Takes 2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-primary-button" />
                Revenue &amp; Sales Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily store earnings and order volumes
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-sm">
              <button
                type="button"
                onClick={() => setPeriod('7d')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors',
                  period === '7d'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setPeriod('30d')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors',
                  period === '30d'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Last 30 Days
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {/* Period Mini Metrics */}
            <div className="grid grid-cols-3 gap-3 border-b pb-4 text-center sm:text-left">
              <div>
                <span className="text-[11px] text-muted-foreground block">Period Revenue</span>
                <span className="text-lg font-bold text-foreground">{money(periodRevenue)}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Orders Placed</span>
                <span className="text-lg font-bold text-foreground">{periodOrdersCount}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Average Order Value</span>
                <span className="text-lg font-bold text-foreground">{money(avgOrderValue)}</span>
              </div>
            </div>

            {/* Interactive SVG Bar Chart */}
            <div className="relative">
              {hoveredIdx !== null && timelineData[hoveredIdx] && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-3 py-1.5 rounded shadow-lg text-xs flex items-center gap-3 animate-in fade-in duration-150 pointer-events-none">
                  <span className="font-semibold">{timelineData[hoveredIdx].label}:</span>
                  <span className="text-emerald-400 dark:text-emerald-600 font-bold">
                    {money(timelineData[hoveredIdx].revenueMinor)}
                  </span>
                  <span className="opacity-80">({timelineData[hoveredIdx].orderCount} orders)</span>
                </div>
              )}

              <div className="h-56 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 px-1 border-b">
                {timelineData.map((d, idx) => {
                  const heightPercent = Math.max(
                    6,
                    Math.round((d.revenueMinor / maxDailyRevenue) * 100),
                  );
                  const isHovered = hoveredIdx === idx;

                  return (
                    <div
                      key={d.label}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="group relative flex-1 h-full flex flex-col justify-end items-center cursor-pointer"
                    >
                      <div
                        style={{ height: `${d.revenueMinor > 0 ? heightPercent : 4}%` }}
                        className={cn(
                          'w-full max-w-[32px] rounded-t-sm transition-all duration-200',
                          d.revenueMinor > 0
                            ? isHovered
                              ? 'bg-[#117a7a] dark:bg-[#18a3a3]'
                              : 'bg-[#117a7a]/70 hover:bg-[#117a7a] dark:bg-[#18a3a3]/70'
                            : 'bg-muted/40',
                        )}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] text-muted-foreground pt-2 px-1">
                <span>{timelineData[0]?.label}</span>
                <span>{timelineData[Math.floor(timelineData.length / 2)]?.label}</span>
                <span>{timelineData[timelineData.length - 1]?.label}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Top Products & Payment Breakdown */}
        <div className="space-y-6">
          {/* Top Selling Products Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="size-4 text-primary-button" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 divide-y">
              {topProducts.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No sales recorded yet.
                </p>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold truncate text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.quantity} units sold</p>
                    </div>
                    <div className="font-bold text-foreground shrink-0 text-right">
                      {money(p.revenueMinor)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Payment Method Split Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="size-4 text-primary-button" />
                Payment Method Split
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Online (Cashfree)</span>
                  <span className="font-semibold text-foreground">
                    {paymentBreakdown.onlineCount} orders ({paymentBreakdown.onlinePercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    style={{ width: `${paymentBreakdown.onlinePercent}%` }}
                    className="h-full bg-[#117a7a] rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash on Delivery (COD)</span>
                  <span className="font-semibold text-foreground">
                    {paymentBreakdown.codCount} orders ({paymentBreakdown.codPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    style={{ width: `${paymentBreakdown.codPercent}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
