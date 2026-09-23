'use client';

import {
  ChevronDown, ChevronRight, ImagePlus, Info, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, X,
} from 'lucide-react';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddAttributeValue, useAdminAttributes, useCreateAttributeType,
  useDeleteAttributeType, useDeleteAttributeValue, useUpdateAttributeType,
  useUploadProductImage,
} from '@/features/admin';
import type { AttributeType } from '@/lib/types';
import { mediaSrc } from '@/lib/utils';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminAttributesPage() {
  const { data: types, isLoading } = useAdminAttributes();
  const [search, setSearch] = useState('');
  const [display, setDisplay] = useState<'all' | 'text' | 'swatch'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (types ?? []).filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.slug.includes(q)) return false;
      if (display !== 'all' && t.display !== display) return false;
      return true;
    });
  }, [types, search, display]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Attributes & Size Charts</h1>
          <p className="text-sm text-muted-foreground">{types?.length ?? 0} attribute types configured</p>
        </div>
        <AttributeDialog trigger={<Button><Plus className="size-4" /> Add Attribute</Button>} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search attributes (e.g. nike-shoe-size, shirt-size)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={display} onValueChange={(v) => setDisplay(v as typeof display)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="swatch">Swatch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Attribute</th>
                <th className="px-4 py-3 font-medium">Display</th>
                <th className="px-4 py-3 font-medium">Values</th>
                <th className="px-4 py-3 font-medium">Size Chart</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="px-4 py-3" colSpan={5}><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No attributes found.</td></tr>
              ) : (
                filtered.map((t) => <AttributeRow key={t.id} type={t} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AttributeRow({ type }: { type: AttributeType }) {
  const addValue = useAddAttributeValue();
  const delValue = useDeleteAttributeValue();
  const delType = useDeleteAttributeType();
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [color, setColor] = useState('#000000');

  async function add() {
    if (!value.trim()) return;
    try {
      await addValue.mutateAsync({
        typeId: type.id,
        body: { value: value.trim(), swatch: type.display === 'swatch' ? color : undefined },
      });
      setValue('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const hasSizeChart = Boolean(type.sizeChartImage || (type.sizeTableColumns?.length && type.sizeTableRows?.length));

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setExpanded((o) => !o)} className="text-muted-foreground hover:text-foreground" aria-label="Toggle values">
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
            <div className="min-w-0">
              <div className="truncate font-medium">{type.name}</div>
              <div className="truncate text-xs text-muted-foreground">/{type.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><Badge variant="secondary">{type.display}</Badge></td>
        <td className="px-4 py-3 text-muted-foreground">{type.values.length} values</td>
        <td className="px-4 py-3">
          {hasSizeChart ? (
            <div className="flex items-center gap-2">
              {type.sizeChartImage && (
                <div className="relative size-7 rounded border bg-muted overflow-hidden">
                  <Image src={mediaSrc(type.sizeChartImage)} alt="Chart" fill className="object-cover" />
                </div>
              )}
              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                Chart Set
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <AttributeDialog
                  type={type}
                  trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Pencil className="size-4" /> Edit Attribute</DropdownMenuItem>}
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => { if (await confirm({ title: 'Delete attribute?', description: `"${type.name}" and all its values will be removed.`, confirmText: 'Delete', destructive: true })) delType.mutate(type.id, { onError: (e) => toast.error((e as Error).message) }); }}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b bg-muted/20 last:border-0">
          <td colSpan={5} className="px-4 py-3">
            <div className="ml-6 space-y-3">
              <div className="flex flex-wrap gap-2">
                {type.values.map((v) => (
                  <span key={v.id} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs">
                    {v.swatch && <span className="size-3 rounded-full border" style={{ backgroundColor: v.swatch }} />}
                    {v.value}
                    <button type="button" onClick={() => delValue.mutate(v.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete value"><X className="size-3" /></button>
                  </span>
                ))}
                {type.values.length === 0 && <span className="text-xs text-muted-foreground">No values yet.</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Add a value"
                  className="h-9 w-40"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                />
                {type.display === 'swatch' && (
                  <Input type="color" className="h-9 w-12 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
                )}
                <Button type="button" size="sm" variant="outline" onClick={add} disabled={addValue.isPending}>
                  <Plus className="size-4" /> Add value
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** Add or edit an attribute type (name, slug, display, size chart image & table). */
function AttributeDialog({ type, trigger }: { type?: AttributeType; trigger: React.ReactNode }) {
  const create = useCreateAttributeType();
  const update = useUpdateAttributeType();
  const upload = useUploadProductImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!type;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [display, setDisplay] = useState<'text' | 'swatch'>('text');

  // Size Chart Image state
  const [sizeChartImage, setSizeChartImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Custom Size Table state
  const [colsText, setColsText] = useState<string>('Size, Chest (in), Length (in), Shoulder (in)');
  const [tableRows, setTableRows] = useState<string[][]>([]);

  // Only enable Size Chart section if attribute name or slug contains "size"
  const isSizeAttr = useMemo(() => {
    const text = (name + ' ' + slug).toLowerCase();
    return text.includes('size');
  }, [name, slug]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(type?.name ?? '');
      setSlug(type?.slug ?? '');
      setDisplay(type?.display ?? 'text');
      setSizeChartImage(type?.sizeChartImage ?? '');
      setColsText((type?.sizeTableColumns ?? ['Size', 'Chest (in)', 'Length (in)', 'Shoulder (in)']).join(', '));
      setTableRows(type?.sizeTableRows ?? []);
    }
    setOpen(next);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      return toast.error('Please select a valid image file');
    }
    try {
      setIsUploading(true);
      const res = await upload.mutateAsync(file);
      setSizeChartImage(res.url);
      toast.success('Size chart image uploaded to MinIO!');
    } catch (err) {
      toast.error((err as Error).message || 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  const columns = useMemo(() => {
    return colsText.split(',').map((c) => c.trim()).filter(Boolean);
  }, [colsText]);

  function addRow() {
    const emptyRow = columns.map(() => '');
    setTableRows((prev) => [...prev, emptyRow]);
  }

  function updateTableCell(rIdx: number, cIdx: number, val: string) {
    setTableRows((prev) =>
      prev.map((row, i) => (i === rIdx ? row.map((cell, j) => (j === cIdx ? val : cell)) : row))
    );
  }

  function removeRow(rIdx: number) {
    setTableRows((prev) => prev.filter((_, i) => i !== rIdx));
  }

  async function save() {
    if (name.trim().length < 2) return toast.error('Name must be at least 2 characters');
    const body = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      display,
      sizeChartImage: isSizeAttr ? (sizeChartImage.trim() || null) : null,
      sizeTableColumns: isSizeAttr && columns.length > 0 ? columns : null,
      sizeTableRows: isSizeAttr && tableRows.length > 0 ? tableRows : null,
    };

    try {
      if (isEdit && type) {
        await update.mutateAsync({ id: type.id, body });
        toast.success('Attribute saved');
      } else {
        await create.mutateAsync(body);
        toast.success('Attribute created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const pending = create.isPending || update.isPending || isUploading;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="md:p-6">
        <DrawerHeader>
          <DrawerTitle>{isEdit ? 'Edit Attribute' : 'Add Attribute'}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-5">
          {/* Basic Attribute Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-name" className="text-xs font-semibold">Attribute Name</Label>
              <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. nike-shoe-size, shirt-size, Color" />
            </div>
            {!isEdit ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="a-slug" className="text-xs font-semibold">Slug <span className="text-muted-foreground font-normal">(auto if blank)</span></Label>
                <Input id="a-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={name ? slugify(name) : 'auto-generated'} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Display Style</Label>
                <Select value={display} onValueChange={(v) => setDisplay(v as 'text' | 'swatch')}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text (Label)</SelectItem>
                    <SelectItem value="swatch">Swatch (Color Chip)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Display Style</Label>
              <Select value={display} onValueChange={(v) => setDisplay(v as 'text' | 'swatch')}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text (Label)</SelectItem>
                  <SelectItem value="swatch">Swatch (Color Chip)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Size Chart Section - Only shown/enabled when name contains 'size' */}
          {!isSizeAttr ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-3.5 text-xs text-gray-500 bg-gray-50/50 flex items-center gap-2">
              <Info className="size-4 text-gray-400 shrink-0" />
              <span>Include <strong>"size"</strong> in the attribute name (e.g. <code>nike-shoe-size</code>, <code>shirt-size</code>) to enable size chart image upload &amp; table configuration.</span>
            </div>
          ) : (
            <div className="space-y-4 pt-1 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Size Chart Configuration
                </span>
              </div>

              {/* Size Chart Image Upload Section */}
              <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-xs">
                <Label className="text-xs font-semibold text-blue-950 flex items-center justify-between">
                  <span>Size Chart Image (Upload to MinIO)</span>
                  <span className="text-[10px] text-blue-700 font-normal">Displayed on SIZE CHART click</span>
                </Label>
                
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

                <div className="flex items-center gap-3">
                  {sizeChartImage ? (
                    <div className="relative size-20 rounded border bg-white overflow-hidden shrink-0 group">
                      <Image src={mediaSrc(sizeChartImage)} alt="Size Chart" fill className="object-contain" />
                      <button
                        type="button"
                        onClick={() => setSizeChartImage('')}
                        className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex-1 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={isUploading}
                      className="h-8 text-xs bg-white"
                    >
                      {isUploading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <ImagePlus className="size-3.5 mr-1.5" />}
                      {sizeChartImage ? 'Change Image' : 'Upload Size Chart Image'}
                    </Button>
                    
                    <Input
                      placeholder="or paste image URL directly..."
                      value={sizeChartImage}
                      onChange={(e) => setSizeChartImage(e.target.value)}
                      className="h-8 text-xs bg-white border-blue-200"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Size Measurement Table Builder */}
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Custom Size Table (Optional)</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addRow} className="h-6 text-xs px-2">
                    <Plus className="size-3 mr-1" /> Add Row
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Column Names (comma separated)</Label>
                  <Input
                    value={colsText}
                    onChange={(e) => setColsText(e.target.value)}
                    placeholder="e.g. Size, Chest (in), Length (in), Shoulder (in)"
                    className="h-8 text-xs bg-white"
                  />
                </div>

                {columns.length > 0 && (
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-gray-700 font-semibold bg-muted/50">
                          {columns.map((col, cIdx) => (
                            <th key={cIdx} className="p-1.5">{col}</th>
                          ))}
                          <th className="p-1.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {tableRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {columns.map((_, cIdx) => (
                              <td key={cIdx} className="p-1">
                                <Input
                                  value={row[cIdx] ?? ''}
                                  onChange={(e) => updateTableCell(rIdx, cIdx, e.target.value)}
                                  placeholder={`val ${cIdx + 1}`}
                                  className="h-7 text-xs bg-white px-2"
                                />
                              </td>
                            ))}
                            <td className="p-1 text-center">
                              <button type="button" onClick={() => removeRow(rIdx)} className="text-gray-400 hover:text-destructive p-1">
                                <X className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : isEdit ? 'Save attribute' : 'Add attribute'}</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
