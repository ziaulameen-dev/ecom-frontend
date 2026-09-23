'use client';

import { Info, Pencil, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AdminProduct, AdminVariant, AttributeType } from '@/lib/types';
import { mediaSrc, money } from '@/lib/utils';
import { useAdminAttributes } from '../hooks/use-admin-attributes';
import { useAddVariant, useDeleteVariant, useUpdateVariant } from '../hooks/use-admin-products';
import { ImageManager } from './image-manager';

const toPaise = (rupees: string) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise: number) => (paise / 100).toFixed(2);

function isVideoUrl(url: string) {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return /\.(mp4|webm|mov|mkv|avi|ogv|3gp|m4v)$/i.test(clean);
}

interface AttrRow {
  typeId: string;
  valueId: string;
}

function rowsFromValueIds(valueIds: string[], attributes: AttributeType[]): AttrRow[] {
  const rows: AttrRow[] = [];
  for (const t of attributes) {
    const match = t.values.find((v) => valueIds.includes(v.id));
    if (match) rows.push({ typeId: t.id, valueId: match.id });
  }
  return rows;
}

function nextRow(attributes: AttributeType[], usedTypeIds: string[]): AttrRow | null {
  const type = attributes.find((t) => !usedTypeIds.includes(t.id));
  return type ? { typeId: type.id, valueId: type.values[0]?.id ?? '' } : null;
}

export function VariantsManager({ product }: { product: AdminProduct }) {
  const { data: attributes } = useAdminAttributes();
  const delVariant = useDeleteVariant();
  const searchParams = useSearchParams();
  const shouldAutoOpen = searchParams?.get('addVariant') === 'true';

  const label = useMemo(() => {
    const m = new Map<string, string>();
    (attributes ?? []).forEach((t) => t.values.forEach((v) => m.set(v.id, `${t.name}: ${v.value}`)));
    return m;
  }, [attributes]);

  return (
    <div className="space-y-4">
      {/* Documentation & Guide Box for Admin Panel Variant Creation */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
          <Info className="size-4 text-blue-600 shrink-0" />
          <span>Guide: Creating & Managing Product Variants</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 leading-relaxed text-blue-900/90">
          <li><strong>Variant Options:</strong> Select attributes like Size or Color. Any attribute type name containing <em>"size"</em> (e.g. <code>Size</code>, <code>shirt-size</code>) will automatically render cleanly as <strong>"Size"</strong> on the storefront.</li>
          <li><strong>Size Charts:</strong> Manage size chart images and custom measurement tables directly on the <strong>Attributes Page</strong> (<code>/admin/attributes</code>).</li>
          <li><strong>Price & Stock:</strong> Specify the individual price and stock level per variant.</li>
        </ul>
      </div>

      <div className="space-y-2">
        {product.variants.map((v) => {
          // Resolve the product name template: substitute {key} with variant's customVariable value
          let resolvedName = product.name ?? '';
          for (const [key, val] of Object.entries(v.customVariables ?? {})) {
            resolvedName = resolvedName.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
          }
          resolvedName = resolvedName.replace(/\{[^}]+\}/g, '').replace(/\s{2,}/g, ' ').trim();

          // Attribute option values as secondary chips
          const attrChips = v.valueIds.map((id) => label.get(id)).filter(Boolean) as string[];

          return (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              {v.images[0] && (
                isVideoUrl(v.images[0]) ? (
                  <video src={mediaSrc(v.images[0])} className="size-10 shrink-0 rounded-md border object-cover" muted playsInline />
                ) : (
                  <Image src={mediaSrc(v.images[0])} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-md border object-cover" />
                )
              )}
              <span className="flex flex-wrap items-center gap-1">
                {/* Resolved name (template substituted) as primary label */}
                <span className="font-medium">{resolvedName}</span>
                {attrChips.map((chip, i) => (
                  <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-xs">{chip}</span>
                ))}
              </span>
              {v.sku && <span className="text-xs text-muted-foreground">SKU {v.sku}</span>}
              {v.offerPriceMinor != null ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">{money(v.offerPriceMinor)}</span>
                  <span className="text-xs text-muted-foreground line-through">{money(v.priceMinor)}</span>
                </span>
              ) : (
                <span className="font-medium">{money(v.priceMinor)}</span>
              )}
              <span className="text-xs text-muted-foreground">stock {v.stock}</span>
              {v.images.length > 0 && <span className="text-xs text-muted-foreground">· {v.images.length} media</span>}
              {v.isDefault && <Badge variant="secondary">default</Badge>}
              {v.listedSeparately && <Badge>listed</Badge>}
              <div className="ml-auto flex items-center gap-1">
                <VariantDialog
                  product={product}
                  variant={v}
                  trigger={<Button type="button" variant="ghost" size="icon" aria-label="Edit variant"><Pencil className="size-4" /></Button>}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  aria-label="Delete variant"
                  onClick={async () => { if (await confirm({ title: 'Delete variant?', description: 'This variant will be permanently removed.', confirmText: 'Delete', destructive: true })) delVariant.mutate(v.id); }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {product.variants.length === 0 && (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            No variants — this product sells at its base price and stock.
          </p>
        )}
      </div>

      <VariantDialog
        product={product}
        defaultOpen={shouldAutoOpen}
        trigger={<Button type="button" variant="outline" size="sm"><Plus className="size-4" /> Add variant</Button>}
      />
    </div>
  );
}

function VariantDialog({
  product,
  variant,
  trigger,
  defaultOpen = false,
}: {
  product: AdminProduct;
  variant?: AdminVariant;
  trigger: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const { data: attributes } = useAdminAttributes();
  const add = useAddVariant();
  const update = useUpdateVariant();
  const isEdit = !!variant;

  const [open, setOpen] = useState(defaultOpen);
  const [rows, setRows] = useState<AttrRow[]>([]);
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [sku, setSku] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [customVars, setCustomVars] = useState<{ key: string; value: string }[]>([]);
  const [listedSeparately, setListedSeparately] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      const initialRows = variant
        ? rowsFromValueIds(variant.valueIds, attributes ?? [])
        : ([nextRow(attributes ?? [], [])].filter(Boolean) as AttrRow[]);
      setRows(initialRows);
      setPrice(toRupees(variant?.priceMinor ?? product.priceMinor));
      setOfferPrice(variant?.offerPriceMinor != null ? toRupees(variant.offerPriceMinor) : '');
      setStock(String(variant?.stock ?? 0));
      setSku(variant?.sku ?? '');
      setImages(variant?.images ?? []);

      const varsObj = variant?.customVariables ?? {};
      const varsArr = Object.entries(varsObj)
        .filter(([k]) => k !== 'size_chart' && k !== 'sizechart')
        .map(([key, value]) => ({ key, value }));
      setCustomVars(varsArr.length ? varsArr : [{ key: 'description', value: '' }]);

      setListedSeparately(variant?.listedSeparately ?? false);
      setIsDefault(variant?.isDefault ?? false);
    }
    setOpen(next);
  }

  async function save() {
    const valueIds = rows.map((r) => r.valueId).filter(Boolean);
    if (!valueIds.length) return toast.error('Pick at least one attribute value');

    const customVariables: Record<string, string> = {};
    for (const item of customVars) {
      if (item.key.trim() && item.value.trim()) {
        customVariables[item.key.trim().toLowerCase()] = item.value.trim();
      }
    }

    const body = {
      valueIds,
      priceMinor: toPaise(price),
      offerPriceMinor:
        offerPrice.trim() === '' ? (isEdit ? null : undefined) : toPaise(offerPrice),
      stock: Number(stock) || 0,
      sku: sku.trim() || undefined,
      images,
      customVariables,
      listedSeparately,
      isDefault,
    };
    try {
      if (isEdit && variant) {
        await update.mutateAsync({ id: variant.id, body });
        toast.success('Variant updated');
      } else {
        await add.mutateAsync({ productId: product.id, body });
        toast.success('Variant added');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const pending = add.isPending || update.isPending;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="md:p-6">
        <DrawerHeader>
          <DrawerTitle>{isEdit ? 'Edit variant' : 'Add variant'}</DrawerTitle>
        </DrawerHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold">Variant Options / Attributes</Label>
            {rows.map((row, idx) => {
              const type = attributes?.find((t) => t.id === row.typeId);
              const usedTypeIds = rows.filter((_, i) => i !== idx).map((r) => r.typeId);

              return (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={row.typeId || 'none'}
                    onValueChange={(v) =>
                      setRows((rs) => rs.map((r, i) => (i === idx ? { typeId: v === 'none' ? '' : v, valueId: '' } : r)))
                    }
                  >
                    <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Attribute (e.g. Size)" /></SelectTrigger>
                    <SelectContent>
                      {attributes?.filter((t) => !usedTypeIds.includes(t.id) || t.id === row.typeId).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={row.valueId || 'none'}
                    onValueChange={(v) =>
                      setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, valueId: v === 'none' ? '' : v } : r)))
                    }
                    disabled={!row.typeId}
                  >
                    <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Value (e.g. L)" /></SelectTrigger>
                    <SelectContent>
                      {(type?.values ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.value}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Button type="button" variant="ghost" size="icon" aria-label="Remove attribute" onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}>
                    <X className="size-4" />
                  </Button>
                </div>
              );
            })}

            {(attributes?.length ?? 0) > rows.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit text-xs"
                onClick={() => setRows((rs) => {
                  const r = nextRow(attributes ?? [], rs.map((x) => x.typeId));
                  return r ? [...rs, r] : rs;
                })}
              >
                <Plus className="size-4" /> Add Attribute
              </Button>
            )}
          </div>

          <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Variant Custom Variables / Content</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setCustomVars((cvs) => [...cvs, { key: '', value: '' }])}
              >
                <Plus className="size-3 mr-1" /> Add Variable
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Define content for this variant (e.g. key <code>description</code>, <code>care</code>, <code>material</code>). Placed in text as <code>{'{description}'}</code>.
            </p>

            <div className="space-y-2 pt-1">
              {customVars.map((cv, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Input
                    placeholder="Key (e.g. description)"
                    value={cv.key}
                    onChange={(e) =>
                      setCustomVars((cvs) => cvs.map((c, i) => (i === idx ? { ...c, key: e.target.value } : c)))
                    }
                    className="h-8 text-xs w-1/3"
                  />
                  <Textarea
                    placeholder="Content for this variant…"
                    value={cv.value}
                    rows={1}
                    onChange={(e) =>
                      setCustomVars((cvs) => cvs.map((c, i) => (i === idx ? { ...c, value: e.target.value } : c)))
                    }
                    className="min-h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setCustomVars((cvs) => cvs.filter((_, i) => i !== idx))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label className="text-xs">Price (₹)</Label><Input type="number" step="0.01" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label className="text-xs">Offer price (₹) <span className="text-muted-foreground">(optional)</span></Label><Input type="number" step="0.01" min={0} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="Discounted" /></div>
            <div className="flex flex-col gap-1.5"><Label className="text-xs">Stock</Label><Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label className="text-xs">SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-gray-900">
              Variant Images <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <ImageManager value={images} onChange={setImages} />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={listedSeparately} onCheckedChange={setListedSeparately} className="rounded-sm" />
              <span>List on shop</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={isDefault} onCheckedChange={setIsDefault} className="rounded-sm" />
              <span>Default variant</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : isEdit ? 'Save variant' : 'Add variant'}</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
