'use client';

import { CreditCard, GripVertical, Headphones, Pencil, Plus, Sparkles, Trash2, Truck } from 'lucide-react';
import Image from 'next/image';
import { Suspense, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminAttributes,
  useAdminProducts,
  useBroadcast,
  useNotifyProduct,
  useSetShippingRate,
  useShippingRate,
  useSubscribers,
  useUploadProductImage,
  ShiprocketSettingsCard,
} from '@/features/admin';
import {
  useAnnouncement,
  useContent,
  useCreateHero,
  useDeleteHero,
  useHero,
  useProducts,
  useReorderHero,
  useSetAnnouncement,
  useSetContent,
  useSetHeroAspect,
  useUpdateHero,
} from '@/features/catalog';
import type { FaqItem, HeroBanner, SocialLink } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';

const toPaise = (rupees: string) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise: number) => (paise / 100).toFixed(2);

const TABS = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'shiprocket', label: 'Shiprocket Logistics' },
  { id: 'payments', label: 'Payment Options' },
  { id: 'support', label: 'Contact Support' },
  { id: 'hero', label: 'Homepage hero' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'faq', label: 'FAQ' },
  { id: 'social', label: 'Social links' },
  { id: 'newsletter', label: 'Newsletter' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId;
  const activeTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'shipping';

  const setTab = (t: TabId) => {
    router.replace(`/admin/settings?tab=${t}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Store-wide configuration.</p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto scrollbar-none whitespace-nowrap min-w-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm shrink-0 transition-colors',
              activeTab === t.id
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'shipping' && <ShippingCard />}
      {activeTab === 'shiprocket' && <ShiprocketSettingsCard />}
      {activeTab === 'payments' && <PaymentSettingsCard />}
      {activeTab === 'support' && <ContactSupportSettingsCard />}
      {activeTab === 'hero' && <HeroManager />}
      {activeTab === 'announcement' && <AnnouncementCard />}
      {activeTab === 'faq' && <FaqCard />}
      {activeTab === 'social' && <SocialCard />}
      {activeTab === 'newsletter' && <NewsletterCard />}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ Shipping */

/* ------------------------------------------------------------------ Shipping */

interface TierRow {
  minRupees: string;
  maxRupees: string;
  chargeRupees: string;
}

function ShippingCard() {
  const { data, isLoading } = useShippingRate();
  const setRate = useSetShippingRate();
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [synced, setSynced] = useState(false);

  // Sync initial tiers from backend
  if (data && !synced) {
    setSynced(true);
    if (data.tiers && data.tiers.length > 0) {
      setTiers(
        data.tiers.map((t) => ({
          minRupees: (t.minSubtotalMinor / 100).toString(),
          maxRupees: t.maxSubtotalMinor != null ? (t.maxSubtotalMinor / 100).toString() : '',
          chargeRupees: (t.amountMinor / 100).toString(),
        })),
      );
    } else {
      setTiers([
        {
          minRupees: '0',
          maxRupees: '',
          chargeRupees: (data.amountMinor / 100).toString(),
        },
      ]);
    }
  }

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const prevMax = last ? Number(last.maxRupees || last.minRupees || 0) : 0;
    const nextMin = prevMax > 0 ? (prevMax + 1).toString() : '500';
    setTiers([...tiers, { minRupees: nextMin, maxRupees: '', chargeRupees: '0' }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) {
      toast.error('You must keep at least one shipping slab.');
      return;
    }
    setTiers(tiers.filter((_, idx) => idx !== index));
  };

  const updateTier = (index: number, patch: Partial<TierRow>) => {
    setTiers(tiers.map((t, idx) => (idx === index ? { ...t, ...patch } : t)));
  };

  const applyPreset = (preset: 'freeOver1000' | 'freeOver500' | 'flat50' | 'freeAll') => {
    if (preset === 'freeOver1000') {
      setTiers([
        { minRupees: '0', maxRupees: '499', chargeRupees: '60' },
        { minRupees: '500', maxRupees: '999', chargeRupees: '30' },
        { minRupees: '1000', maxRupees: '', chargeRupees: '0' },
      ]);
    } else if (preset === 'freeOver500') {
      setTiers([
        { minRupees: '0', maxRupees: '499', chargeRupees: '40' },
        { minRupees: '500', maxRupees: '', chargeRupees: '0' },
      ]);
    } else if (preset === 'flat50') {
      setTiers([{ minRupees: '0', maxRupees: '', chargeRupees: '50' }]);
    } else if (preset === 'freeAll') {
      setTiers([{ minRupees: '0', maxRupees: '', chargeRupees: '0' }]);
    }
  };

  const handleSave = () => {
    const payloadTiers = tiers.map((t) => ({
      minSubtotalMinor: Math.round(Number(t.minRupees || 0) * 100),
      maxSubtotalMinor: t.maxRupees.trim() !== '' ? Math.round(Number(t.maxRupees) * 100) : null,
      amountMinor: Math.round(Number(t.chargeRupees || 0) * 100),
    }));

    setRate.mutate(
      { tiers: payloadTiers },
      {
        onSuccess: () => toast.success('Shipping rates saved successfully'),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="size-4 text-primary-button" />
              Delivery &amp; Shipping Charges
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configure order subtotal slabs and flexible delivery fees (or Free Delivery).
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-[11px] h-7"
              onClick={() => applyPreset('freeOver1000')}
            >
              <Sparkles className="size-3 mr-1 text-amber-500" />
              Free over ₹1,000
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-[11px] h-7"
              onClick={() => applyPreset('freeOver500')}
            >
              Free over ₹500
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-[11px] h-7"
              onClick={() => applyPreset('freeAll')}
            >
              100% Free
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_40px] gap-3 text-xs font-semibold text-muted-foreground px-1">
                <span>Min Order Subtotal (₹)</span>
                <span>Max Order Subtotal (₹)</span>
                <span>Shipping Fee (₹)</span>
                <span></span>
              </div>

              {tiers.map((t, idx) => {
                const isFree = Number(t.chargeRupees || 0) === 0;

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr_40px] gap-2.5 sm:gap-3 p-3 sm:p-2.5 rounded-sm border bg-card items-center"
                  >
                    <div className="w-full">
                      <Label className="sm:hidden text-[11px] text-muted-foreground mb-1 block">
                        Min Order Subtotal (₹)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={t.minRupees}
                          onChange={(e) => updateTier(idx, { minRupees: e.target.value })}
                          className="pl-6 h-9 text-xs"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex items-center justify-between sm:hidden mb-1">
                        <Label className="text-[11px] text-muted-foreground">Max Order Subtotal (₹)</Label>
                        <span className="text-[10px] text-muted-foreground">(leave empty for no limit)</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={t.maxRupees}
                          onChange={(e) => updateTier(idx, { maxRupees: e.target.value })}
                          className="pl-6 h-9 text-xs"
                          placeholder="No upper limit (∞)"
                        />
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex items-center justify-between sm:hidden mb-1">
                        <Label className="text-[11px] text-muted-foreground">Shipping Fee (₹)</Label>
                        {isFree && (
                          <span className="text-[10px] font-bold text-[#7EC151]">FREE</span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={t.chargeRupees}
                          onChange={(e) => updateTier(idx, { chargeRupees: e.target.value })}
                          className="pl-6 h-9 text-xs"
                          placeholder="0 (Free)"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(idx)}
                        disabled={tiers.length <= 1}
                        aria-label="Remove slab"
                        className="size-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTier}
              className="text-xs font-semibold gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Shipping Slab
            </Button>

            {/* Live Customer Preview */}
            <div className="rounded-sm border border-[#117a7a]/20 bg-[#117a7a]/5 p-3.5 space-y-2 text-xs">
              <p className="font-bold text-[#117a7a] flex items-center gap-1.5">
                <Truck className="size-3.5" />
                Customer Checkout Preview:
              </p>
              <div className="divide-y divide-[#117a7a]/15 text-muted-foreground">
                {tiers.map((t, idx) => {
                  const min = Number(t.minRupees || 0);
                  const max = t.maxRupees.trim() !== '' ? Number(t.maxRupees) : null;
                  const charge = Number(t.chargeRupees || 0);

                  return (
                    <div key={idx} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                      <span>
                        Orders {max != null ? `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}` : `₹${min.toLocaleString('en-IN')} and above`}:
                      </span>
                      <span className={charge === 0 ? 'font-bold text-[#7EC151]' : 'font-semibold text-foreground'}>
                        {charge === 0 ? 'FREE Delivery' : `₹${charge.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={setRate.isPending || isLoading}
            className="font-bold text-xs uppercase tracking-wider"
          >
            {setRate.isPending ? 'Saving Rates…' : 'Save Shipping Slabs'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- Hero banners */

function HeroManager() {
  const { data: hero, isLoading } = useHero();
  const create = useCreateHero();
  const update = useUpdateHero();
  const reorder = useReorderHero();
  const del = useDeleteHero();
  const setAspect = useSetHeroAspect();
  const banners = hero?.banners;

  const [items, setItems] = useState<HeroBanner[]>([]);
  const [sig, setSig] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<HeroBanner | null>(null);
  const [aw, setAw] = useState('8');
  const [ah, setAh] = useState('3');
  const [aspectSynced, setAspectSynced] = useState(false);
  const dragIndex = useRef<number | null>(null);

  // Seed/refresh the local ordered copy whenever the set of banners changes.
  const nextSig = JSON.stringify(banners ?? []);
  if (banners && nextSig !== sig) {
    setSig(nextSig);
    setItems(banners);
  }
  // Seed the shared aspect ratio once from the config.
  if (hero && !aspectSynced) {
    setAspectSynced(true);
    setAw(String(hero.aspectWidth));
    setAh(String(hero.aspectHeight));
  }

  const ratioW = Number(aw) || 8;
  const ratioH = Number(ah) || 3;

  function onDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setItems(next);
    setSig(JSON.stringify(next));
    reorder.mutate(
      next.map((b) => b.id),
      { onError: (e) => toast.error((e as Error).message) },
    );
  }

  async function remove(id: string) {
    if (!(await confirm({ title: 'Remove this banner?', confirmText: 'Remove', destructive: true }))) return;
    del.mutate(id, {
      onSuccess: () => toast.success('Banner removed'),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <div className="space-y-4">
      {/* Shared aspect ratio for all banners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aspect ratio (all banners)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Input type="number" min={1} value={aw} onChange={(e) => setAw(e.target.value)} className="w-24" aria-label="Aspect width" />
            <span className="text-muted-foreground">×</span>
            <Input type="number" min={1} value={ah} onChange={(e) => setAh(e.target.value)} className="w-24" aria-label="Aspect height" />
          </div>
          <Button
            size="sm"
            onClick={() =>
              setAspect.mutate(
                { aspectWidth: ratioW, aspectHeight: ratioH },
                { onSuccess: () => toast.success('Ratio saved'), onError: (e: Error) => toast.error(e.message) },
              )
            }
            disabled={setAspect.isPending}
          >
            {setAspect.isPending ? 'Saving…' : 'Save ratio'}
          </Button>
          <p className="w-full text-xs text-muted-foreground">Applies to every hero banner (default 8 × 3).</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Drag to reorder — shown as a carousel on the homepage.</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>Add banner</Button>
      </div>

      <Card>
        <CardContent className="space-y-2 p-3">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !items.length ? (
            <p className="p-4 text-sm text-muted-foreground">
              No banners yet — a default image shows on the homepage. Add one (or more, for a carousel).
            </p>
          ) : (
            items.map((b, i) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className="flex items-center gap-3 rounded-sm border bg-card p-2"
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">
                  {b.imageUrl && (
                    <Image src={mediaSrc(b.imageUrl)} alt="" width={80} height={48} unoptimized className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate font-medium">{b.linkUrl}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(b)} aria-label="Edit banner">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(b.id)} disabled={del.isPending} aria-label="Remove banner">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {addOpen && (
        <BannerDialog
          saving={create.isPending}
          aspectWidth={ratioW}
          aspectHeight={ratioH}
          onClose={() => setAddOpen(false)}
          onSave={(d) =>
            create.mutate(d, {
              onSuccess: () => {
                toast.success('Banner added');
                setAddOpen(false);
              },
              onError: (e) => toast.error((e as Error).message),
            })
          }
        />
      )}
      {editing && (
        <BannerDialog
          initial={editing}
          saving={update.isPending}
          aspectWidth={ratioW}
          aspectHeight={ratioH}
          onClose={() => setEditing(null)}
          onSave={(d) =>
            update.mutate(
              { id: editing.id, ...d },
              {
                onSuccess: () => {
                  toast.success('Banner updated');
                  setEditing(null);
                },
                onError: (e) => toast.error((e as Error).message),
              },
            )
          }
        />
      )}
    </div>
  );
}

/** Add/edit dialog. The image is uploaded only on submit, so an accidental
 * refresh before saving never leaves an orphaned upload. */
function BannerDialog({
  initial, onClose, onSave, saving, aspectWidth, aspectHeight,
}: {
  initial?: HeroBanner;
  onClose: () => void;
  onSave: (d: Partial<Omit<HeroBanner, 'id'>> & { imageUrl: string }) => void;
  saving: boolean;
  aspectWidth: number;
  aspectHeight: number;
}) {
  const upload = useUploadProductImage();
  const { data: adminProducts } = useAdminProducts();
  const { data: attributes } = useAdminAttributes();

  const attrMap = useMemo(() => {
    const m = new Map<string, string>();
    (attributes ?? []).forEach((t) => {
      t.values.forEach((v) => m.set(v.id, v.value));
    });
    return m;
  }, [attributes]);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initial?.imageUrl ? mediaSrc(initial.imageUrl) : null,
  );
  const [mobFile, setMobFile] = useState<File | null>(null);
  const [mobPreview, setMobPreview] = useState<string | null>(
    initial?.mobileImageUrl ? mediaSrc(initial.mobileImageUrl) : null,
  );
  const [title, setTitle] = useState(initial?.title ?? 'EXPLORE');
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? 'COLLECTION');
  const [tags, setTags] = useState((initial?.categoryTags ?? []).join(', '));
  const [link, setLink] = useState(initial?.linkUrl ?? '/shop');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initial?.productIds ?? [],
  );
  const [productSearch, setProductSearch] = useState('');
  const [busy, setBusy] = useState(false);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  function pickMobFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMobFile(f);
    setMobPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function submit() {
    if (!file && !initial?.imageUrl) return toast.error('Choose a desktop background image first');
    setBusy(true);
    try {
      let imageUrl = initial?.imageUrl ?? '';
      if (file) {
        const { url } = await upload.mutateAsync(file);
        imageUrl = url;
      }

      let mobileImageUrl = initial?.mobileImageUrl ?? null;
      if (mobFile) {
        const { url } = await upload.mutateAsync(mobFile);
        mobileImageUrl = url;
      }

      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      onSave({
        imageUrl,
        mobileImageUrl,
        title: title.trim() || 'EXPLORE',
        subtitle: subtitle.trim() || 'COLLECTION',
        categoryTags: parsedTags,
        productIds: selectedProductIds,
        linkUrl: link.trim() || '/shop',
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Flatten all products & variants (both listed and unlisted)
  const selectableItems: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    priceMinor: number;
    badge: 'Product' | 'Listed' | 'Unlisted';
  }> = [];

  for (const p of adminProducts ?? []) {
    const cleanProductName = (p.name || '').replace(/\{[^}]+\}/g, '').trim() || p.name;

    if (!p.variants || p.variants.length === 0) {
      selectableItems.push({
        id: p.id,
        name: cleanProductName,
        imageUrl: p.imageUrl,
        priceMinor: p.offerPriceMinor ?? p.priceMinor,
        badge: 'Product',
      });
    } else {
      for (const v of p.variants) {
        // Resolve product name template: substitute {key} with variant's customVariable value
        let resolvedName = p.name ?? '';
        for (const [key, val] of Object.entries(v.customVariables ?? {})) {
          resolvedName = resolvedName.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
        }
        resolvedName = resolvedName.replace(/\{[^}]+\}/g, '').replace(/\s{2,}/g, ' ').trim();

        // Attribute option values as secondary info
        const attrValues = (v.valueIds ?? [])
          .map((id) => attrMap.get(id))
          .filter(Boolean) as string[];
        const secondaryPart = attrValues.join(' / ');

        const displayName = secondaryPart
          ? `${resolvedName} – ${secondaryPart}`
          : resolvedName;

        selectableItems.push({
          id: v.id,
          name: `${displayName}${v.sku ? ` (${v.sku})` : ''}`,
          imageUrl: v.images?.[0] || p.imageUrl,
          priceMinor: v.offerPriceMinor ?? v.priceMinor ?? p.priceMinor,
          badge: v.listedSeparately ? 'Listed' : 'Unlisted',
        });
      }
    }
  }

  const filteredItems = selectableItems.filter((item) =>
    item.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="md:max-w-2xl md:p-6">
        <DrawerHeader>
          <DrawerTitle>{initial ? 'Edit hero collection' : 'Add hero collection'}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4">
          {/* Desktop Preview */}
          <div>
            <Label className="text-xs font-semibold">Desktop Background Preview</Label>
            <div
              className="relative w-full mt-1.5 overflow-hidden rounded-sm border bg-muted"
              style={{ aspectRatio: `${aspectWidth} / ${aspectHeight}` }}
            >
              {preview ? (
                <Image src={preview} alt="Banner preview" width={800} height={450} unoptimized className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">Desktop Preview</div>
              )}
            </div>
          </div>

          {/* Desktop Image Picker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bf-file">Desktop Background Image</Label>
              {initial?.imageUrl && !file && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                  Current: {initial.imageUrl.split('/').pop()}
                </span>
              )}
            </div>
            <Input id="bf-file" type="file" accept="image/*" onChange={pickFile} />
          </div>

          {/* Mobile Image Picker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bf-mob-file">Mobile Background Image (Optional)</Label>
              {initial?.mobileImageUrl && !mobFile && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                  Current: {initial.mobileImageUrl.split('/').pop()}
                </span>
              )}
            </div>
            <Input id="bf-mob-file" type="file" accept="image/*" onChange={pickMobFile} />
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-title">Title</Label>
              <Input id="bf-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="EXPLORE" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-subtitle">Collection / Subtitle</Label>
              <Input id="bf-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="BOTTOMS" />
            </div>
          </div>

          {/* Category Tags */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bf-tags">Category Tags (comma-separated)</Label>
            <Input id="bf-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="JOGGERS, JEANS, PANTS" />
          </div>

          {/* Click-through link */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bf-link">Click-through link</Label>
            <Input id="bf-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/shop?category=bottoms" />
          </div>

          {/* Linked Products */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Linked Variants & Products (3 on desktop, 4 on mobile)</Label>
              <span className="text-xs font-medium text-primary">
                Selected: {selectedProductIds.length}
              </span>
            </div>
            <Input
              placeholder="Search by product or variant SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto divide-y rounded border bg-muted/20">
              {filteredItems.map((item) => {
                const checked = selectedProductIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleProduct(item.id)}
                    className={`flex w-full items-center gap-3 p-2 text-left text-xs transition-colors hover:bg-muted ${
                      checked ? 'bg-primary/10 font-semibold' : ''
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleProduct(item.id)}
                      className="rounded-sm"
                    />
                    <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted border">
                      {item.imageUrl && (
                        <Image
                          src={mediaSrc(item.imageUrl)}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                            item.badge === 'Listed'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : item.badge === 'Unlisted'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {item.badge}
                        </span>
                        <span className="text-muted-foreground font-mono">{money(item.priceMinor)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t mt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || saving}>
            {busy || saving ? 'Saving…' : initial ? 'Save' : 'Add'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ------------------------------------------------------------- Announcement */

function AnnouncementCard() {
  const { data } = useAnnouncement();
  const save = useSetAnnouncement();
  const [text, setText] = useState('');
  const [active, setActive] = useState(true);
  const [synced, setSynced] = useState(false);

  if (data && !synced) {
    setSynced(true);
    setText(data.messages.join('\n'));
    setActive(data.active);
  }

  function submit() {
    const messages = text.split('\n').map((s) => s.trim()).filter(Boolean);
    save.mutate(
      { messages, active },
      {
        onSuccess: () => toast.success('Saved'),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Announcement bar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <Checkbox checked={active} onCheckedChange={setActive} className="rounded-sm" />
          <span>Show the announcement bar</span>
        </label>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ann-msgs">Messages (one per line)</Label>
          <Textarea
            id="ann-msgs"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Free shipping over ₹4,999\nFestive sale — up to 40% off'}
          />
          <p className="text-xs text-muted-foreground">They scroll as a marquee. Leave empty (or turn off) to hide the bar.</p>
        </div>

        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------------- FAQ */

function FaqCard() {
  const { data: content } = useContent();
  const save = useSetContent();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [synced, setSynced] = useState(false);

  if (content && !synced) {
    setSynced(true);
    setFaqs(content.faqs ?? []);
  }

  const setAt = (i: number, patch: Partial<FaqItem>) =>
    setFaqs((list) => list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  function submit() {
    const cleaned = faqs
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question && f.answer);
    save.mutate(
      { faqs: cleaned },
      { onSuccess: () => toast.success('FAQ saved'), onError: (e) => toast.error((e as Error).message) },
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">FAQ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {faqs.length === 0 && <p className="text-sm text-muted-foreground">No questions yet — add one below.</p>}

        {faqs.map((f, i) => (
          <div key={i} className="space-y-2 rounded-sm border p-3">
            <div className="flex items-center gap-2">
              <Input value={f.question} onChange={(e) => setAt(i, { question: e.target.value })} placeholder="Question" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove question"
                onClick={() => setFaqs((list) => list.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea rows={3} value={f.answer} onChange={(e) => setAt(i, { answer: e.target.value })} placeholder="Answer" />
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFaqs((l) => [...l, { question: '', answer: '' }])}>
            Add question
          </Button>
          <Button size="sm" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ Social links */

function SocialCard() {
  const { data: content } = useContent();
  const save = useSetContent();
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [synced, setSynced] = useState(false);

  if (content && !synced) {
    setSynced(true);
    setSocials(content.socials ?? []);
  }

  const setAt = (i: number, patch: Partial<SocialLink>) =>
    setSocials((list) => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  function submit() {
    const cleaned = socials
      .map((s) => ({ label: s.label.trim(), url: s.url.trim() }))
      .filter((s) => s.label && s.url);
    save.mutate(
      { socials: cleaned },
      { onSuccess: () => toast.success('Social links saved'), onError: (e) => toast.error((e as Error).message) },
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Social links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {socials.length === 0 && <p className="text-sm text-muted-foreground">No links yet — add one below.</p>}

        {socials.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="w-40 shrink-0" value={s.label} onChange={(e) => setAt(i, { label: e.target.value })} placeholder="Label (e.g. Instagram)" />
            <Input value={s.url} onChange={(e) => setAt(i, { url: e.target.value })} placeholder="https://…" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove link"
              onClick={() => setSocials((list) => list.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSocials((l) => [...l, { label: '', url: '' }])}>
            Add link
          </Button>
          <Button size="sm" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- Newsletter */

function NewsletterCard() {
  const { data: subs, isLoading } = useSubscribers();
  const broadcast = useBroadcast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const active = (subs ?? []).filter((s) => s.status === 'active');

  function send() {
    if (subject.trim().length < 2 || body.trim().length < 2) {
      return toast.error('Add a subject and message');
    }
    const html = body
      .split('\n')
      .map((line) => `<p>${line.replace(/</g, '&lt;')}</p>`)
      .join('');
    broadcast.mutate(
      { subject: subject.trim(), html },
      {
        onSuccess: (r) => {
          toast.success(`Sent to ${r.sent} of ${r.total} subscribers`);
          setSubject('');
          setBody('');
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send a broadcast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-subject">Subject</Label>
            <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="New arrivals just dropped 🎉" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-body">Message</Label>
            <Textarea id="nl-body" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'Hi there,\n\nCheck out our latest products…'} />
            <p className="text-xs text-muted-foreground">
              Sends to {active.length} active subscriber{active.length === 1 ? '' : 's'}. An unsubscribe link is added automatically.
            </p>
          </div>
          <Button onClick={send} disabled={broadcast.isPending || active.length === 0}>
            {broadcast.isPending ? 'Sending…' : 'Send broadcast'}
          </Button>

          <div className="border-t pt-4">
            <AnnounceProduct disabled={active.length === 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Subscribers{subs ? ` (${active.length} active / ${subs.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !subs?.length ? (
            <p className="text-sm text-muted-foreground">No subscribers yet.</p>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto text-sm">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 border-b py-1.5 last:border-0">
                  <span className={cn('truncate', s.status === 'unsubscribed' && 'text-muted-foreground line-through')}>{s.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Email active subscribers a "new arrival" for a chosen product. */
function AnnounceProduct({ disabled }: { disabled?: boolean }) {
  const { data: products } = useAdminProducts();
  const notify = useNotifyProduct();
  const [productId, setProductId] = useState('');

  function send() {
    if (!productId) return toast.error('Pick a product');
    notify.mutate(productId, {
      onSuccess: (r) => toast.success(`Sent to ${r.sent} of ${r.total} subscribers`),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="nl-product">Announce a product (new arrival)</Label>
      <div className="flex gap-2">
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger id="nl-product" className="min-w-0 flex-1">
            <SelectValue placeholder="Select a product…" />
          </SelectTrigger>
          <SelectContent>
            {(products ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={send} disabled={notify.isPending || disabled || !productId}>
          {notify.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- Payments */

function PaymentSettingsCard() {
  const { data: content, isLoading } = useContent();
  const save = useSetContent();
  const [codEnabled, setCodEnabled] = useState(false);
  const [synced, setSynced] = useState(false);

  if (content && !synced) {
    setSynced(true);
    setCodEnabled(Boolean(content.codEnabled));
  }

  function submit() {
    save.mutate(
      { codEnabled },
      {
        onSuccess: () => toast.success('Payment settings updated successfully'),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="size-4 text-primary-button" />
          Payment Options
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Manage accepted payment methods across your storefront.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-4">
            {/* Online Payment Card (Always active) */}
            <div className="flex items-start justify-between p-4 rounded-sm border bg-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Online Payments (Cashfree)</span>
                  <span className="rounded-sm bg-emerald-500/15 text-emerald-600 px-1.5 py-0.2 text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-muted-foreground max-w-md">
                  UPI, Debit/Credit Cards, NetBanking, and Wallets via Cashfree payment gateway.
                </p>
              </div>
            </div>

            {/* Cash on Delivery Toggle */}
            <div className="p-4 sm:p-5 rounded-sm border bg-card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-bold text-sm text-foreground">Cash on Delivery (COD)</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase shrink-0',
                      codEnabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground border border-border/60',
                    )}
                  >
                    {codEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0" aria-label="Toggle Cash on Delivery">
                  <input
                    type="checkbox"
                    checked={codEnabled}
                    onChange={(e) => setCodEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#117a7a]"></div>
                </label>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Allow customers to place orders without immediate digital payment and pay in cash when the order arrives.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={submit}
                disabled={save.isPending || isLoading}
                className="w-full sm:w-auto font-bold text-xs uppercase tracking-wider"
              >
                {save.isPending ? 'Saving…' : 'Save Payment Settings'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------- Contact Support */

function ContactSupportSettingsCard() {
  const { data: content, isLoading } = useContent();
  const save = useSetContent();
  const [enabled, setEnabled] = useState(true);
  const [savedValue, setSavedValue] = useState<boolean | null>(null);
  const [attachmentsEnabled, setAttachmentsEnabled] = useState(true);
  const [savedAttachmentsValue, setSavedAttachmentsValue] = useState<boolean | null>(null);
  const [synced, setSynced] = useState(false);

  if (content && !synced) {
    setSynced(true);
    const initialSupport = content.contactSupportEnabled !== false;
    const initialAttach = content.chatAttachmentsEnabled !== false;
    setEnabled(initialSupport);
    setSavedValue(initialSupport);
    setAttachmentsEnabled(initialAttach);
    setSavedAttachmentsValue(initialAttach);
  }

  const currentSavedSupport = savedValue ?? (content ? content.contactSupportEnabled !== false : true);
  const currentSavedAttach = savedAttachmentsValue ?? (content ? content.chatAttachmentsEnabled !== false : true);
  const hasChanged = synced && (enabled !== currentSavedSupport || attachmentsEnabled !== currentSavedAttach);

  function submit() {
    save.mutate(
      {
        contactSupportEnabled: enabled,
        chatAttachmentsEnabled: attachmentsEnabled,
      },
      {
        onSuccess: () => {
          setSavedValue(enabled);
          setSavedAttachmentsValue(attachmentsEnabled);
          toast.success('Support and chat settings updated');
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Headphones className="size-4 text-[#187b7b]" />
          Contact Support & Live Chat
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Manage storefront customer support availability, live chat visibility, and attachment permissions.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-4">
            {/* Storefront Contact Support Toggle */}
            <div className="p-4 sm:p-5 rounded-sm border bg-card space-y-3">
              {/* Header row: Title + Status Badge on left, Toggle Switch on right */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-bold text-sm text-foreground">Storefront Contact Support</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase shrink-0',
                      enabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground border border-border/60',
                    )}
                  >
                    {enabled ? 'ACTIVE' : 'REMOVED / DISABLED'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0" aria-label="Toggle Storefront Contact Support">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#187b7b]"></div>
                </label>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, customers see the floating live chat widget and greeting bubble in the bottom right corner of the storefront. When disabled, the contact support widget is completely removed and hidden from all customer pages.
              </p>
            </div>

            {/* Customer Media Attachments Toggle */}
            <div className="p-4 sm:p-5 rounded-sm border bg-card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-bold text-sm text-foreground">Customer Media Attachments</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase shrink-0',
                      attachmentsEnabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground border border-border/60',
                    )}
                  >
                    {attachmentsEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0" aria-label="Toggle Customer Media Attachments">
                  <input
                    type="checkbox"
                    checked={attachmentsEnabled}
                    onChange={(e) => setAttachmentsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#187b7b]"></div>
                </label>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, customers can attach photos and videos in storefront customer support chats. When disabled, customers cannot add attachments on the storefront. Administrators can always send attachments in admin messages.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={submit}
                disabled={save.isPending || isLoading || !hasChanged}
                className="w-full sm:w-auto font-bold text-xs uppercase tracking-wider bg-[#187b7b] hover:bg-[#136363] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {save.isPending ? 'Saving…' : 'Save Support Settings'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

