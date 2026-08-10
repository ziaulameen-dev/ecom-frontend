'use client';

import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/features/admin';
import type { AttributeType } from '@/lib/types';

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
          <h1 className="text-2xl font-semibold">Attributes</h1>
          <p className="text-sm text-muted-foreground">{types?.length ?? 0} attribute types</p>
        </div>
        <AttributeDialog trigger={<Button><Plus className="size-4" /> Add Attribute</Button>} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search attributes…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="px-4 py-3" colSpan={4}><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No attributes found.</td></tr>
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
        <td className="px-4 py-3 text-muted-foreground">{type.values.length}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <AttributeDialog
                  type={type}
                  trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Pencil className="size-4" /> Edit</DropdownMenuItem>}
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
          <td colSpan={4} className="px-4 py-3">
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

/** Add or edit an attribute type (name, slug, display). */
function AttributeDialog({ type, trigger }: { type?: AttributeType; trigger: React.ReactNode }) {
  const create = useCreateAttributeType();
  const update = useUpdateAttributeType();
  const isEdit = !!type;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [display, setDisplay] = useState<'text' | 'swatch'>('text');

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(type?.name ?? '');
      setSlug(type?.slug ?? '');
      setDisplay(type?.display ?? 'text');
    }
    setOpen(next);
  }

  async function save() {
    if (name.trim().length < 2) return toast.error('Name must be at least 2 characters');
    try {
      if (isEdit && type) {
        await update.mutateAsync({ id: type.id, body: { name: name.trim(), display } });
        toast.success('Attribute saved');
      } else {
        await create.mutateAsync({ name: name.trim(), slug: slug.trim() || slugify(name), display });
        toast.success('Attribute created');
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit attribute' : 'Add attribute'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="a-name">Name</Label>
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Color, Size, Strap" />
          </div>
          {!isEdit && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="a-slug">Slug <span className="text-muted-foreground">(auto if blank)</span></Label>
              <Input id="a-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={name ? slugify(name) : 'auto-generated'} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>Display</Label>
            <Select value={display} onValueChange={(v) => setDisplay(v as 'text' | 'swatch')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="swatch">Swatch (color)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : isEdit ? 'Save attribute' : 'Add attribute'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
