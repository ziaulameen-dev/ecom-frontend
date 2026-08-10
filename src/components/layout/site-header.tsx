'use client';

import { ChevronDown, Heart, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCart } from '@/features/cart';
import { useAuthModal, useMe } from '@/features/auth';
import { useCategoryTree } from '@/features/catalog';
import { useWishlist, useWishlistSync } from '@/features/wishlist';
import { STORE_NAME } from '@/lib/config';

// `false` on the server + first client render, `true` after hydration — lets us
// show localStorage-backed counts without a hydration mismatch.
const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

const pill =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground';
// Second-layer links: plain text, no pill.
const navText =
  'inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground';

// Extra category pills requested for the second layer (linked by slug; the shop
// falls back to "all products" until these categories exist in the catalog).
const STATIC_PILLS: [string, string][] = [
  ['Men', '/shop?category=men'],
  ['Women', '/shop?category=women'],
];

export function SiteHeader() {
  const { data: cart } = useCart();
  const { data: me } = useMe();
  const { data: tree } = useCategoryTree();
  const openLogin = useAuthModal((s) => s.openLogin);
  const router = useRouter();
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const count = cart?.itemCount ?? 0;
  const wishCount = useWishlist((s) => s.ids.length);
  const mounted = useMounted();
  const tops = tree ?? [];
  useWishlistSync(); // sync the wishlist with the server for logged-in users

  function search(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    router.push(q.trim() ? `/shop?search=${encodeURIComponent(q.trim())}` : '/shop');
  }

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      {/* Row 1 — search · brand · profile/wishlist/cart (borderless) */}
      <div className="mx-auto grid h-12 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-3 xl:px-0">
        <div className="justify-self-start">
          {/* Desktop: inline search field */}
          <form onSubmit={search} className="relative hidden w-54 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              aria-label="Search products"
              className="h-8 w-full rounded-full border bg-transparent pl-8 pr-3 text-[11px] uppercase tracking-widest outline-none placeholder:text-muted-foreground focus:border-foreground/30"
            />
          </form>
          {/* Mobile: icon that opens the search popup */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="size-9 rounded-full sm:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search />
          </Button>
        </div>

        <Link
          href="/"
          className="justify-self-center whitespace-nowrap text-base font-bold uppercase tracking-[0.2em] sm:text-xl sm:tracking-[0.3em] md:absolute md:left-1/2 md:top-1/2 md:z-10 md:-translate-x-1/2 md:-translate-y-1/2"
        >
          {STORE_NAME}
        </Link>

        <div className="flex items-center justify-end md:col-start-3">
          <Link href="/account" aria-label="Account">
            <Button variant="ghost" size="icon" className="size-9 rounded-full"><User /></Button>
          </Link>
          <Link href="/wishlist" aria-label="Wishlist" className="relative hidden sm:inline-flex">
            <Button variant="ghost" size="icon" className="size-9 rounded-full"><Heart /></Button>
            {mounted && wishCount > 0 && (
              <Badge
                variant="brand"
                className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
              >
                {wishCount}
              </Badge>
            )}
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative">
            <Button variant="ghost" size="icon" className="size-9 rounded-full"><ShoppingBag /></Button>
            {count > 0 && (
              <Badge
                variant="brand"
                className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
              >
                {count}
              </Badge>
            )}
          </Link>
          {me?.roles?.includes('admin') && (
            <Link href="/admin" className={`${pill} ml-1 hidden md:inline-flex`}>Admin</Link>
          )}
          {!me && (
            <button type="button" onClick={() => openLogin()} className={`${pill} ml-1 hidden sm:inline-flex`}>
              Login
            </button>
          )}
        </div>
      </div>

      {/* Row 2 — one scrollable strip on mobile; two clusters on desktop.
          Bottom border lives here (max-w-7xl) so it aligns with the content,
          not the full-width header. */}
      <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto border-b pb-2.5 sm:px-4 md:justify-between md:overflow-x-visible px-3 xl:px-0">
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
            </DropdownMenuContent>
          </DropdownMenu>

          {STATIC_PILLS.map(([label, href]) => (
            <Link key={label} href={href} className={navText}>{label}</Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-5">
          {tops.slice(0, 4).map((c) => (
            <Link key={c.id} href={`/shop?category=${c.slug}`} className={navText}>{c.name}</Link>
          ))}
        </div>
      </div>

      {/* Mobile search — just the pill; tap away or Esc to close. */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-x-3 top-20" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={search} className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
                placeholder="Search products…"
                aria-label="Search products"
                className="h-11 w-full rounded-full border bg-background pl-11 pr-4 text-sm shadow-lg outline-none placeholder:text-muted-foreground focus:border-foreground/40"
              />
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
