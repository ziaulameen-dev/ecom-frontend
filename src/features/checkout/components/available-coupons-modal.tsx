'use client';

import { Check, CheckCircle2, Copy, Sparkles, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoupons } from '@/features/account';
import { cn, money } from '@/lib/utils';
import type { ActiveCoupon } from '@/lib/types';

interface AvailableCouponsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotalMinor: number;
  appliedCode?: string | null;
  onSelectCoupon: (code: string) => void;
  onRemoveCoupon?: () => void;
  currency?: string;
}

function getDiscountPreview(coupon: ActiveCoupon, subtotalMinor: number): number {
  if (coupon.type === 'percent') {
    let d = Math.round((subtotalMinor * coupon.value) / 100);
    if (coupon.maxDiscountMinor != null) {
      d = Math.min(d, coupon.maxDiscountMinor);
    }
    return Math.min(d, subtotalMinor);
  }
  return Math.min(coupon.value, subtotalMinor);
}

export function AvailableCouponsModal({
  open,
  onOpenChange,
  subtotalMinor,
  appliedCode,
  onSelectCoupon,
  onRemoveCoupon,
  currency = 'INR',
}: AvailableCouponsModalProps) {
  const { data: coupons, isLoading } = useCoupons();
  const [manualCode, setManualCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleApply(code: string) {
    onSelectCoupon(code);
    onOpenChange(false);
  }

  const modalBody = (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-1 overflow-hidden">
      {/* Manual Code Input Bar */}
      <div className="flex gap-2 shrink-0">
        <Input
          placeholder="Enter coupon code"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          className="h-10 uppercase text-xs tracking-wider font-medium"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (manualCode.trim()) {
                handleApply(manualCode.trim().toUpperCase());
              }
            }
          }}
        />
        <Button
          size="sm"
          disabled={!manualCode.trim()}
          onClick={() => {
            if (manualCode.trim()) {
              handleApply(manualCode.trim().toUpperCase());
            }
          }}
          className="h-10 px-5 font-bold text-xs uppercase bg-primary-button hover:bg-primary-button/90 text-white shrink-0"
        >
          Apply
        </Button>
      </div>

      {/* Coupons List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-sm border p-3.5 space-y-2 bg-muted/20">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            ))}
          </div>
        ) : !coupons?.length ? (
          <div className="py-12 text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Tag className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">No coupons available</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              There are no public promotional coupons available right now. Check back soon for seasonal offers!
            </p>
          </div>
        ) : (
          coupons.map((c) => {
            const isApplied = appliedCode?.toUpperCase() === c.code.toUpperCase();
            const isAvailable = c.isAvailable !== false;
            const isUnlocked = subtotalMinor >= c.minSubtotalMinor;
            const diffToUnlock = Math.max(0, c.minSubtotalMinor - subtotalMinor);
            const savings = getDiscountPreview(c, subtotalMinor);
            const isPercent = c.type === 'percent';
            const discountHighlight = isPercent ? `${c.value}% OFF` : `FLAT ${money(c.value, currency)} OFF`;

            return (
              <div
                key={c.code}
                className={cn(
                  'relative rounded-sm border p-3.5 transition-all text-xs space-y-2.5',
                  isApplied
                    ? 'border-[#117a7a] bg-[#117a7a]/5 dark:border-[#117a7a]/60 dark:bg-[#117a7a]/15 shadow-xs'
                    : isAvailable && isUnlocked
                    ? 'border-neutral-200 dark:border-neutral-800 bg-card hover:border-primary-button/40 shadow-xs'
                    : 'border-neutral-200/60 dark:border-neutral-800/60 bg-muted/20 opacity-70'
                )}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold tracking-wider text-xs px-2 py-0.5 rounded-sm border border-dashed border-primary-button/60 bg-primary-button/5 text-primary-button">
                        {c.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(c.code)}
                        className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                        title="Copy coupon code"
                        aria-label={`Copy coupon code ${c.code}`}
                      >
                        {copiedCode === c.code ? (
                          <Check className="size-3 text-[#117a7a]" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <span>{discountHighlight}</span>
                      {c.maxDiscountMinor != null && isPercent && (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          (Up to {money(c.maxDiscountMinor, currency)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button / Applied Pill */}
                  <div className="shrink-0">
                    {isApplied ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-[#117a7a]/15 text-[#117a7a] dark:text-[#42a3a3] border-[#117a7a]/30 gap-1 font-bold text-[11px]"
                        >
                          <CheckCircle2 className="size-3" /> Applied
                        </Badge>
                        {onRemoveCoupon && (
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveCoupon();
                              onOpenChange(false);
                            }}
                            className="text-[11px] font-bold text-brand uppercase hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : isAvailable && isUnlocked ? (
                      <Button
                        size="sm"
                        onClick={() => handleApply(c.code)}
                        className="h-8 px-3.5 font-bold text-xs uppercase bg-primary-button hover:bg-primary-button/90 text-white shadow-xs"
                      >
                        Apply
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled
                        variant="outline"
                        className="h-8 px-3 text-[11px] font-bold uppercase opacity-60"
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                </div>

                {/* Terms / Conditions */}
                <div className="space-y-1 text-muted-foreground text-[11px]">
                  {c.minSubtotalMinor > 0 ? (
                    <p>
                      Applicable on orders above <span className="font-semibold text-foreground">{money(c.minSubtotalMinor, currency)}</span>
                    </p>
                  ) : (
                    <p>No minimum order value</p>
                  )}

                  {/* Savings or Nudge info */}
                  {isAvailable ? (
                    isUnlocked ? (
                      <p className="text-[#117a7a] dark:text-[#42a3a3] font-medium flex items-center gap-1">
                        <Sparkles className="size-3" />
                        Save {money(savings, currency)} with this code
                      </p>
                    ) : (
                      <p className="text-[#e84800] font-medium">
                        Add {money(diffToUnlock, currency)} more to unlock this offer
                      </p>
                    )
                  ) : (
                    <p className="text-muted-foreground italic">
                      {c.unavailableReason ?? 'Not available for your account'}
                    </p>
                  )}

                  {c.expiresAt && (
                    <p className="text-[10px] text-muted-foreground/80">
                      Expires {new Date(c.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-4 sm:p-6 md:p-6 md:max-w-md overflow-hidden flex flex-col max-h-[85vh] md:h-full md:max-h-none">
        <DrawerHeader className="relative md:pr-8 pb-3 shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-base font-bold">
            <Tag className="size-4 text-primary-button" />
            Available Coupons &amp; Offers
          </DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">
            Select or apply any of the available coupon codes below for instant discounts.
          </DrawerDescription>
          <DrawerClose className="hidden md:flex absolute top-2 right-2 rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>
        {modalBody}
      </DrawerContent>
    </Drawer>
  );
}
