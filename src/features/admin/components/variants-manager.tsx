'use client';

import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AdminProduct, AdminVariant, AttributeType } from '@/lib/types';
import { mediaSrc, money } from '@/lib/utils';
import { useAdminAttributes } from '../hooks/use-admin-attributes';
import { useAddVariant, useDeleteVariant, useUpdateVariant } from '../hooks/use-admin-products';
import { ImageManager } from './image-manager';

const toPaise = (rupees: string) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise: number) => (paise / 100).toFixed(2);

interface AttrRow {
  typeId: string;
  valueId: string;
}

/** valueIds -> [{ typeId, valueId }] rows so the picker can prefill on edit. */
function rowsFromValueIds(valueIds: string[], attributes: AttributeType[]): AttrRow[] {
  const rows: AttrRow[] = [];
  for (const t of attributes) {
    const match = t.values.find((v) => valueIds.includes(v.id));
    if (match) rows.push({ typeId: t.id, valueId: match.id });
  }
  return rows;
}

/** First unused attribute type, pre-selected with its first value (or null). */
function nextRow(attributes: AttributeType[], usedTypeIds: string[]): AttrRow | null {
  const type = attributes.find((t) => !usedTypeIds.includes(t.id));
  return type ? { typeId: type.id, valueId: type.values[0]?.id ?? '' } : null;
}

export function VariantsManager({ product }: { product: AdminProduct }) {
  const { data: attributes } = useAdminAttributes();
  const delVariant = useDeleteVariant();

  const label = useMemo(() => {
    const m = new Map<string, string>();
    (attributes ?? []).forEach((t) => t.values.forEach((v) => m.set(v.id, `${t.name}: ${v.value}`)));
    return m;
  }, [attributes]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {product.variants.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
            {v.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(v.images[0])} alt="" className="size-10 shrink-0 rounded-md border object-cover" />
            )}
            <span className="flex flex-wrap gap-1">
              {v.valueIds.map((id) => (
                <span key={id} className="rounded bg-muted px-1.5 py-0.5 text-xs">{label.get(id) ?? id.slice(0, 6)}</span>
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
            {v.images.length > 1 && <span className="text-xs text-muted-foreground">· {v.images.length} imgs</span>}
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
        ))}
        {product.variants.length === 0 && (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            No variants — this product sells at its base price and stock.
          </p>
        )}
      </div>

      <VariantDialog
        product={product}
        trigger={<Button type="button" variant="outline" size="sm"><Plus className="size-4" /> Add variant</Button>}
      />
    </div>
  );
}

/** Add or edit a variant in a dialog: attributes, price/stock/sku, images, flags. */
function VariantDialog({
  product,
  variant,
  trigger,
}: {
  product: AdminProduct;
  variant?: AdminVariant;
  trigger: React.ReactNode;
}) {
  const { data: attributes } = useAdminAttributes();
  const add = useAddVariant();
  const update = useUpdateVariant();
  const isEdit = !!variant;

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AttrRow[]>([]);
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [sku, setSku] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [listedSeparately, setListedSeparately] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  // Reset the form from the variant (or defaults) each time the dialog opens.
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
      setListedSeparately(variant?.listedSeparately ?? false);
      setIsDefault(variant?.isDefault ?? false);
    }
    setOpen(next);
  }

  async function save() {
    const valueIds = rows.map((r) => r.valueId).filter(Boolean);
    if (!valueIds.length) return toast.error('Pick at least one attribute value');
    const body = {
      valueIds,
      priceMinor: toPaise(price),
      offerPriceMinor:
        offerPrice.trim() === '' ? (isEdit ? null : undefined) : toPaise(offerPrice),
      stock: Number(stock) || 0,
      sku: sku.trim() || undefined,
      images,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit variant' : 'Add variant'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Attributes</Label>
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
                    <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {attributes?.filter((t) => !usedTypeIds.includes(t.id)).map((t) => (
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
                    <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Value" /></SelectTrigger>
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
                className="w-fit"
                onClick={() => setRows((rs) => {
                  const r = nextRow(attributes ?? [], rs.map((x) => x.typeId));
                  return r ? [...rs, r] : rs;
                })}
              >
                <Plus className="size-4" /> Add attribute
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label className="text-xs">Price (₹)</Label><Input type="number" step="0.01" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label className="text-xs">Offer price (₹) <span className="text-muted-foreground">(optional)</span></Label><Input type="number" step="0.01" min={0} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="Discounted" /></div>
            <div className="flex flex-col gap-1.5"><Label className="text-xs">Stock</Label><Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label className="text-xs">SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs">Images</Label>
            <ImageManager value={images} onChange={setImages} />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={listedSeparately} onChange={(e) => setListedSeparately(e.target.checked)} /> List on shop</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default variant</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : isEdit ? 'Save variant' : 'Add variant'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
