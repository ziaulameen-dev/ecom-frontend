'use client';

import * as Sheet from '@radix-ui/react-dialog';
import { Check, ChevronDown, SlidersHorizontal, Star, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { ValueProps } from '@/components/value-props';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoryTree, useProducts } from '@/features/catalog';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import type { CategoryNode } from '@/lib/types';
import { cn } from '@/lib/utils';

type Sort = 'featured' | 'new' | 'best' | 'price-asc' | 'price-desc';
const SORTS: Sort[] = ['featured', 'new', 'best', 'price-asc', 'price-desc'];
const SORT_LABELS: Record<Sort, string> = {
  featured: 'Featured', new: 'New arrivals', best: 'Best selling',
  'price-asc': 'Price: low to high', 'price-desc': 'Price: high to low',
};

type PromoKey = 'new' | 'best' | 'sale';
const PROMOS: { key: PromoKey; label: string }[] = [
  { key: 'new', label: 'New Arrivals' },
  { key: 'best', label: 'Best Sellers' },
  { key: 'sale', label: 'On Sale' },
];
const AVAIL: { key: 'in' | 'out'; label: string }[] = [
  { key: 'in', label: 'In Stock' },
  { key: 'out', label: 'Out of Stock' },
];
const NEW_WINDOW_MS = 30 * 24 * 3600 * 1000;

interface FlatCat { id: string; name: string; slug: string; child: boolean; label: string }

function flattenCats(tree: CategoryNode[] | undefined): FlatCat[] {
  const out: FlatCat[] = [];
  for (const top of tree ?? []) {
    out.push({ id: top.id, name: top.name, slug: top.slug, child: false, label: top.name });
    // Prefix children with their parent so duplicate names (e.g. "Men" under
    // both Watches and Perfumes) stay distinct: "Watches: Men".
    for (const c of top.children) {
      out.push({ id: c.id, name: c.name, slug: c.slug, child: true, label: `${top.name}: ${c.name}` });
    }
  }
  return out;
}

function ShopInner() {
  const sp = useSearchParams();
  const categorySlug = sp.get('category');
  const search = sp.get('search') ?? '';

  const { data: tree } = useCategoryTree();
  const { data: products, isLoading } = useProducts({ search, limit: 200 });

  const flatCats = useMemo(() => flattenCats(tree), [tree]);
  const childrenMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const top of tree ?? []) m.set(top.id, top.children.map((c) => c.id));
    return m;
  }, [tree]);

  // ---- Filter state ----
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Set<number>>(new Set());
  const [promos, setPromos] = useState<Set<PromoKey>>(new Set());
  const [avail, setAvail] = useState<Set<'in' | 'out'>>(new Set());
  const [price, setPrice] = useState<[number, number] | null>(null);

  const [sort, setSort] = useState<Sort>('featured');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Follow the URL: seed category from ?category, sort from ?sort (render-time sync).
  const [lastSlug, setLastSlug] = useState<string | null | undefined>(undefined);
  if (tree && categorySlug !== lastSlug) {
    setLastSlug(categorySlug);
    if (!categorySlug) {
      setCats(new Set());
    } else {
      // Prefer an exact slug match; otherwise treat the slug as a group name
      // (e.g. "men" → every category named "Men": watches-men, perfumes-men).
      const exact = flatCats.find((c) => c.slug === categorySlug);
      const matches = exact
        ? [exact]
        : flatCats.filter((c) => c.name.toLowerCase() === categorySlug.toLowerCase());
      setCats(new Set(matches.map((c) => c.id)));
    }
  }
  const urlSort = (SORTS as string[]).includes(sp.get('sort') ?? '') ? (sp.get('sort') as Sort) : null;
  const [lastUrlSort, setLastUrlSort] = useState(urlSort);
  if (urlSort && urlSort !== lastUrlSort) { setLastUrlSort(urlSort); setSort(urlSort); }

  // Price bounds (rupees) derived from all products; seed the range once known.
  const bounds = useMemo<[number, number] | null>(() => {
    if (!products?.length) return null;
    const rs = products.map((p) => (p.offerPriceMinor ?? p.priceMinor) / 100);
    return [Math.floor(Math.min(...rs)), Math.ceil(Math.max(...rs))];
  }, [products]);
  const [priceSeeded, setPriceSeeded] = useState(false);
  if (!priceSeeded && bounds) { setPrice(bounds); setPriceSeeded(true); }

  const priceActive = !!(price && bounds && (price[0] > bounds[0] || price[1] < bounds[1]));

  // ---- Apply filters + sort ----
  const items = useMemo(() => {
    let list = products ? [...products] : [];

    if (cats.size) {
      const expanded = new Set(cats);
      for (const id of cats) (childrenMap.get(id) ?? []).forEach((c) => expanded.add(c));
      list = list.filter((p) => p.categoryId && expanded.has(p.categoryId));
    }
    if (price) {
      list = list.filter((p) => {
        const r = (p.offerPriceMinor ?? p.priceMinor) / 100;
        return r >= price[0] && r <= price[1];
      });
    }
    if (ratings.size) {
      const minR = Math.min(...ratings);
      list = list.filter((p) => p.ratingAvg >= minR);
    }
    if (promos.size) {
      const now = Date.now();
      list = list.filter((p) =>
        (promos.has('new') && now - new Date(p.createdAt).getTime() <= NEW_WINDOW_MS) ||
        (promos.has('best') && p.soldCount > 0) ||
        (promos.has('sale') && p.offerPriceMinor != null),
      );
    }
    if (avail.size === 1) {
      const wantIn = avail.has('in');
      list = list.filter((p) => p.inStock === wantIn);
    }

    if (sort === 'price-asc') list.sort((a, b) => (a.offerPriceMinor ?? a.priceMinor) - (b.offerPriceMinor ?? b.priceMinor));
    if (sort === 'price-desc') list.sort((a, b) => (b.offerPriceMinor ?? b.priceMinor) - (a.offerPriceMinor ?? a.priceMinor));
    if (sort === 'new') list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === 'best') list.sort((a, b) => b.soldCount - a.soldCount);
    return list;
  }, [products, cats, childrenMap, price, ratings, promos, avail, sort]);

  // ---- Toggles ----
  const toggle = <T,>(set: Set<T>, val: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    apply(next);
  };
  const clearAll = () => {
    setCats(new Set()); setRatings(new Set()); setPromos(new Set()); setAvail(new Set());
    if (bounds) setPrice(bounds);
  };

  const activeCount = cats.size + ratings.size + promos.size + avail.size + (priceActive ? 1 : 0);
  const selectedNames = new Set(
    [...cats].map((id) => flatCats.find((c) => c.id === id)?.name).filter(Boolean),
  );
  const title = search
    ? `Results for “${search}”`
    : cats.size > 0 && selectedNames.size === 1
      ? (([...selectedNames][0] as string))
      : 'All products';

  const filters = (
    <ShopFilters
      flatCats={flatCats}
      cats={cats} onToggleCat={(id) => toggle(cats, id, setCats)}
      bounds={bounds} price={price} onPrice={setPrice}
      ratings={ratings} onToggleRating={(r) => toggle(ratings, r, setRatings)}
      promos={promos} onTogglePromo={(k) => toggle(promos, k, setPromos)}
      avail={avail} onToggleAvail={(k) => toggle(avail, k, setAvail)}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[...cats].map((id) => (
            <Chip key={id} onClear={() => toggle(cats, id, setCats)}>{flatCats.find((c) => c.id === id)?.label ?? 'Category'}</Chip>
          ))}
          {priceActive && price && (
            <Chip onClear={() => bounds && setPrice(bounds)}>₹{price[0]} – ₹{price[1]}</Chip>
          )}
          {[...ratings].sort((a, b) => b - a).map((r) => (
            <Chip key={r} onClear={() => toggle(ratings, r, setRatings)}>{r}★ &amp; up</Chip>
          ))}
          {[...promos].map((k) => (
            <Chip key={k} onClear={() => toggle(promos, k, setPromos)}>{PROMOS.find((p) => p.key === k)?.label}</Chip>
          ))}
          {[...avail].map((k) => (
            <Chip key={k} onClear={() => toggle(avail, k, setAvail)}>{AVAIL.find((a) => a.key === k)?.label}</Chip>
          ))}
          <button onClick={clearAll} className="text-xs font-medium text-primary-button hover:underline">Clear all</button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* Desktop sidebar — sticks in place while the grid scrolls */}
        <aside className="hidden w-64 shrink-0 lg:block lg:self-start lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          {filters}
        </aside>

        {/* Grid — scrolls independently of the sidebar on desktop */}
        <div className="min-w-0 flex-1 lg:sticky lg:top-20 lg:flex lg:h-[calc(100dvh-6rem)] lg:flex-col">
          <div className="mb-4 flex items-center justify-between gap-3 lg:shrink-0">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {isLoading ? 'Loading…' : `Showing ${items.length} of ${products?.length ?? 0} results`}
            </p>
            <div className="flex items-center gap-2 max-sm:ml-auto">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <SlidersHorizontal className="size-4" /> Filters{activeCount ? ` (${activeCount})` : ''}
              </Button>
              <label htmlFor="sort" className="hidden text-sm text-muted-foreground sm:inline">Sort by:</label>
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger id="sort" className="h-9 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            <ProductGrid items={items} loading={isLoading} skeletonCount={9} />
          </div>
        </div>
      </div>

      <ValueProps className="mt-12" />

      {/* Mobile filter — bottom sheet that slides up */}
      <Sheet.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Sheet.Portal>
          <Sheet.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Sheet.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t bg-background p-5 shadow-lg outline-none duration-300 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
            <Sheet.Title className="mb-2 shrink-0 text-lg font-semibold">Filter Options</Sheet.Title>
            <div className="-mx-1 flex-1 overflow-y-auto px-1">{filters}</div>
            <div className="mt-4 flex shrink-0 gap-2">
              <Button variant="outline" className="flex-1" onClick={clearAll}>Clear all</Button>
              <Button variant="primary" className="flex-1" onClick={() => setMobileOpen(false)}>Show {items.length} results</Button>
            </div>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet.Root>
    </div>
  );
}

function ShopFilters({
  flatCats, cats, onToggleCat,
  bounds, price, onPrice,
  ratings, onToggleRating,
  promos, onTogglePromo,
  avail, onToggleAvail,
}: {
  flatCats: FlatCat[];
  cats: Set<string>; onToggleCat: (id: string) => void;
  bounds: [number, number] | null; price: [number, number] | null; onPrice: (v: [number, number]) => void;
  ratings: Set<number>; onToggleRating: (r: number) => void;
  promos: Set<PromoKey>; onTogglePromo: (k: PromoKey) => void;
  avail: Set<'in' | 'out'>; onToggleAvail: (k: 'in' | 'out') => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filter Options</div>

      {flatCats.length > 0 && (
        <Section title="By Categories">
          {flatCats.map((c) => (
            <CheckRow key={c.id} checked={cats.has(c.id)} onToggle={() => onToggleCat(c.id)} indent={c.child}>
              {c.name}
            </CheckRow>
          ))}
        </Section>
      )}

      {bounds && price && (
        <Section title="Price">
          <RangeSlider min={bounds[0]} max={bounds[1]} value={price} onChange={onPrice} />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>₹{price[0]}</span><span>₹{price[1]}</span>
          </div>
        </Section>
      )}

      <Section title="Review">
        {[4, 3, 2, 1].map((r) => (
          <CheckRow key={r} checked={ratings.has(r)} onToggle={() => onToggleRating(r)}>
            <span className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('size-3.5', i < r ? 'fill-brand text-brand' : 'text-muted-foreground')} />
              ))}
              <span className="ml-1 text-xs">&amp; up</span>
            </span>
          </CheckRow>
        ))}
      </Section>

      <Section title="By Promotions">
        {PROMOS.map((p) => (
          <CheckRow key={p.key} checked={promos.has(p.key)} onToggle={() => onTogglePromo(p.key)}>{p.label}</CheckRow>
        ))}
      </Section>

      <Section title="Availability">
        {AVAIL.map((a) => (
          <CheckRow key={a.key} checked={avail.has(a.key)} onToggle={() => onToggleAvail(a.key)}>{a.label}</CheckRow>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b pb-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-1 text-sm font-semibold">
        {title}
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function CheckRow({
  checked, onToggle, indent, children,
}: { checked: boolean; onToggle: () => void; indent?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn('flex w-full items-center gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground', indent && 'pl-3')}
    >
      <span className={cn('grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors', checked ? 'border-primary-button bg-primary-button text-white' : 'border-input')}>
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className={cn('flex-1', checked && 'font-medium text-foreground')}>{children}</span>
    </button>
  );
}

function RangeSlider({
  min, max, value, onChange,
}: { min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void }) {
  const span = max - min || 1;
  const pct = (v: number) => ((v - min) / span) * 100;
  const [lo, hi] = value;
  return (
    <div className="range-slider relative h-5">
      <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-muted" />
      <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary-button" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      <input
        type="range" min={min} max={max} value={lo}
        onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
        className="absolute inset-0 h-5 w-full"
        aria-label="Minimum price"
      />
      <input
        type="range" min={min} max={max} value={hi}
        onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
        className="absolute inset-0 h-5 w-full"
        aria-label="Maximum price"
      />
    </div>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs">
      {children}
      <button onClick={onClear} aria-label="Remove filter" className="text-muted-foreground hover:text-foreground">
        <X className="size-3" />
      </button>
    </span>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Loading…</div>}>
      <ShopInner />
    </Suspense>
  );
}
