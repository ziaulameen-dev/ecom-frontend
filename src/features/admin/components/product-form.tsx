'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AdminProduct, MediaItem } from '@/lib/types';
import { useAdminCategories } from '../hooks/use-admin-categories';
import { useCreateProduct, useUpdateProduct } from '../hooks/use-admin-products';
import { MediaManager } from './media-manager';
import { VariantsManager } from './variants-manager';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const toPaise = (rupees: string) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise: number) => (paise / 100).toFixed(2);

interface Props {
  mode: 'create' | 'edit';
  product?: AdminProduct;
}

/**
 * Create/edit a product against the real ecom-api fields:
 * name, slug, description, categoryId, stock, priceMinor, offerPriceMinor,
 * media (common images + videos; imageUrl cover is derived), active. (Weight,
 * package size and selling-type from the mockup aren't in the backend model.)
 */
export function ProductForm({ mode, product }: Props) {
  const router = useRouter();
  const { data: categories } = useAdminCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct();

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [price, setPrice] = useState(product ? toRupees(product.priceMinor) : '');
  const [offerPrice, setOfferPrice] = useState(
    product?.offerPriceMinor != null ? toRupees(product.offerPriceMinor) : '',
  );
  const [media, setMedia] = useState<MediaItem[]>(
    product?.media?.length
      ? product.media
      : product?.imageUrl
        ? [{ url: product.imageUrl, type: 'image' }]
        : [],
  );
  const [active, setActive] = useState(product?.active ?? true);

  const pending = create.isPending || update.isPending;
  // When a product has variants, price/stock live on each variant — the
  // product-level values are ignored, so lock them here to avoid confusion.
  const hasVariants = (product?.variants.length ?? 0) > 0;

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Name must be at least 2 characters');

    const body = {
      name: name.trim(),
      slug: (slug.trim() || slugify(name)) || undefined,
      priceMinor: hasVariants ? 0 : toPaise(price),
      offerPriceMinor: hasVariants
        ? null
        : offerPrice.trim() === ''
          ? (mode === 'edit' ? null : undefined)
          : toPaise(offerPrice),
      stock: hasVariants ? 0 : Number(stock) || 0,
      categoryId: categoryId || undefined,
      description: description.trim() || undefined,
      media,
      active,
    };

    try {
      if (mode === 'create') {
        const created = await create.mutateAsync(body) as { id: string };
        toast.success('Product created — add variants below');
        router.push(`/admin/products/${created.id}/edit`);
      } else if (product) {
        await update.mutateAsync({ id: product.id, body });
        toast.success('Product saved');
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/products"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
            aria-label="Back to product list"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Back to product list</p>
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {mode === 'create' ? 'Add New Product' : name || 'Edit Product'}
            </h1>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.push('/admin/products')}>
            Discard
          </Button>
          <Button type="submit" className="flex-1 sm:flex-none" disabled={pending}>
            {pending ? 'Saving…' : mode === 'create' ? 'Add Product' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-name">Product Name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cashmere Blazer" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-slug">URL slug <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={name ? slugify(name) : 'auto-generated'} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-desc">Business Description</Label>
                <Textarea id="p-desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the product…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Category</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-cat">Product Category</Label>
                <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="p-cat"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Inventory</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 sm:max-w-40">
                <Label htmlFor="p-stock">Quantity</Label>
                <Input id="p-stock" type="number" min={0} value={hasVariants ? '0' : stock} onChange={(e) => setStock(e.target.value)} disabled={hasVariants} />
                {hasVariants && <p className="text-xs text-muted-foreground">Managed per variant — set stock on each variant below.</p>}
              </div>
            </CardContent>
          </Card>

          {mode === 'edit' && product && (
            <Card>
              <CardHeader><CardTitle className="text-base">Variants</CardTitle></CardHeader>
              <CardContent><VariantsManager product={product} /></CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Common Media</CardTitle></CardHeader>
            <CardContent>
              <MediaManager value={media} onChange={setMedia} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-price">Price (₹)</Label>
                <Input id="p-price" type="number" step="0.01" min={0} value={hasVariants ? '0' : price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" disabled={hasVariants} />
                <p className="text-xs text-muted-foreground">
                  {hasVariants ? 'Managed per variant — set price on each variant below.' : 'Base price used when the product has no variants.'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-offer">Offer price (₹) <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="p-offer" type="number" step="0.01" min={0} value={hasVariants ? '' : offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="Discounted price" disabled={hasVariants} />
                {!hasVariants && <p className="text-xs text-muted-foreground">If set, shown as the sale price with the price struck through.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Active <span className="text-muted-foreground">(visible in the store)</span>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
