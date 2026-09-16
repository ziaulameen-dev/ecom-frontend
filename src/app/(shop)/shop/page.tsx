'use client';

import * as Sheet from '@radix-ui/react-dialog';
import { Check, ChevronDown, SlidersHorizontal, Star, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ValueProps } from '@/components/value-props';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

function ShopSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-64 shrink-0 lg:block space-y-6">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-28 w-full" />
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[3/4] w-full rounded-none" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopInner() {
  const router = useRouter();
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
  const [userCats, setUserCats] = useState<Set<string> | null>(null);
  const [ratings, setRatings] = useState<Set<number>>(new Set());
  const [promos, setPromos] = useState<Set<PromoKey>>(new Set());
  const [avail, setAvail] = useState<Set<'in' | 'out'>>(new Set());
  const [price, setPrice] = useState<[number, number] | null>(null);
  const [sort, setSort] = useState<Sort>('featured');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [priceSeeded, setPriceSeeded] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [sidebarMaxHeight, setSidebarMaxHeight] = useState<string>('calc(100vh - 17rem)');

  useEffect(() => {
    setMounted(true);
    function updateHeight() {
      const asideEl = document.getElementById('shop-filter-aside');
      if (!asideEl) return;
      const rect = asideEl.getBoundingClientRect();
      const available = window.innerHeight - Math.max(rect.top, 96) - 20;
      setSidebarMaxHeight(`${Math.max(available, 280)}px`);
    }

    updateHeight();
    window.addEventListener('scroll', updateHeight, { passive: true });
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('scroll', updateHeight);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Active category IDs derived from user selection or URL category query param
  const cats = useMemo(() => {
    if (userCats !== null) return userCats;
    if (!categorySlug) return new Set<string>();
    const slugs = categorySlug.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const matches = flatCats.filter(
      (c) => slugs.includes(c.slug.toLowerCase()) || slugs.includes(c.name.toLowerCase()),
    );
    return new Set(matches.map((c) => c.id));
  }, [userCats, categorySlug, flatCats]);

  // Price bounds (rupees) derived from all products
  const bounds = useMemo<[number, number] | null>(() => {
    if (!products?.length) return null;
    const rs = products.map((p) => (p.offerPriceMinor ?? p.priceMinor) / 100);
    return [Math.floor(Math.min(...rs)), Math.ceil(Math.max(...rs))];
  }, [products]);

  // Seed filter state from URL search params on mount
  useEffect(() => {
    if (!tree) return;

    // Categories
    const catParam = sp.get('category');
    if (catParam) {
      const slugs = catParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const matchedIds = flatCats
        .filter((c) => slugs.includes(c.slug.toLowerCase()) || slugs.includes(c.name.toLowerCase()))
        .map((c) => c.id);
      setUserCats(new Set(matchedIds));
    } else if (userCats === null) {
      setUserCats(new Set());
    }

    // Ratings
    const ratingParam = sp.get('rating');
    if (ratingParam) {
      const rs = ratingParam.split(',').map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 5);
      if (rs.length) setRatings(new Set(rs));
    }

    // Promos
    const promoParam = sp.get('promo');
    if (promoParam) {
      const ps = promoParam.split(',').map((p) => p.trim()) as PromoKey[];
      const valid = ps.filter((p) => ['new', 'best', 'sale'].includes(p));
      if (valid.length) setPromos(new Set(valid));
    }

    // Avail
    const availParam = sp.get('avail');
    if (availParam) {
      const avs = availParam.split(',').map((a) => a.trim()) as ('in' | 'out')[];
      const valid = avs.filter((a) => a === 'in' || a === 'out');
      if (valid.length) setAvail(new Set(valid));
    }

    // Sort
    const sortParam = sp.get('sort') as Sort;
    if (sortParam && SORTS.includes(sortParam)) {
      setSort(sortParam);
    }
  }, [tree]);

  // Seed price once bounds are loaded
  useEffect(() => {
    if (!bounds || priceSeeded) return;
    const minP = sp.get('minPrice');
    const maxP = sp.get('maxPrice');
    if (minP && maxP && !isNaN(Number(minP)) && !isNaN(Number(maxP))) {
      setPrice([Math.max(bounds[0], Number(minP)), Math.min(bounds[1], Number(maxP))]);
    } else {
      setPrice(bounds);
    }
    setPriceSeeded(true);
  }, [bounds, priceSeeded, sp]);

  const priceActive = !!(price && bounds && (price[0] > bounds[0] || price[1] < bounds[1]));

  // Sync state changes to URL query parameters
  const updateUrl = useCallback(
    (newFilters: {
      cats?: Set<string>;
      price?: [number, number] | null;
      ratings?: Set<number>;
      promos?: Set<PromoKey>;
      avail?: Set<'in' | 'out'>;
      sort?: Sort;
    }) => {
      const p = new URLSearchParams(window.location.search);

      // Category
      const targetCats = newFilters.cats !== undefined ? newFilters.cats : cats;
      const slugs = [...targetCats]
        .map((id) => flatCats.find((c) => c.id === id)?.slug)
        .filter(Boolean) as string[];
      if (slugs.length) p.set('category', slugs.join(','));
      else p.delete('category');

      // Price
      const targetPrice = newFilters.price !== undefined ? newFilters.price : price;
      if (targetPrice && bounds && (targetPrice[0] > bounds[0] || targetPrice[1] < bounds[1])) {
        p.set('minPrice', String(targetPrice[0]));
        p.set('maxPrice', String(targetPrice[1]));
      } else {
        p.delete('minPrice');
        p.delete('maxPrice');
      }

      // Ratings
      const targetRatings = newFilters.ratings !== undefined ? newFilters.ratings : ratings;
      if (targetRatings.size) p.set('rating', [...targetRatings].sort((a, b) => b - a).join(','));
      else p.delete('rating');

      // Promos
      const targetPromos = newFilters.promos !== undefined ? newFilters.promos : promos;
      if (targetPromos.size) p.set('promo', [...targetPromos].join(','));
      else p.delete('promo');

      // Avail
      const targetAvail = newFilters.avail !== undefined ? newFilters.avail : avail;
      if (targetAvail.size) p.set('avail', [...targetAvail].join(','));
      else p.delete('avail');

      // Sort
      const targetSort = newFilters.sort !== undefined ? newFilters.sort : sort;
      if (targetSort && targetSort !== 'featured') p.set('sort', targetSort);
      else p.delete('sort');

      const qs = p.toString();
      const newUrl = qs ? `/shop?${qs}` : '/shop';
      router.replace(newUrl, { scroll: false });
    },
    [router, cats, flatCats, price, bounds, ratings, promos, avail, sort],
  );

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
  const toggleCat = (id: string) => {
    const next = new Set(cats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setUserCats(next);
    updateUrl({ cats: next });
  };

  const handlePriceChange = (v: [number, number]) => {
    setPrice(v);
    updateUrl({ price: v });
  };
  const toggleRating = (r: number) => {
    const next = new Set(ratings);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    setRatings(next);
    updateUrl({ ratings: next });
  };
  const togglePromo = (k: PromoKey) => {
    const next = new Set(promos);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setPromos(next);
    updateUrl({ promos: next });
  };
  const toggleAvail = (a: 'in' | 'out') => {
    const next = new Set(avail);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    setAvail(next);
    updateUrl({ avail: next });
  };
  const handleSortChange = (s: Sort) => {
    setSort(s);
    updateUrl({ sort: s });
  };
  const clearAll = () => {
    setUserCats(new Set());
    setRatings(new Set());
    setPromos(new Set());
    setAvail(new Set());
    if (bounds) setPrice(bounds);
    updateUrl({
      cats: new Set(),
      price: bounds,
      ratings: new Set(),
      promos: new Set(),
      avail: new Set(),
    });
  };

  const clearCategoryGroup = (idsToClear: string[]) => {
    const next = new Set(cats);
    for (const id of idsToClear) next.delete(id);
    setUserCats(next);
    updateUrl({ cats: next });
  };

  interface CategoryChipItem {
    key: string;
    label: string;
    clearIds: string[];
  }

  const categoryChips = useMemo<CategoryChipItem[]>(() => {
    if (!tree || cats.size === 0) return [];
    const chips: CategoryChipItem[] = [];

    for (const top of tree) {
      const isParentSelected = cats.has(top.id);
      const selectedChildren = top.children.filter((c) => cats.has(c.id));
      const allSelectedIds = [
        ...(isParentSelected ? [top.id] : []),
        ...selectedChildren.map((c) => c.id),
      ];

      if (allSelectedIds.length > 0) {
        let label = top.name;
        if (selectedChildren.length > 1) {
          // Multiple subcategories: e.g. "Perfume: Men, Women"
          label = `${top.name}: ${selectedChildren.map((c) => c.name).join(', ')}`;
        } else if (selectedChildren.length === 1) {
          // Single subcategory: e.g. "Perfume: Men"
          label = `${top.name}: ${selectedChildren[0].name}`;
        } else {
          // Only top parent selected
          label = top.name;
        }

        chips.push({
          key: top.id,
          label,
          clearIds: allSelectedIds,
        });
      }
    }

    return chips;
  }, [tree, cats]);

  const activeCount = categoryChips.length + ratings.size + promos.size + avail.size + (priceActive ? 1 : 0);
  const selectedNames = useMemo(() => {
    return new Set(
      [...cats].map((id) => flatCats.find((c) => c.id === id)?.name).filter(Boolean),
    );
  }, [cats, flatCats]);

  const title = useMemo(() => {
    if (search) return `Results for “${search}”`;
    if (cats.size > 0 && selectedNames.size === 1) {
      return [...selectedNames][0] as string;
    }
    return 'All products';
  }, [search, cats.size, selectedNames]);

  if (!mounted) {
    return <ShopSkeleton />;
  }

  const sharedFilterProps = {
    flatCats,
    cats, onToggleCat: toggleCat,
    bounds, price, onPrice: handlePriceChange,
    ratings, onToggleRating: toggleRating,
    promos, onTogglePromo: togglePromo,
    avail, onToggleAvail: toggleAvail,
  };
  const filters = <ShopFilters {...sharedFilterProps} />;
  const mobileFilters = <ShopFilters {...sharedFilterProps} hideTitle />;

  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {categoryChips.map((chip) => (
            <Chip key={chip.key} onClear={() => clearCategoryGroup(chip.clearIds)}>
              {chip.label}
            </Chip>
          ))}
          {priceActive && price && (
            <Chip onClear={() => bounds && handlePriceChange(bounds)}>₹{price[0]} – ₹{price[1]}</Chip>
          )}
          {[...ratings].sort((a, b) => b - a).map((r) => (
            <Chip key={r} onClear={() => toggleRating(r)}>{r}★ &amp; up</Chip>
          ))}
          {[...promos].map((k) => (
            <Chip key={k} onClear={() => togglePromo(k)}>{PROMOS.find((p) => p.key === k)?.label}</Chip>
          ))}
          {[...avail].map((k) => (
            <Chip key={k} onClear={() => toggleAvail(k)}>{AVAIL.find((a) => a.key === k)?.label}</Chip>
          ))}
          <button onClick={clearAll} className="text-xs font-medium text-primary-button hover:underline">Clear all</button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* Desktop sidebar — sticky with dynamic viewport bounds */}
        <aside
          id="shop-filter-aside"
          style={{ maxHeight: sidebarMaxHeight }}
          className="hidden w-64 shrink-0 lg:block lg:self-start lg:sticky lg:top-[96px] lg:overflow-y-auto lg:overscroll-contain pr-3 scrollbar-thin"
        >
          {filters}
        </aside>

        {/* Product Grid — flows naturally with normal full-page scrolling */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="hidden text-sm font-medium text-muted-foreground sm:block">
              {isLoading
                ? 'Loading…'
                : items.length === 0
                ? '0 products'
                : `${items.length} ${items.length === 1 ? 'product' : 'products'}`}
            </p>
            <div className="flex items-center gap-2 max-sm:ml-auto">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <SlidersHorizontal className="size-4" /> Filters{activeCount ? ` (${activeCount})` : ''}
              </Button>
              <label htmlFor="sort" className="hidden text-sm text-muted-foreground sm:inline">Sort by:</label>
              <Select value={sort} onValueChange={(v) => handleSortChange(v as Sort)}>
                <SelectTrigger id="sort" className="h-9 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <ProductGrid
              items={items}
              loading={isLoading}
              skeletonCount={9}
              hasFiltersActive={activeCount > 0}
              onClearFilters={clearAll}
            />
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
            <div className="-mx-1 flex-1 overflow-y-auto px-1">{mobileFilters}</div>
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
  hideTitle,
}: {
  flatCats: FlatCat[];
  cats: Set<string>; onToggleCat: (id: string) => void;
  bounds: [number, number] | null; price: [number, number] | null; onPrice: (v: [number, number]) => void;
  ratings: Set<number>; onToggleRating: (r: number) => void;
  promos: Set<PromoKey>; onTogglePromo: (k: PromoKey) => void;
  avail: Set<'in' | 'out'>; onToggleAvail: (k: 'in' | 'out') => void;
  hideTitle?: boolean;
}) {
  return (
    <div className="space-y-2.5 pb-6">
      {!hideTitle && (
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Filter Options</div>
      )}
      {flatCats.length > 0 && (
        <Section title="By Categories" defaultOpen>
          {flatCats.map((c) => (
            <CheckRow key={c.id} checked={cats.has(c.id)} onToggle={() => onToggleCat(c.id)} indent={c.child}>
              {c.name}
            </CheckRow>
          ))}
        </Section>
      )}

      {bounds && price && (
        <Section title="Price" defaultOpen>
          <RangeSlider min={bounds[0]} max={bounds[1]} value={price} onChange={onPrice} />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>₹{price[0]}</span><span>₹{price[1]}</span>
          </div>
        </Section>
      )}

      <Section title="Availability" defaultOpen>
        {AVAIL.map((a) => (
          <CheckRow key={a.key} checked={avail.has(a.key)} onToggle={() => onToggleAvail(a.key)}>{a.label}</CheckRow>
        ))}
      </Section>

      <Section title="By Promotions" defaultOpen>
        {PROMOS.map((p) => (
          <CheckRow key={p.key} checked={promos.has(p.key)} onToggle={() => onTogglePromo(p.key)}>{p.label}</CheckRow>
        ))}
      </Section>

      <Section title="Review" defaultOpen>
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
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b pb-2.5">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-0.5 text-xs sm:text-sm font-bold">
        {title}
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="mt-2 space-y-1.5">{children}</div>}
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
      className={cn('flex w-full items-center gap-2 py-0.5 text-left text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground', indent && 'pl-3')}
    >
      <span className={cn('grid size-3.5 shrink-0 place-items-center rounded-[3px] border transition-colors', checked ? 'border-primary-button bg-primary-button text-white' : 'border-input')}>
        {checked && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      <span className={cn('flex-1 truncate', checked && 'font-medium text-foreground')}>{children}</span>
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
    <Suspense fallback={<ShopSkeleton />}>
      <ShopInner />
    </Suspense>
  );
}
