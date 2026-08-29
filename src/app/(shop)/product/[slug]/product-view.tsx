'use client';

import { useRouter } from 'next/navigation';
import {
  Check, ChevronDown, ChevronUp, Heart, Play, RotateCcw, Share2, ShoppingBag, Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RichText, fillTemplate } from '@/components/rich-text';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct, useProducts, useAttributes } from '@/features/catalog';
import { ProductCard } from '@/features/catalog/components/product-card';
import { ProductRow } from '@/features/catalog/components/product-row';
import { ReviewsSection } from '@/features/catalog/components/reviews-section';
import { SizeChartModal } from '@/features/catalog/components/size-chart-modal';
import {
  VariantPicker,
  useVariantSelection,
} from '@/features/catalog/components/variant-picker';
import { useReferral } from '@/features/account';
import { useMe } from '@/features/auth';
import { useAddToCart } from '@/features/cart';
import { useWishlist } from '@/features/wishlist';
import { CARD_ASPECT_CLASS, STORE_NAME } from '@/lib/config';
import { cn, mediaSrc, money } from '@/lib/utils';

export function ProductView({ slug }: { slug: string }) {
  const { data: product, isLoading, isError } = useProduct(slug);

  if (isLoading) return <ProductSkeleton />;
  if (isError || !product) {
    return <div className="mx-auto max-w-[1500px] px-4 py-24 text-center text-muted-foreground">Product not found.</div>;
  }
  return <ProductDetailView product={product} />;
}

function ProductDetailView({ product }: { product: NonNullable<ReturnType<typeof useProduct>['data']> }) {
  const router = useRouter();
  const add = useAddToCart();
  const { data: me } = useMe();
  const { data: refSummary } = useReferral(!!me);
  const { data: allAttributes } = useAttributes();
  const sizeAttr = useMemo(() => {
    return (allAttributes ?? []).find(
      (a) =>
        (a.sizeChartImage || (a.sizeTableColumns?.length && a.sizeTableRows?.length)) &&
        (a.name.toLowerCase().includes('size') || a.slug.includes('size'))
    );
  }, [allAttributes]);

  const { groups, selection, setSelection, active } = useVariantSelection(product.variants);
  const [qty, setQty] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeMessage, setPincodeMessage] = useState<string | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);

  // Wishlist state
  const wished = useWishlist((s) => s.ids.includes(product.id));
  const toggleWish = useWishlist((s) => s.toggle);

  function handleWishlist() {
    toggleWish(product.id);
    toast.success(wished ? 'Removed from wishlist' : 'Added to wishlist');
  }

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    details: false,
    desc: false,
    artist: false,
  });

  function toggleAccordion(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const priceMinor = product.hasVariants ? active?.priceMinor ?? product.priceFromMinor : product.basePriceMinor;
  const offerMinor = product.hasVariants ? active?.offerPriceMinor ?? null : product.offerPriceMinor;
  const stock = product.hasVariants ? active?.stock ?? 0 : product.baseStock;
  
  const mediaItems = useMemo<{ url: string; type: 'image' | 'video' }[]>(() => {
    const isVideo = (url: string) => {
      if (!url) return false;
      const clean = url.split('?')[0].toLowerCase();
      return /\.(mp4|webm|mov|mkv|avi|ogv|3gp|m4v)$/i.test(clean);
    };

    const variantImgs = product.hasVariants && active?.images?.length ? active.images : [];
    if (variantImgs.length > 0) {
      return variantImgs.filter(Boolean).map((url) => ({
        url,
        type: isVideo(url) ? ('video' as const) : ('image' as const),
      }));
    }
    if (product.media?.length > 0) {
      return product.media;
    }
    return product.imageUrl ? [{ url: product.imageUrl, type: 'image' as const }] : [];
  }, [product, active]);

  const [mainIdx, setMainIdx] = useState(0);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  useEffect(() => setMainIdx(0), [active?.id]);

  // Touch Swipe Handler for Mobile Product Gallery
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.touches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && mainIdx < mediaItems.length - 1) {
      setMainIdx((prev) => prev + 1);
    }
    if (isRightSwipe && mainIdx > 0) {
      setMainIdx((prev) => prev - 1);
    }
  };

  const vars = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of active?.options ?? []) {
      m[o.type.toLowerCase()] = o.value;
      m[o.slug.toLowerCase()] = o.value;
    }
    if (active?.customVariables) {
      for (const [k, v] of Object.entries(active.customVariables)) {
        m[k.toLowerCase()] = v;
      }
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

  async function onBuyNow() {
    try {
      await add.mutateAsync({
        productId: product.id,
        variantId: active?.id ?? null,
        quantity: qty,
      });
      router.push('/checkout');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function checkPincode() {
    if (!pincode || pincode.trim().length < 6) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }
    setIsCheckingPincode(true);
    setTimeout(() => {
      setIsCheckingPincode(false);
      setPincodeMessage(`Delivery available to ${pincode}! Expected delivery by 3 - 5 business days.`);
    }, 600);
  }

  function handleShare(platform?: string) {
    const url = window.location.href;
    const title = product.name;
    if (platform === 'wa') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' - ' + url)}`, '_blank');
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'x') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        toast.success('Product link copied to clipboard!');
      }
    }
  }

  function scrollToReviews() {
    const el = document.getElementById('reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-6 py-4 md:py-8 md:pb-12 text-gray-900 font-sans">
      {/* Dynamic Breadcrumb Trail matching screenshot */}
      <nav className="text-xs text-gray-500 mb-4 hidden md:flex items-center gap-1.5">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-gray-900">{product.category || 'Shop'}</Link>
        <span>/</span>
        <span className="hover:text-gray-900">{STORE_NAME}</span>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate">{fillTemplate(product.name, vars)}</span>
      </nav>

      {/* Main Layout Grid */}
      <div className="grid gap-6 lg:gap-10 md:grid-cols-12 items-start">
        
        {/* Left Column: Product Image Gallery */}
        <div className="md:col-span-7">
          
          {/* Mobile Swipeable Touch Carousel (< md) - Full Width Edge to Edge */}
          <div className="md:hidden -mx-3 sm:-mx-6">
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="relative w-full aspect-square overflow-hidden rounded-none bg-gray-100 touch-pan-y"
            >
              {mediaItems[mainIdx] ? (
                mediaItems[mainIdx].type === 'video' ? (
                  <InlineCustomVideo src={mediaItems[mainIdx].url} />
                ) : (
                  <Image
                    src={mediaSrc(mediaItems[mainIdx].url)}
                    alt={product.name}
                    fill
                    className="object-cover transition-opacity duration-200"
                    sizes="100vw"
                    priority
                  />
                )
              ) : (
                <div className="grid h-full place-items-center text-gray-400">
                  <ShoppingBag className="size-12" />
                </div>
              )}

              {/* Tag Badges overlay */}
              {product.tags.length > 0 && (
                <div className="absolute top-4 left-4 z-10 text-[11px] font-bold tracking-wider text-gray-700 uppercase bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-xs">
                  {product.tags[0]}
                </div>
              )}

              {/* Mobile Top Right Wishlist Heart Button */}
              <button
                type="button"
                onClick={handleWishlist}
                aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur-xs text-gray-700 transition-all active:scale-95"
              >
                <Heart className={cn('size-5', wished && 'fill-red-600 text-red-600')} />
              </button>

              {/* Mobile Indicator Dots */}
              {mediaItems.length > 1 && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-1.5 z-10">
                  {mediaItems.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMainIdx(i)}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        i === mainIdx ? 'w-6 bg-gray-900' : 'w-1.5 bg-gray-400/70'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop 2-Column Grid of Media (≥ md) */}
          <div className="hidden md:grid grid-cols-2 gap-3 sm:gap-4">
            {mediaItems.map((m, i) => (
              <div
                key={m.url + i}
                className={cn(
                  'relative w-full rounded-none overflow-hidden bg-gray-50',
                  CARD_ASPECT_CLASS,
                  mediaItems.length === 1 ? 'col-span-2' : ''
                )}
              >
                {m.type === 'video' ? (
                  <div
                    onClick={() => setPlayingVideoUrl(m.url)}
                    className="relative h-full w-full bg-black group cursor-pointer"
                  >
                    <video src={mediaSrc(m.url)} muted playsInline className="h-full w-full object-cover" />
                    <div className="absolute inset-0 z-10 grid place-items-center bg-black/25 group-hover:bg-black/40 transition-colors">
                      <div className="grid size-14 place-items-center rounded-full bg-white/95 shadow-md backdrop-blur-xs text-gray-900 group-hover:scale-110 transition-transform">
                        <Play className="size-7 fill-gray-900 ml-1 text-gray-900" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={mediaSrc(m.url)}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 768px) 35vw, 50vw"
                    priority={i < 2}
                  />
                )}
                {i === 0 && product.tags.length > 0 && (
                  <div className="absolute top-4 left-4 z-10 text-[11px] font-bold tracking-wider text-gray-700 uppercase bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-xs">
                    {product.tags[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Product Details Sticky Panel */}
        <div className="md:col-span-5 md:sticky md:top-24 space-y-5">
          {/* Header Title & Category */}
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              {fillTemplate(product.name, vars)}
            </h1>
            {(product.category || product.tags.length > 0) && (
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                {product.category || product.tags.join(' • ')}
              </p>
            )}
          </div>

          {/* Price Block & Desktop Wishlist Icon */}
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {money(offerMinor ?? priceMinor, product.currency)}
                </span>
                {offerMinor != null && (
                  <span className="text-base text-gray-400 line-through">
                    {money(priceMinor, product.currency)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-normal">Price incl. of all taxes</p>
            </div>

            {/* Wishlist Heart Icon on Desktop (Right side of Price) */}
            <button
              type="button"
              onClick={handleWishlist}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              className="hidden md:flex items-center justify-center size-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs"
            >
              <Heart className={cn('size-5', wished && 'fill-red-600 text-red-600')} />
            </button>
          </div>

          {/* Variant Selector Section */}
          {groups.length > 0 && (
            <div className="pt-1">
              <VariantPicker
                groups={groups}
                selection={selection}
                onChange={setSelection}
                onOpenSizeChart={() => setSizeChartOpen(true)}
              />
            </div>
          )}

          {/* Quantity Selector */}
          <CustomQuantitySelector value={qty} onChange={setQty} />

          {/* Desktop CTAs: Side-by-side ADD TO CART + BUY NOW */}
          <div className="hidden md:flex gap-3 pt-2">
            <button
              type="button"
              disabled={!canBuy || add.isPending}
              onClick={onAdd}
              className="flex-1 h-12 rounded-xs border border-gray-900 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-colors text-gray-900 bg-white hover:bg-gray-50"
            >
              <ShoppingBag className="size-4" />
              {add.isPending ? 'ADDING...' : 'ADD TO CART'}
            </button>

            <button
              type="button"
              disabled={!canBuy || add.isPending}
              onClick={onBuyNow}
              className="flex-1 h-12 rounded-xs bg-[#e83825] hover:bg-[#d42d1b] disabled:bg-gray-400 text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Zap className="size-4 fill-white text-white" />
              BUY NOW
            </button>
          </div>

          {/* Share Icons Row matching screenshot */}
          <div className="flex items-center gap-3 pt-1 text-xs text-gray-600">
            <span className="font-semibold text-gray-800">Share</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleShare('wa')}
                aria-label="Share on WhatsApp"
                className="p-1.5 text-gray-600 hover:text-emerald-600 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
              </button>
              <button
                type="button"
                onClick={() => handleShare('fb')}
                aria-label="Share on Facebook"
                className="p-1.5 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M13.5 22v-8h2.7l.4-3h-3.1V9c0-.9.3-1.5 1.6-1.5H17V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v8h3z" /></svg>
              </button>
              <button
                type="button"
                onClick={() => handleShare('x')}
                aria-label="Share on X"
                className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5"><path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5.3-6.9L4.8 22H2l7.8-8.9L1.3 2h6.9l4.8 6.4L18.9 2Zm-2.4 18h1.9L7.6 4H5.6l10.9 16Z" /></svg>
              </button>
              <button
                type="button"
                onClick={() => handleShare()}
                aria-label="Copy Link"
                className="p-1.5 text-gray-600 hover:text-pink-600 transition-colors"
              >
                <Share2 className="size-4" />
              </button>
            </div>
          </div>

          {/* Check Ratings & Reviews Link Button on top of Delivery Details */}
          <div className="pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={scrollToReviews}
              className="w-full flex items-center justify-between p-3 rounded-xs border border-gray-200 bg-gray-50/70 hover:bg-gray-100 transition-colors text-xs font-bold text-gray-900"
            >
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-sm">★</span>
                <span>Ratings &amp; Reviews</span>
              </div>
              <span className="text-[#187b7b] uppercase font-bold text-[11px] hover:underline">
                Read Reviews ↓
              </span>
            </button>
          </div>

          {/* Delivery Details Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Delivery Details</h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter Pincode"
                  className="w-full h-11 px-3.5 border border-gray-300 rounded-xs text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#187b7b]"
                />
              </div>
              <button
                type="button"
                onClick={checkPincode}
                disabled={isCheckingPincode}
                className="h-11 px-5 rounded-xs bg-[#187b7b] hover:bg-[#146666] text-white font-bold text-xs uppercase tracking-wider transition-colors shrink-0"
              >
                {isCheckingPincode ? 'CHECKING...' : 'CHECK'}
              </button>
            </div>

            {pincodeMessage && (
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xs">
                {pincodeMessage}
              </p>
            )}

            {/* Return Policy Card */}
            <div className="flex items-start gap-3 p-3.5 border border-gray-200 rounded-xs bg-gray-50/50">
              <RotateCcw className="size-5 text-gray-700 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                This product is eligible for return or exchange under our 30-day return or exchange policy. No questions asked.
              </p>
            </div>
          </div>

          {/* Product Details & Information Accordions Box */}
          <div className="border border-gray-200 rounded-xs divide-y divide-gray-200 overflow-hidden bg-white mt-4">
            {/* Product Details Accordion Item */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion('details')}
                className="w-full px-4 py-3.5 flex items-center justify-between font-bold text-sm text-gray-900 text-left hover:bg-gray-50 transition-colors"
              >
                <span>Product Details</span>
                {openSections.details ? <ChevronUp className="size-4 text-gray-600" /> : <ChevronDown className="size-4 text-gray-600" />}
              </button>
              {openSections.details && (
                <div className="px-4 pb-3.5 text-xs text-gray-700 space-y-1.5 border-t border-gray-100 pt-2.5">
                  <p><span className="font-semibold text-gray-800">Sold By:</span> {STORE_NAME}</p>
                  {product.category && <p><span className="font-semibold text-gray-800">Category:</span> {product.category}</p>}
                  {product.tags.length > 0 && <p><span className="font-semibold text-gray-800">Tags:</span> {product.tags.join(', ')}</p>}
                </div>
              )}
            </div>

            {/* Product Description Accordion Item */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion('desc')}
                className="w-full px-4 py-3.5 flex items-center justify-between font-bold text-sm text-gray-900 text-left hover:bg-gray-50 transition-colors"
              >
                <span>Product Description</span>
                {openSections.desc ? <ChevronUp className="size-4 text-gray-600" /> : <ChevronDown className="size-4 text-gray-600" />}
              </button>
              {openSections.desc && (
                <div className="px-4 pb-3.5 text-xs text-gray-700 leading-relaxed border-t border-gray-100 pt-2.5">
                  {product.description ? (
                    <RichText html={product.description} vars={vars} />
                  ) : product.shortDescription ? (
                    <p>{fillTemplate(product.shortDescription, vars)}</p>
                  ) : (
                    <p>High quality product from {STORE_NAME}.</p>
                  )}
                </div>
              )}
            </div>

            {/* Artist's Details Accordion Item */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion('artist')}
                className="w-full px-4 py-3.5 flex items-center justify-between font-bold text-sm text-gray-900 text-left hover:bg-gray-50 transition-colors"
              >
                <span>Additional Information</span>
                {openSections.artist ? <ChevronUp className="size-4 text-gray-600" /> : <ChevronDown className="size-4 text-gray-600" />}
              </button>
              {openSections.artist && (
                <div className="px-4 pb-3.5 text-xs text-gray-700 leading-relaxed border-t border-gray-100 pt-2.5">
                  {product.additionalInfo ? (
                    <RichText html={product.additionalInfo} vars={vars} />
                  ) : (
                    <p>Designed and crafted with care by the {STORE_NAME} design team.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Others Also Bought Section */}
      <SimilarProductsSection currentProductId={product.id} categoryId={product.categoryId} />

      {/* Reviews Section - Default Open & At the End */}
      <div className="mt-6 md:mt-12 md:pt-4">
        <ReviewsSection productId={product.id} />
      </div>

      {/* Mobile Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 p-2.5 flex items-center gap-2.5 shadow-lg md:hidden">
        <button
          type="button"
          disabled={!canBuy || add.isPending}
          onClick={onAdd}
          className="flex-1 h-11 rounded-xs border border-gray-900 font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors text-gray-900 bg-white"
        >
          <ShoppingBag className="size-4" />
          {add.isPending ? 'ADDING...' : 'ADD TO CART'}
        </button>

        <button
          type="button"
          disabled={!canBuy || add.isPending}
          onClick={onBuyNow}
          className="flex-1 h-11 rounded-xs bg-[#e83825] hover:bg-[#d42d1b] disabled:bg-gray-400 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <Zap className="size-4 fill-white text-white" />
          BUY NOW
        </button>
      </div>

      {/* Size Chart Modal */}
      <SizeChartModal
        open={sizeChartOpen}
        onOpenChange={setSizeChartOpen}
        sizeChartImageUrl={
          active?.customVariables?.size_chart ||
          active?.customVariables?.sizechart ||
          vars.size_chart ||
          vars.sizechart ||
          sizeAttr?.sizeChartImage ||
          null
        }
        sizeTableColumns={sizeAttr?.sizeTableColumns}
        sizeTableRows={sizeAttr?.sizeTableRows}
      />

      {/* Video Play Modal: No padding, no close button, click backdrop to close */}
      {playingVideoUrl && (
        <div
          className="fixed inset-0 z-50 hidden md:flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlayingVideoUrl(null)}
        >
          <div className="relative w-full max-w-3xl overflow-hidden shadow-2xl bg-black rounded-sm" onClick={(e) => e.stopPropagation()}>
            <ModalCustomVideo src={playingVideoUrl} />
          </div>
        </div>
      )}
    </div>
  );
}

function InlineCustomVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <div className="relative h-full w-full bg-black group cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={mediaSrc(src)}
        playsInline
        loop
        onEnded={() => setIsPlaying(false)}
        className="h-full w-full object-cover"
      />
      {!isPlaying && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/25 transition-colors">
          <div className="grid size-14 place-items-center rounded-full bg-white/95 shadow-md backdrop-blur-xs text-gray-900 group-hover:scale-110 transition-transform">
            <Play className="size-7 fill-gray-900 ml-1 text-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

function ModalCustomVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <div className="relative w-full bg-black cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={mediaSrc(src)}
        autoPlay
        playsInline
        loop
        onEnded={() => setIsPlaying(false)}
        className="w-full h-auto max-h-[85vh] object-contain block"
      />
      {!isPlaying && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/25 transition-colors">
          <div className="grid size-14 place-items-center rounded-full bg-white/95 shadow-md backdrop-blur-xs text-gray-900 hover:scale-110 transition-transform">
            <Play className="size-7 fill-gray-900 ml-1 text-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

function SimilarProductsSection({ currentProductId, categoryId }: { currentProductId: string; categoryId: string | null }) {
  const { data: products } = useProducts({ categoryId: categoryId || undefined, limit: 11 });
  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => p.productId !== currentProductId).slice(0, 10);
  }, [products, currentProductId]);

  if (filtered.length === 0) return null;

  const shopHref = categoryId ? `/shop?category=${categoryId}` : '/shop';

  return (
    <div className="mt-8 md:mt-16 border-t border-gray-200 pt-6 md:pt-8">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Others Also Bought</h2>
        <Link href={shopHref} className="text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
          Show all →
        </Link>
      </div>
      <ProductRow items={filtered} />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 grid gap-8 md:grid-cols-12">
      <Skeleton className="md:col-span-7 aspect-square w-full rounded-none" />
      <div className="md:col-span-5 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function CustomQuantitySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState(String(value));

  const standardOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  function handleSelect(n: number) {
    onChange(n);
    setIsCustomMode(false);
    setIsOpen(false);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(customVal, 10);
    if (parsed > 0) {
      onChange(parsed);
      setIsCustomMode(false);
      setIsOpen(false);
    } else {
      toast.error('Please enter a valid quantity');
    }
  }

  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-xs sm:text-sm font-bold text-gray-900">Quantity:</span>

      <div className="relative">
        {!isCustomMode ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-9 px-3 border border-gray-300 rounded-xs text-xs font-semibold text-gray-800 bg-white hover:border-gray-400 focus:outline-none flex items-center gap-2 min-w-[72px] justify-between shadow-2xs"
          >
            <span>{value < 10 ? `0${value}` : value}</span>
            <ChevronDown className="size-3.5 text-gray-500" />
          </button>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={999}
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              className="h-9 w-20 px-2.5 border border-gray-300 rounded-xs text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              placeholder="Qty"
              autoFocus
            />
            <button
              type="submit"
              className="h-9 px-2.5 bg-gray-900 text-white rounded-xs text-xs font-semibold hover:bg-gray-800"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="h-9 px-1 text-gray-400 hover:text-gray-700 text-xs"
            >
              ✕
            </button>
          </form>
        )}

        {/* Custom Dropdown Options */}
        {isOpen && !isCustomMode && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-xs shadow-lg z-30 py-1 max-h-56 overflow-y-auto divide-y divide-gray-100">
              {standardOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleSelect(n)}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-gray-50 flex items-center justify-between transition-colors',
                    value === n ? 'bg-gray-100 font-bold text-gray-900' : 'text-gray-700'
                  )}
                >
                  <span>{n < 10 ? `0${n}` : n}</span>
                  {value === n && <Check className="size-3 text-gray-900" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setCustomVal(String(value));
                }}
                className="w-full px-3 py-2 text-left text-xs font-bold text-[#187b7b] hover:bg-emerald-50 flex items-center justify-between transition-colors"
              >
                <span>More (Custom)…</span>
                <span className="text-[10px]">+</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
