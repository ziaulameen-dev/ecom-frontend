'use client';

import { ChevronDown, Heart, Search, ShoppingBag, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCart, useCartSync } from '@/features/cart';
import { useAuthModal, useMe } from '@/features/auth';
import { useCategoryTree } from '@/features/catalog';
import { useWishlist, useWishlistSync } from '@/features/wishlist';
import { SbazwideLogo } from '@/components/brand/sbazwide-logo';
import { SearchAutocomplete } from './search-autocomplete';
import { STORE_NAME } from '@/lib/config';
import { cn } from '@/lib/utils';

// `false` on the server + first client render, `true` after hydration — lets us
// show localStorage-backed counts without a hydration mismatch.
const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

const pill =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-900 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-neutral-900 dark:text-neutral-100 transition-colors hover:border-foreground/60 hover:text-foreground hover:bg-neutral-200/80 dark:hover:bg-neutral-800';
// Second-layer links: plain text, no pill.
const navText =
  'inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest text-neutral-800 dark:text-neutral-200 transition-colors hover:text-foreground';

export function SiteHeader() {
  const { data: cart } = useCart();
  const { data: me } = useMe();
  const { data: tree } = useCategoryTree();
  const openLogin = useAuthModal((s) => s.openLogin);
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const count = cart?.itemCount ?? 0;
  const wishCount = useWishlist((s) => s.ids.length);
  const mounted = useMounted();
  const tops = tree ?? [];
  useWishlistSync(); // sync the wishlist with the server for logged-in users
  useCartSync(); // sync the cart with the server for logged-in users and on token refresh

  // Close search suggestions on route/navigation changes
  useEffect(() => {
    setDesktopSearchOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Robust click-outside detection active whenever search is open
  useEffect(() => {
    if (!desktopSearchOpen && !searchOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent | PointerEvent) {
      const target = e.target as Node;
      const clickedDesktop = desktopSearchRef.current?.contains(target);
      const clickedMobile = mobileSearchRef.current?.contains(target);

      if (!clickedDesktop && !clickedMobile) {
        setDesktopSearchOpen(false);
        setSearchOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDesktopSearchOpen(false);
        setSearchOpen(false);
      }
    }

    window.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopSearchOpen, searchOpen]);

  // Cross-category groups for the second-layer pills: the distinct subcategory
  // names (e.g. Men / Women / Unisex). Fully dynamic — new subcategories added
  // in the admin panel appear here automatically. Clicking one selects every
  // category with that name on the shop page.
  const groupNames: string[] = [];
  const seenGroups = new Set<string>();
  for (const top of tops) {
    for (const child of top.children ?? []) {
      if (!seenGroups.has(child.name)) { seenGroups.add(child.name); groupNames.push(child.name); }
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    setDesktopSearchOpen(false);
    router.push(q.trim() ? `/shop?search=${encodeURIComponent(q.trim())}` : '/shop');
  }

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      {/* Row 1 — search · brand · profile/wishlist/cart (borderless) */}
      <div className="mx-auto grid h-12 max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 lg:px-8">
        {/* Desktop: inline search field (col 1) with live autocomplete */}
        <div ref={desktopSearchRef} className="relative col-start-1 hidden w-56 lg:w-72 justify-self-start sm:block z-40">
          <form onSubmit={search} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-600 dark:text-neutral-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setDesktopSearchOpen(true);
              }}
              onFocus={() => setDesktopSearchOpen(true)}
              onBlur={(e) => {
                // If focus moved outside the entire search container, close with a slight delay
                // so that click events on dropdown suggestions fire first.
                if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.relatedTarget as Node)) {
                  setTimeout(() => setDesktopSearchOpen(false), 200);
                }
              }}
              onKeyDown={(e) => e.key === 'Escape' && setDesktopSearchOpen(false)}
              placeholder="Search…"
              aria-label="Search products"
              className="h-8 w-full rounded-sm border border-neutral-300 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/80 pl-8 pr-3 text-[11px] font-medium uppercase tracking-widest text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
            />
          </form>

          {/* Desktop Search Suggestions Dropdown */}
          <SearchAutocomplete
            query={q}
            isOpen={desktopSearchOpen}
            onClose={() => setDesktopSearchOpen(false)}
            onSelectQuery={(kw) => {
              setQ(kw);
              setDesktopSearchOpen(false);
              router.push(`/shop?search=${encodeURIComponent(kw)}`);
            }}
          />
        </div>

        <Link
          href="/"
          aria-label={STORE_NAME}
          className="group col-start-1 justify-self-start flex items-center sm:col-start-2 sm:justify-self-center md:absolute md:left-1/2 md:top-1/2 md:z-10 md:-translate-x-1/2 md:-translate-y-1/2"
        >
          <SbazwideLogo className="h-8 sm:h-9 md:h-10 w-auto text-neutral-900 dark:text-neutral-100" />
        </Link>

        <div className="col-start-3 flex items-center justify-end">
          {/* Mobile: search icon lives on the right, next to the other actions */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="size-9 rounded-full text-neutral-800 dark:text-neutral-200 sm:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search />
          </Button>
          <Link href="/account" aria-label="Account">
            <Button variant="ghost" size="icon" className="size-9 rounded-full text-neutral-800 dark:text-neutral-200"><User /></Button>
          </Link>
          <Link href="/wishlist" aria-label="Wishlist" className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon" className="size-9 rounded-full text-neutral-800 dark:text-neutral-200">
              <span className="relative inline-flex">
                <Heart />
                {mounted && wishCount > 0 && (
                  <Badge
                    variant="primary"
                    className="absolute -right-2.5 -top-2 z-10 h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums pointer-events-none"
                  >
                    {wishCount}
                  </Badge>
                )}
              </span>
            </Button>
          </Link>
          <Link href="/cart" aria-label="Cart">
            <Button variant="ghost" size="icon" className="size-9 rounded-full text-neutral-800 dark:text-neutral-200">
              <span className="relative inline-flex">
                <ShoppingBag />
                {count > 0 && (
                  <Badge
                    variant="primary"
                    className="absolute -right-2.5 -top-2 z-10 h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums pointer-events-none"
                  >
                    {count}
                  </Badge>
                )}
              </span>
            </Button>
          </Link>
          {me?.roles?.includes('admin') && (
            <Link href="/admin" className={cn(pill, 'ml-1 hidden md:inline-flex')}>Admin</Link>
          )}
          {!me && (
            <button type="button" onClick={() => openLogin()} className={cn(pill, 'ml-1 hidden lg:inline-flex')}>
              Login
            </button>
          )}
        </div>
      </div>

      {/* Row 2 — one scrollable strip on mobile; two clusters on desktop.
          Bottom border lives here (max-w-[1500px]) so it aligns with the content,
          not the full-width header. */}
      <div className="mx-auto flex max-w-[1500px] items-center justify-between overflow-x-auto border-b pb-2.5 px-3 sm:px-6 lg:px-8 md:overflow-x-visible">
        <div className="flex shrink-0 items-center gap-5">
          <DropdownMenu>
            <DropdownMenuTrigger className={navText}>
              Categories <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild><Link href="/shop">All products</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/shop?sort=new">New arrivals</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/shop?sort=best">Best selling</Link></DropdownMenuItem>
              {tops.length > 0 && <DropdownMenuSeparator />}
              {tops.map((c) => (
                <DropdownMenuItem key={c.id} asChild>
                  <Link href={`/shop?category=${c.slug}`}>{c.name}</Link>
                </DropdownMenuItem>
              ))}
              {groupNames.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {groupNames.map((name) => (
                    <DropdownMenuItem key={name} asChild>
                      <Link href={`/shop?category=${encodeURIComponent(name)}`}>{name}</Link>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Near Category: Men and Women on Desktop */}
          {groupNames.map((name) => (
            <Link
              key={name}
              href={`/shop?category=${encodeURIComponent(name)}`}
              className={cn(navText, 'hidden md:inline-flex')}
            >
              {name}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-5">
          {tops.slice(0, 4).map((c) => (
            <Link key={c.id} href={`/shop?category=${c.slug}`} className={navText}>{c.name}</Link>
          ))}
        </div>
      </div>

      {/* Mobile Search Dropdown Card (spans width with margins, floating right beneath the header) */}
      {searchOpen && (
        <div
          ref={mobileSearchRef}
          className="absolute inset-x-3 top-12 z-50 sm:hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <form onSubmit={search} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-600 dark:text-neutral-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              aria-label="Search products"
              className="h-8 w-full rounded-sm border border-neutral-300 dark:border-neutral-700 bg-background shadow-md pl-8 pr-3 text-[11px] font-medium uppercase tracking-widest text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
            />
          </form>

          {/* Mobile suggestions dropdown — attaches right beneath the input */}
          <SearchAutocomplete
            query={q}
            isOpen={true}
            isMobile={true}
            onClose={() => setSearchOpen(false)}
            onSelectQuery={(kw) => {
              setQ(kw);
              setSearchOpen(false);
              router.push(`/shop?search=${encodeURIComponent(kw)}`);
            }}
          />
        </div>
      )}
    </header>
  );
}
