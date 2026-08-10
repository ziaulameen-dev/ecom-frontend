'use client';

import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminAttributes, useAdminCategories, useAdminProducts } from '@/features/admin';
import type { AttributeType } from '@/lib/types';
import { mediaSrc, money } from '@/lib/utils';

export default function ViewProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: products, isLoading } = useAdminProducts();
  const { data: categories } = useAdminCategories();
  const { data: attributes } = useAdminAttributes();
  const product = products?.find((p) => p.id === id);

  const valueLabel = useMemo(() => {
    const m = new Map<string, string>();
    (attributes ?? []).forEach((t: AttributeType) =>
      t.values.forEach((v) => m.set(v.id, `${t.name}: ${v.value}`)),
    );
    return m;
  }, [attributes]);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!product) {
    return (
      <div className="space-y-3">
        <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to product list
        </Link>
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const categoryName = categories?.find((c) => c.id === product.categoryId)?.name ?? product.category ?? '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="flex size-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent" aria-label="Back to product list">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Back to product list</p>
          <h1 className="text-xl font-semibold">{product.name}</h1>
        </div>
        <div className="ml-auto">
          <Button asChild>
            <Link href={`/admin/products/${product.id}/edit`}><Pencil className="size-4" /> Edit</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Field label="Status">
                <Badge variant={product.active ? 'default' : 'secondary'}>{product.active ? 'Active' : 'Inactive'}</Badge>
              </Field>
              <Field label="Price">
                {product.offerPriceMinor != null ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{money(product.offerPriceMinor)}</span>
                    <span className="text-muted-foreground line-through">{money(product.priceMinor)}</span>
                  </span>
                ) : (
                  money(product.priceMinor)
                )}
              </Field>
              <Field label="Base stock">{product.stock}</Field>
              <Field label="Category">{categoryName}</Field>
              <Field label="Slug">{product.slug ?? '—'}</Field>
              <Field label="Description">
                <span className="whitespace-pre-wrap text-muted-foreground">{product.description || '—'}</span>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Variants ({product.variants.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {product.variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No variants — sells at base price and stock.</p>
              ) : (
                product.variants.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                    <span className="flex flex-wrap gap-1">
                      {v.valueIds.map((vid) => (
                        <span key={vid} className="rounded bg-muted px-1.5 py-0.5 text-xs">{valueLabel.get(vid) ?? vid.slice(0, 6)}</span>
                      ))}
                    </span>
                    {v.sku && <span className="text-xs text-muted-foreground">SKU {v.sku}</span>}
                    <span className="font-medium">{money(v.priceMinor)}</span>
                    <span className="text-xs text-muted-foreground">stock {v.stock}</span>
                    {v.isDefault && <Badge variant="secondary">default</Badge>}
                    {v.listedSeparately && <Badge>listed</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Common Media</CardTitle></CardHeader>
            <CardContent>
              {product.media.length === 0 && !product.imageUrl ? (
                <div className="grid aspect-video w-full place-items-center rounded-lg border bg-muted/40 text-muted-foreground">
                  <div className="flex flex-col items-center gap-1"><ImageOff className="size-6" /><span className="text-xs">No media</span></div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(product.media.length ? product.media : [{ url: product.imageUrl!, type: 'image' as const }]).map((m, i) => (
                    <div key={`${m.url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg border bg-muted/40">
                      {m.type === 'video' ? (
                        <video src={mediaSrc(m.url)} className="h-full w-full object-cover" muted playsInline controls />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaSrc(m.url)} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
