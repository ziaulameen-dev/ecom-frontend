'use client';

import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Hand,
  ImageOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  useAdminAttributes,
  useAdminCategories,
  useAdminProducts,
  useBulkUpdateFulfillmentMethod,
  useDeleteProduct,
  useUpdateProduct,
} from '@/features/admin';
import type { AdminProduct } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';

export default function AdminProductsPage() {
  const { data: products, isLoading } = useAdminProducts();
  const { data: categories } = useAdminCategories();
  const { data: attributes } = useAdminAttributes();
  const bulkUpdate = useBulkUpdateFulfillmentMethod();

  const valueLabel = useMemo(() => {
    const m = new Map<string, string>();
    (attributes ?? []).forEach((t) =>
      t.values.forEach((v) => m.set(v.id, `${t.name}: ${v.value}`)),
    );
    return m;
  }, [attributes]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | 'automatic' | 'manual'>('all');
  const [stockFilter, setStockFilter] = useState<
    'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  >('all');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { lowStockCount, outOfStockCount } = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const p of products ?? []) {
      const totalStock =
        p.variants.length > 0
          ? p.variants.reduce((n, v) => n + v.stock, 0)
          : p.stock;
      const threshold = p.lowStockThreshold ?? 5;
      if (totalStock === 0) {
        out += 1;
      } else if (totalStock <= threshold) {
        low += 1;
      }
    }
    return { lowStockCount: low, outOfStockCount: out };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.slug ?? '').includes(q)) return false;
      if (category !== 'all' && p.categoryId !== category) return false;
      if (status === 'active' && !p.active) return false;
      if (status === 'inactive' && p.active) return false;
      if (fulfillmentFilter !== 'all') {
        const method = p.fulfillmentMethod ?? 'automatic';
        if (method !== fulfillmentFilter) return false;
      }
      if (stockFilter !== 'all') {
        const totalStock =
          p.variants.length > 0
            ? p.variants.reduce((n, v) => n + v.stock, 0)
            : p.stock;
        const threshold = p.lowStockThreshold ?? 5;
        if (stockFilter === 'out_of_stock' && totalStock > 0) return false;
        if (stockFilter === 'low_stock' && (totalStock === 0 || totalStock > threshold))
          return false;
        if (stockFilter === 'in_stock' && totalStock <= threshold) return false;
      }
      return true;
    });
  }, [products, search, category, status, fulfillmentFilter, stockFilter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkFulfillment = async (method: 'automatic' | 'manual') => {
    if (selectedIds.size === 0) return;
    try {
      const res = await bulkUpdate.mutateAsync({
        productIds: Array.from(selectedIds),
        fulfillmentMethod: method,
      });
      toast.success(
        `Updated ${res.updated || selectedIds.size} products to ${method === 'automatic' ? 'Automatic' : 'Manual'} fulfillment`,
      );
      setSelectedIds(new Set());
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSetAllFulfillment = async (method: 'automatic' | 'manual') => {
    const title =
      method === 'automatic'
        ? 'Make ALL products Automatic fulfillment?'
        : 'Make ALL products Manual fulfillment?';
    const description =
      method === 'automatic'
        ? 'All products will automatically advance orders to Fulfilled once paid and stock is available.'
        : 'All products will require staff to manually click "Fulfil" after payment before fulfillment.';

    if (
      !(await confirm({
        title,
        description,
        confirmText: `Set All to ${method === 'automatic' ? 'Automatic' : 'Manual'}`,
      }))
    ) {
      return;
    }

    try {
      const res = await bulkUpdate.mutateAsync({
        fulfillmentMethod: method,
      });
      toast.success(
        `All products (${res.updated || 'catalog'}) set to ${method === 'automatic' ? 'Automatic' : 'Manual'} fulfillment`,
      );
      setSelectedIds(new Set());
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">{products?.length ?? 0} products in catalog</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Global Quick Fulfillment Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Settings2 className="size-3.5" />
                <span>Global Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSetAllFulfillment('automatic')}>
                <Zap className="size-4 text-emerald-600 mr-1.5" />
                <span>Make ALL Products Automatic</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetAllFulfillment('manual')}>
                <Hand className="size-4 text-amber-600 mr-1.5" />
                <span>Make ALL Products Manual</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild size="sm" className="bg-[#187b7b] hover:bg-[#187b7b]/90 text-white">
            <Link href="/admin/products/new">
              <Plus className="size-4" /> Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Low Stock / Out of Stock Warning Banner */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/80">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Inventory Alert: </span>
              {outOfStockCount > 0 && (
                <span className="font-medium text-destructive dark:text-red-400">
                  {outOfStockCount} out of stock
                </span>
              )}
              {outOfStockCount > 0 && lowStockCount > 0 && <span>, </span>}
              {lowStockCount > 0 && (
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {lowStockCount} low in stock
                </span>
              )}
              . Reorder recommended to prevent fulfillment delays.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stockFilter !== 'all' ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                onClick={() => setStockFilter('all')}
              >
                Show All
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                onClick={() => setStockFilter(outOfStockCount > 0 ? 'out_of_stock' : 'low_stock')}
              >
                View Low / Out of Stock
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Toolbar / filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={stockFilter}
          onValueChange={(v) => setStockFilter(v as typeof stockFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="low_stock">Low stock</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={fulfillmentFilter}
          onValueChange={(v) => setFulfillmentFilter(v as typeof fulfillmentFilter)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fulfillment</SelectItem>
            <SelectItem value="automatic">Automatic only</SelectItem>
            <SelectItem value="manual">Manual only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar when products are selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-[#187b7b]/5 border-[#187b7b]/30 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#187b7b]">
              {selectedIds.size} product{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
              onClick={() => handleBulkFulfillment('automatic')}
              disabled={bulkUpdate.isPending}
            >
              <Zap className="size-3.5 fill-emerald-600 text-emerald-600" />
              <span>Set to Automatic</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/20"
              onClick={() => handleBulkFulfillment('manual')}
              disabled={bulkUpdate.isPending}
            >
              <Hand className="size-3.5 text-amber-600" />
              <span>Set to Manual</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
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
                <th className="px-3 py-3 w-10 text-center">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Variants</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Fulfillment</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3" colSpan={8}>
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    valueLabel={valueLabel}
                    selected={selectedIds.has(p.id)}
                    onToggleSelect={() => toggleSelect(p.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProductRow({
  product,
  valueLabel,
  selected,
  onToggleSelect,
}: {
  product: AdminProduct;
  valueLabel: Map<string, string>;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const router = useRouter();
  const del = useDeleteProduct();
  const update = useUpdateProduct();
  const [expanded, setExpanded] = useState(false);
  const hasVariants = product.variants.length > 0;
  // For a variant product, the row shows aggregates: total stock across all
  // variants and the effective (offer-aware) price range.
  const totalStock = hasVariants
    ? product.variants.reduce((n, v) => n + v.stock, 0)
    : product.stock;
  const variantPrices = product.variants.map((v) => v.offerPriceMinor ?? v.priceMinor);
  const minPrice = hasVariants ? Math.min(...variantPrices) : 0;
  const maxPrice = hasVariants ? Math.max(...variantPrices) : 0;

  const isAuto = (product.fulfillmentMethod ?? 'automatic') === 'automatic';

  // Strip template placeholder tokens like {description} from product names
  const cleanName =
    (product.name ?? '').replace(/\{[^}]+\}/g, '').replace(/\s{2,}/g, ' ').trim() ||
    product.name;

  return (
    <>
      <tr
        className={cn(
          'border-b last:border-0 hover:bg-muted/30 transition-colors',
          selected && 'bg-[#187b7b]/5',
        )}
      >
        <td className="px-3 py-3 text-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${cleanName}`}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasVariants ? (
              <button
                type="button"
                onClick={() => setExpanded((o) => !o)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Toggle variants"
              >
                {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            ) : (
              <span className="inline-block w-4" />
            )}
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/40">
              {product.imageUrl ? (
                <Image
                  src={mediaSrc(product.imageUrl)}
                  alt={cleanName}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageOff className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/products/${product.id}`}
                className="block truncate font-medium hover:underline text-foreground"
              >
                {cleanName}
              </Link>
              <div className="truncate text-xs text-muted-foreground font-mono">
                {product.slug ?? '—'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {hasVariants ? (
            <span className="font-medium">
              {minPrice === maxPrice
                ? money(minPrice)
                : `${money(minPrice)} – ${money(maxPrice)}`}
            </span>
          ) : product.offerPriceMinor != null ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">{money(product.offerPriceMinor)}</span>
              <span className="text-xs text-muted-foreground line-through">
                {money(product.priceMinor)}
              </span>
            </div>
          ) : (
            <span className="font-medium">{money(product.priceMinor)}</span>
          )}
        </td>
        <td className="px-4 py-3 font-medium">
          {totalStock === 0 ? (
            <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
              <AlertCircle className="size-3" />
              <span>Out of stock</span>
            </Badge>
          ) : totalStock <= (product.lowStockThreshold ?? 5) ? (
            <Badge
              variant="outline"
              className="gap-1 text-[11px] font-medium border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            >
              <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
              <span>Low stock ({totalStock})</span>
            </Badge>
          ) : (
            <span className="text-muted-foreground">{totalStock}</span>
          )}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{product.variants.length}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() =>
              update.mutate({ id: product.id, body: { active: !product.active } })
            }
            title="Toggle active/inactive status"
          >
            <Badge variant={product.active ? 'default' : 'secondary'}>
              {product.active ? 'Active' : 'Inactive'}
            </Badge>
          </button>
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() =>
              update.mutate({
                id: product.id,
                body: { fulfillmentMethod: isAuto ? 'manual' : 'automatic' },
              })
            }
            title={`Click to switch to ${isAuto ? 'Manual' : 'Automatic'} fulfillment`}
            className="group focus:outline-none"
          >
            {isAuto ? (
              <Badge
                variant="outline"
                className="gap-1 text-xs font-medium border-emerald-400 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30 transition-colors cursor-pointer"
              >
                <Zap className="size-3 fill-emerald-600 text-emerald-600" />
                <span>Auto Fulfil</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 text-xs font-medium border-amber-400 text-amber-800 dark:border-amber-800 dark:text-amber-300 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 transition-colors cursor-pointer"
              >
                <Hand className="size-3 text-amber-600" />
                <span>Manual</span>
              </Badge>
            )}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}`)}>
                  <Eye className="size-4" /> View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                >
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    update.mutate({
                      id: product.id,
                      body: { fulfillmentMethod: isAuto ? 'manual' : 'automatic' },
                    })
                  }
                >
                  {isAuto ? (
                    <>
                      <Hand className="size-4 text-amber-600" />
                      <span>Set to Manual Fulfillment</span>
                    </>
                  ) : (
                    <>
                      <Zap className="size-4 text-emerald-600" />
                      <span>Set to Automatic Fulfillment</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => {
                    if (
                      await confirm({
                        title: 'Delete product?',
                        description: `"${cleanName}" will be permanently removed.`,
                        confirmText: 'Delete',
                        destructive: true,
                      })
                    )
                      del.mutate(product.id);
                  }}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
      {expanded &&
        product.variants.map((v) => {
          let resolvedName = product.name ?? '';
          for (const [key, val] of Object.entries(v.customVariables ?? {})) {
            resolvedName = resolvedName.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
          }
          resolvedName = resolvedName
            .replace(/\{[^}]+\}/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

          const attrLabels = v.valueIds
            .map((id) => valueLabel.get(id))
            .filter(Boolean) as string[];
          const secondaryPart = attrLabels.join(' / ');

          return (
            <tr
              key={v.id}
              className="border-b border-l-2 border-l-muted-foreground/30 bg-muted/20 text-sm last:border-b-0"
            >
              <td className="px-3 py-2" />
              <td className="py-2 pl-11 pr-4">
                <div className="flex items-center gap-2">
                  {v.images[0] ? (
                    <Image
                      src={mediaSrc(v.images[0])}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      className="size-8 shrink-0 rounded border object-cover"
                    />
                  ) : (
                    <span className="grid size-8 shrink-0 place-items-center rounded border bg-muted/40">
                      <ImageOff className="size-3.5 text-muted-foreground" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-sm">
                      {resolvedName}
                      {secondaryPart && (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          – {secondaryPart}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {!resolvedName && !secondaryPart && (
                        <span className="text-xs text-muted-foreground">No options</span>
                      )}
                      {v.isDefault && <Badge variant="secondary">default</Badge>}
                      {v.sku && <div className="text-xs text-muted-foreground">SKU {v.sku}</div>}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2">
                {v.offerPriceMinor != null ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{money(v.offerPriceMinor)}</span>
                    <span className="text-xs text-muted-foreground line-through">
                      {money(v.priceMinor)}
                    </span>
                  </div>
                ) : (
                  <span className="font-medium">{money(v.priceMinor)}</span>
                )}
              </td>
              <td className="px-4 py-2">
                {v.stock === 0 ? (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-normal">
                    0 left
                  </Badge>
                ) : v.stock <= (product.lowStockThreshold ?? 5) ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 font-normal border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  >
                    {v.stock} left
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">{v.stock}</span>
                )}
              </td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2">
                {v.listedSeparately ? <Badge>Listed</Badge> : <Badge variant="secondary">Not listed</Badge>}
              </td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2" />
            </tr>
          );
        })}
    </>
  );
}
