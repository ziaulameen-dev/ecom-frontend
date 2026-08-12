'use client';

import {
  Check, Link2, Minus, Plus, ShieldCheck, ShoppingBag, Truck,
} from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RichText, fillTemplate } from '@/components/rich-text';
import { ValueProps } from '@/components/value-props';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct } from '@/features/catalog';
import { ReviewsSection } from '@/features/catalog/components/reviews-section';
import {
  VariantPicker,
  useVariantSelection,
} from '@/features/catalog/components/variant-picker';
import { useAddToCart } from '@/features/cart';
import type { ProductDetail } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const { data: product, isLoading, isError } = useProduct(params.slug);

  if (isLoading) return <ProductSkeleton />;
  if (isError || !product) {
    return <div className="mx-auto max-w-7xl px-4 py-24 text-center text-muted-foreground">Product not found.</div>;
  }
  return <ProductDetailView product={product} />;
}

function ProductDetailView({ product }: { product: NonNullable<ReturnType<typeof useProduct>['data']> }) {
  const add = useAddToCart();
  const { groups, selection, setSelection, active } = useVariantSelection(product.variants);
  const [qty, setQty] = useState(1);

  const priceMinor = product.hasVariants ? active?.priceMinor ?? product.priceFromMinor : product.basePriceMinor;
  const offerMinor = product.hasVariants ? active?.offerPriceMinor ?? null : product.offerPriceMinor;
  const stock = product.hasVariants ? active?.stock ?? 0 : product.baseStock;
  const images = useMemo(() => {
    // Variant images first, then the product's common media images.
    const variantImgs = product.hasVariants && active?.images.length ? active.images : [];
    const commonImgs = product.media.filter((m) => m.type === 'image').map((m) => m.url);
    return [...variantImgs, ...commonImgs].filter(Boolean) as string[];
  }, [product, active]);
  const [mainIdx, setMainIdx] = useState(0);
  useEffect(() => setMainIdx(0), [active?.id]);

  // Template variables from the selected variant: {color}, {size}, … keyed by
  // both the type name and slug, so the description can reference either.
  const vars = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of active?.options ?? []) {
      m[o.type.toLowerCase()] = o.value;
      m[o.slug.toLowerCase()] = o.value;
    }
    return m;
  }, [active]);

  const needsSelection = product.hasVariants && !active;
  const canBuy = stock > 0 && !needsSelection;

  async function onAdd() {
    try {
      await add.mutateAsync({
        productId: product.id,
        variantId: active?.id ?? null,
        quantity: qty,
      });
      toast.success('Added to cart');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
            {images[mainIdx] ? (
              <Image src={mediaSrc(images[mainIdx])} alt={product.name} fill className="object-cover" sizes="(min-width:768px) 50vw, 100vw" priority />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground"><ShoppingBag className="size-10" /></div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setMainIdx(i)}
                  className={`relative size-16 overflow-hidden rounded-lg border-2 ${i === mainIdx ? 'border-primary' : 'border-transparent'}`}
                >
                  <Image src={mediaSrc(src)} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="mt-3 flex items-baseline gap-2">
            {offerMinor != null ? (
              <>
                <span className="text-2xl font-semibold">{money(offerMinor, product.currency)}</span>
                <span className="text-lg text-muted-foreground line-through">{money(priceMinor, product.currency)}</span>
              </>
            ) : (
              <span className="text-2xl font-semibold">{money(priceMinor, product.currency)}</span>
            )}
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{fillTemplate(product.shortDescription, vars)}</p>
          )}

          {groups.length > 0 && (
            <div className="mt-6">
              <VariantPicker groups={groups} selection={selection} onChange={setSelection} />
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-md border">
              <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus /></Button>
              <span className="w-10 text-center tabular-nums">{qty}</span>
              <Button variant="ghost" size="icon" disabled={qty >= stock} onClick={() => setQty((q) => q + 1)}><Plus /></Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {needsSelection ? 'Select options' : stock > 0 ? `${stock} in stock` : 'Out of stock'}
            </span>
          </div>

          <Button className="mt-6 w-full" size="lg" disabled={!canBuy || add.isPending} onClick={onAdd}>
            <ShoppingBag /> {add.isPending ? 'Adding…' : 'Add to cart'}
          </Button>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg border p-3"><Truck className="size-4 text-brand" /> Fast delivery</div>
            <div className="flex items-center gap-2 rounded-lg border p-3"><ShieldCheck className="size-4 text-brand" /> Secure checkout</div>
          </div>

          {/* SKU · Tags · Share */}
          <div className="mt-6 space-y-3 border-t pt-4 text-sm">
            {active?.sku && (
              <div><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{active.sku}</span></div>
            )}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">Tags:</span>
                {product.tags.map((t) => (
                  <span key={t} className="rounded-full border px-2 py-0.5 text-xs">{t}</span>
                ))}
              </div>
            )}
            <ShareRow name={product.name} />
          </div>
        </div>
      </div>

      <ProductTabs product={product} vars={vars} />

      <ValueProps className="mt-16" />
    </div>
  );
}

type TabKey = 'description' | 'additional' | 'reviews';

function ProductTabs({ product, vars }: { product: ProductDetail; vars: Record<string, string> }) {
  const tabs = [
    product.description ? { key: 'description' as TabKey, label: 'Description' } : null,
    product.additionalInfo ? { key: 'additional' as TabKey, label: 'Additional Information' } : null,
    { key: 'reviews' as TabKey, label: 'Review' },
  ].filter(Boolean) as { key: TabKey; label: string }[];

  // Review is selected first by default.
  const [tab, setTab] = useState<TabKey>('reviews');

  return (
    <div className="mt-14">
      <div className="flex flex-wrap gap-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'relative -mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary-button text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'description' && <RichText html={product.description} vars={vars} className="max-w-3xl text-foreground/90" />}
        {tab === 'additional' && <RichText html={product.additionalInfo} vars={vars} className="max-w-3xl text-foreground/90" />}
        {tab === 'reviews' && <ReviewsSection productId={product.id} />}
      </div>
    </div>
  );
}

function ShareRow({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const enc = encodeURIComponent(url);
  const text = encodeURIComponent(name);
  const box = 'grid size-8 place-items-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">Share:</span>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook" className={box}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M13.5 22v-8h2.7l.4-3h-3.1V9c0-.9.3-1.5 1.6-1.5H17V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v8h3z" /></svg>
      </a>
      <a href={`https://twitter.com/intent/tweet?url=${enc}&text=${text}`} target="_blank" rel="noreferrer" aria-label="Share on X" className={box}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5"><path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5.3-6.9L4.8 22H2l7.8-8.9L1.3 2h6.9l4.8 6.4L18.9 2Zm-2.4 18h1.9L7.6 4H5.6l10.9 16Z" /></svg>
      </a>
      <button
        type="button"
        aria-label="Copy link"
        onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className={box}
      >
        {copied ? <Check className="size-4 text-brand" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 md:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
