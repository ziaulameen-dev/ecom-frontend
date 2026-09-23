'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AdminProduct, MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
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
 * media (common images + videos; imageUrl cover is derived), active, fulfillmentMethod.
 */
export function ProductForm({ mode, product }: Props) {
  const router = useRouter();
  const { data: categories } = useAdminCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct();

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [additionalInfo, setAdditionalInfo] = useState(product?.additionalInfo ?? '');
  const [tags, setTags] = useState((product?.tags ?? []).join(', '));
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
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'automatic' | 'manual'>(
    product?.fulfillmentMethod ?? 'automatic',
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(product?.lowStockThreshold ?? 5),
  );

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
      lowStockThreshold: Number(lowStockThreshold) >= 0 ? Number(lowStockThreshold) : 5,
      categoryId: categoryId || undefined,
      shortDescription: shortDescription.trim() || undefined,
      description: description.trim() || undefined,
      additionalInfo: additionalInfo.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      media,
      active,
      fulfillmentMethod,
    };

    try {
      if (mode === 'create') {
        const created = await create.mutateAsync(body) as { id: string };
        toast.success('Product created — opening variant manager');
        router.push(`/admin/products/${created.id}/edit?addVariant=true`);
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
            {pending ? 'Saving…' : mode === 'create' ? 'Save & Add Variants' : 'Save changes'}
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
                <Label htmlFor="p-short">Short description <span className="text-muted-foreground">(teaser near the top)</span></Label>
                <Textarea id="p-short" rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A one or two line summary…" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Description</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Describe the product…" />
                <p className="text-xs text-muted-foreground">
                  Tip: use variables like <code>{'{color}'}</code> or <code>{'{size}'}</code> — they’re replaced with the shopper’s selected variant, so one description works for every variant.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Additional information</Label>
                <RichTextEditor value={additionalInfo} onChange={setAdditionalInfo} placeholder="Materials, care, specs…" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-tags">Tags <span className="text-muted-foreground">(comma separated)</span></Label>
                <Input id="p-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="serum, vegan, cruelty-free" />
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
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:max-w-40">
                <Label htmlFor="p-stock">Quantity</Label>
                <Input id="p-stock" type="number" min={0} value={hasVariants ? '0' : stock} onChange={(e) => setStock(e.target.value)} disabled={hasVariants} />
                {hasVariants && <p className="text-xs text-muted-foreground">Managed per variant — set stock on each variant below.</p>}
              </div>
              <div className="flex flex-col gap-2 sm:max-w-sm">
                <Label htmlFor="p-threshold">Low stock alert threshold</Label>
                <Input
                  id="p-threshold"
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground">
                  Triggers admin badge warnings and automated email alerts when available inventory drops to or below this level. Default is 5.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Variants</CardTitle></CardHeader>
            <CardContent>
              {mode === 'edit' && product ? (
                <VariantsManager product={product} />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">Add Variants (Sizes, Colors, SKUs)</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md leading-relaxed">
                    First fill in the product name and basic details, then click <strong>"Save &amp; Add Variants"</strong> to save the product and open the variant drawer.
                  </p>
                  <Button type="submit" size="sm" className="mt-4" disabled={pending}>
                    {pending ? 'Saving…' : 'Save & Add Variants'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Fulfillment Method</span>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded',
                    fulfillmentMethod === 'automatic'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                  )}
                >
                  {fulfillmentMethod}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Control how orders containing this item transition from Paid to Fulfilled.
              </p>
              <div className="grid gap-2">
                <label
                  onClick={() => setFulfillmentMethod('automatic')}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left',
                    fulfillmentMethod === 'automatic'
                      ? 'border-[#187b7b] bg-[#187b7b]/5'
                      : 'border-muted hover:border-foreground/20',
                  )}
                >
                  <input
                    type="radio"
                    name="fulfillmentMethod"
                    value="automatic"
                    checked={fulfillmentMethod === 'automatic'}
                    onChange={() => setFulfillmentMethod('automatic')}
                    className="mt-0.5 text-[#187b7b] focus:ring-[#187b7b]"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Automatic (Recommended)</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Checks stock upon payment. If inventory is confirmed, order automatically moves to <strong>Fulfilled</strong> (Packed/Ready).
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setFulfillmentMethod('manual')}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left',
                    fulfillmentMethod === 'manual'
                      ? 'border-[#187b7b] bg-[#187b7b]/5'
                      : 'border-muted hover:border-foreground/20',
                  )}
                >
                  <input
                    type="radio"
                    name="fulfillmentMethod"
                    value="manual"
                    checked={fulfillmentMethod === 'manual'}
                    onChange={() => setFulfillmentMethod('manual')}
                    className="mt-0.5 text-[#187b7b] focus:ring-[#187b7b]"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Manual</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Order remains in <strong>Paid / Processing</strong>. Staff must manually inspect and click <em>Fulfil</em>.
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                <Checkbox checked={active} onCheckedChange={setActive} className="rounded-sm" />
                <span>Active <span className="text-muted-foreground">(visible in the store)</span></span>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
