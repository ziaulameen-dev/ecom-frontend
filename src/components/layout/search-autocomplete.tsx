'use client';

import { ArrowRight, Flame, Layers, Search, Sparkles, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { useCategoryTree, useProducts } from '@/features/catalog';
import type { Category, CategoryNode, ListingItem } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';

interface SearchAutocompleteProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery?: (text: string) => void;
  isMobile?: boolean;
}

export function SearchAutocomplete({
  query,
  isOpen,
  onClose,
  onSelectQuery,
  isMobile = false,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query for smooth live search requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  const hasQuery = debouncedQuery.length > 0;

  // Live matching products
  const { data: products, isLoading: isProductsLoading } = useProducts(
    hasQuery ? { search: debouncedQuery, limit: 6 } : {},
  );

  // Category matching
  const { data: categoryTree } = useCategoryTree();

  const matchingCategories = useMemo(() => {
    if (!hasQuery || !categoryTree) return [];
    const lower = debouncedQuery.toLowerCase();
    const matches: { name: string; slug: string; parentName?: string }[] = [];

    function searchTree(nodes: (Category | CategoryNode)[], parent?: string) {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(lower)) {
          matches.push({ name: node.name, slug: node.slug, parentName: parent });
        }
        if ('children' in node && Array.isArray(node.children) && node.children.length > 0) {
          searchTree(node.children, node.name);
        }
      }
    }
    searchTree(categoryTree);
    return matches.slice(0, 3);
  }, [debouncedQuery, categoryTree, hasQuery]);

  // Quick categories when query is empty
  const quickCategories = useMemo(() => {
    if (!categoryTree) return [];
    return categoryTree.slice(0, 5);
  }, [categoryTree]);

  if (!isOpen) return null;

  function handleNavigate(url: string) {
    onClose();
    router.push(url);
  }

  return (
    <div
      className={cn(
        'z-50 overflow-y-auto rounded-sm border border-neutral-200 dark:border-neutral-800 bg-background/98 backdrop-blur-md shadow-2xl transition-all duration-200 animate-in fade-in',
        isMobile
          ? 'absolute left-0 right-0 top-full mt-1 max-h-[70vh] w-full'
          : 'absolute left-0 top-full mt-1.5 w-[360px] lg:w-[420px] max-h-[480px] zoom-in-95',
      )}
    >
      {/* ----------------------------------------------------
          STATE 1: EMPTY QUERY (Trending & Quick Links)
          ---------------------------------------------------- */}
      {!hasQuery && (
        <div className="p-3 space-y-4 text-xs text-neutral-800 dark:text-neutral-200">
          <div>
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-neutral-500 mb-2.5">
              <Sparkles className="size-3 text-neutral-400" />
              Quick Searches
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleNavigate(`/shop?category=${c.slug}`)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[11px] font-medium transition-colors"
                >
                  <Tag className="size-3 text-neutral-400" />
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleNavigate('/shop?sort=best')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[11px] font-medium transition-colors"
              >
                <Flame className="size-3 text-orange-500" />
                Best Sellers
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('/shop?sort=new')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[11px] font-medium transition-colors"
              >
                New Arrivals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          STATE 2: LIVE SEARCH RESULTS
          ---------------------------------------------------- */}
      {hasQuery && (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
          {/* Matching Categories */}
          {matchingCategories.length > 0 && (
            <div className="p-2 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="px-2 py-1 font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                Categories
              </div>
              <div className="space-y-0.5 mt-0.5">
                {matchingCategories.map((c, i) => (
                  <button
                    key={`cat-${i}`}
                    type="button"
                    onClick={() => handleNavigate(`/shop?category=${c.slug}`)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-left text-xs font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="size-3.5 text-neutral-400 shrink-0" />
                      <span>{c.name}</span>
                      {c.parentName && (
                        <span className="text-[10px] text-neutral-400 font-normal">
                          in {c.parentName}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="size-3 text-neutral-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Skeletons */}
          {isProductsLoading && (
            <div className="p-3 space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="size-10 bg-neutral-200 dark:bg-neutral-800 rounded-sm shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="h-2.5 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Matching Product Items */}
          {!isProductsLoading && products && products.length > 0 && (
            <div className="p-1.5">
              <div className="px-2 py-1 font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                Products
              </div>
              <div className="space-y-0.5 mt-0.5">
                {products.map((p) => {
                  const href = p.slug ? `/product/${p.slug}` : `/shop?search=${encodeURIComponent(p.name)}`;
                  const hasDiscount = p.offerPriceMinor != null && p.offerPriceMinor < p.priceMinor;

                  return (
                    <button
                      key={p.key || p.productId}
                      type="button"
                      onClick={() => handleNavigate(href)}
                      className="w-full flex items-center gap-3 p-2 rounded-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors group"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50">
                        {p.imageUrl ? (
                          <Image
                            src={mediaSrc(p.imageUrl)}
                            alt={p.name}
                            fill
                            sizes="44px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-neutral-400">
                            <Search className="size-4" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-black dark:group-hover:text-white">
                          {p.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                          {hasDiscount ? (
                            <>
                              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                {money(p.offerPriceMinor!, p.currency)}
                              </span>
                              <span className="text-neutral-400 line-through text-[10px]">
                                {money(p.priceMinor, p.currency)}
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {money(p.priceMinor, p.currency)}
                            </span>
                          )}
                          {!p.inStock && (
                            <span className="text-[10px] text-red-500 font-medium ml-auto">
                              Out of stock
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state when query produces 0 results */}
          {!isProductsLoading && (!products || products.length === 0) && matchingCategories.length === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500">
              <Search className="size-6 mx-auto mb-2 text-neutral-400 opacity-60" />
              <p className="font-medium text-neutral-700 dark:text-neutral-300">
                No matches for &ldquo;{debouncedQuery}&rdquo;
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                Try searching for watches, perfumes, or pants
              </p>
            </div>
          )}

          {/* Footer View All Search Results */}
          <div className="p-2 bg-neutral-50 dark:bg-neutral-900/60 text-center">
            <button
              type="button"
              onClick={() => handleNavigate(`/shop?search=${encodeURIComponent(debouncedQuery)}`)}
              className="w-full py-2.5 px-3 rounded-sm flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <span>View all results for &ldquo;{debouncedQuery}&rdquo;</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
