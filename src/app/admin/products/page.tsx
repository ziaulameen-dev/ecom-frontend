'use client';

import { ChevronDown, ChevronRight, Eye, ImageOff, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { confirm } from '@/components/confirm-dialog';
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
import { useAdminAttributes, useAdminCategories, useAdminProducts, useDeleteProduct, useUpdateProduct } from '@/features/admin';
import type { AdminProduct } from '@/lib/types';
import { mediaSrc, money } from '@/lib/utils';

export default function AdminProductsPage() {
  const { data: products, isLoading } = useAdminProducts();
  const { data: categories } = useAdminCategories();
  const { data: attributes } = useAdminAttributes();

  const valueLabel = useMemo(() => {
    const m = new Map<string, string>();
    (attributes ?? []).forEach((t) => t.values.forEach((v) => m.set(v.id, `${t.name}: ${v.value}`)));
    return m;
  }, [attributes]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.slug ?? '').includes(q)) return false;
      if (category !== 'all' && p.categoryId !== category) return false;
      if (status === 'active' && !p.active) return false;
      if (status === 'inactive' && p.active) return false;
      return true;
    });
  }, [products, search, category, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">{products?.length ?? 0} products</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new"><Plus className="size-4" /> Add Product</Link>
        </Button>
      </div>

      {/* Toolbar / filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Variants</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3" colSpan={6}><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No products found.</td></tr>
              ) : (
                filtered.map((p) => <ProductRow key={p.id} product={p} valueLabel={valueLabel} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProductRow({ product, valueLabel }: { product: AdminProduct; valueLabel: Map<string, string> }) {
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

  return (
    <>
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {hasVariants ? (
            <button type="button" onClick={() => setExpanded((o) => !o)} className="text-muted-foreground hover:text-foreground" aria-label="Toggle variants">
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/40">
            {product.imageUrl ? (
              <Image src={mediaSrc(product.imageUrl)} alt={product.name} width={40} height={40} unoptimized className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <Link href={`/admin/products/${product.id}`} className="block truncate font-medium hover:underline">{product.name}</Link>
            <div className="truncate text-xs text-muted-foreground">{product.slug ?? '—'}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {hasVariants ? (
          <span className="font-medium">
            {minPrice === maxPrice ? money(minPrice) : `${money(minPrice)} – ${money(maxPrice)}`}
          </span>
        ) : product.offerPriceMinor != null ? (
          <div className="flex items-center gap-2">
            <span className="font-medium">{money(product.offerPriceMinor)}</span>
            <span className="text-xs text-muted-foreground line-through">{money(product.priceMinor)}</span>
          </div>
        ) : (
          <span className="font-medium">{money(product.priceMinor)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{totalStock}</td>
      <td className="px-4 py-3 text-muted-foreground">{product.variants.length}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => update.mutate({ id: product.id, body: { active: !product.active } })}
          title="Toggle status"
        >
          <Badge variant={product.active ? 'default' : 'secondary'}>{product.active ? 'Active' : 'Inactive'}</Badge>
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}`)}>
                <Eye className="size-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}/edit`)}>
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => { if (await confirm({ title: 'Delete product?', description: `"${product.name}" will be permanently removed.`, confirmText: 'Delete', destructive: true })) del.mutate(product.id); }}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
    {expanded && product.variants.map((v) => (
      <tr key={v.id} className="border-b border-l-2 border-l-muted-foreground/30 bg-muted/20 text-sm last:border-b-0">
        <td className="py-2 pl-11 pr-4">
          <div className="flex items-center gap-2">
            {v.images[0] ? (
              <Image src={mediaSrc(v.images[0])} alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded border object-cover" />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded border bg-muted/40"><ImageOff className="size-3.5 text-muted-foreground" /></span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                {v.valueIds.map((id) => <span key={id} className="rounded bg-muted px-1.5 py-0.5 text-xs">{valueLabel.get(id) ?? id.slice(0, 6)}</span>)}
                {v.isDefault && <Badge variant="secondary">default</Badge>}
              </div>
              {v.sku && <div className="mt-0.5 text-xs text-muted-foreground">SKU {v.sku}</div>}
            </div>
          </div>
        </td>
        <td className="px-4 py-2">
          {v.offerPriceMinor != null ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">{money(v.offerPriceMinor)}</span>
              <span className="text-xs text-muted-foreground line-through">{money(v.priceMinor)}</span>
            </div>
          ) : (
            <span className="font-medium">{money(v.priceMinor)}</span>
          )}
        </td>
        <td className="px-4 py-2 text-muted-foreground">{v.stock}</td>
        <td className="px-4 py-2" />
        <td className="px-4 py-2">
          {v.listedSeparately ? <Badge>Listed</Badge> : <Badge variant="secondary">Not listed</Badge>}
        </td>
        <td className="px-4 py-2" />
      </tr>
    ))}
    </>
  );
}
