'use client';

import { FolderTree, ImageOff, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
  useAdminCategories, useCreateCategory, useDeleteCategory, useUpdateCategory, useUploadProductImage,
} from '@/features/admin';
import type { Category } from '@/lib/types';
import { mediaSrc } from '@/lib/utils';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminCategoriesPage() {
  const { data: cats, isLoading } = useAdminCategories();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<'all' | 'top' | 'sub'>('all');
  const [addOpen, setAddOpen] = useState(false);

  const nameOf = (id: string | null) => cats?.find((c) => c.id === id)?.name;
  const childCount = (id: string) => (cats ?? []).filter((c) => c.parentId === id).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (cats ?? []).filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.includes(q)) return false;
      if (level === 'top' && c.parentId) return false;
      if (level === 'sub' && !c.parentId) return false;
      return true;
    });
  }, [cats, search, level]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">{cats?.length ?? 0} categories</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add Category</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="top">Top level</SelectItem>
            <SelectItem value="sub">Sub-categories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Parent</th>
                <th className="px-4 py-3 font-medium">Sub-categories</th>
                <th className="px-4 py-3 font-medium">Sort</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="px-4 py-3" colSpan={5}><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No categories found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <CategoryRow key={c.id} category={c} parentName={nameOf(c.parentId)} childCount={childCount(c.id)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {addOpen && <CategoryDialog onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function CategoryRow({ category, parentName, childCount }: { category: Category; parentName?: string; childCount: number }) {
  const del = useDeleteCategory();
  const [editOpen, setEditOpen] = useState(false);
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/40">
            {category.imageUrl ? (
              <Image src={mediaSrc(category.imageUrl)} alt={category.name} fill unoptimized className="object-cover" />
            ) : (
              <FolderTree className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{category.name}</div>
            <div className="truncate text-xs text-muted-foreground">/{category.slug}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {category.parentId ? <span className="text-muted-foreground">{parentName ?? '—'}</span> : <Badge variant="secondary">Top level</Badge>}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{childCount}</td>
      <td className="px-4 py-3 text-muted-foreground">{category.sortOrder}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => { if (await confirm({ title: 'Delete category?', description: `"${category.name}" will be removed.`, confirmText: 'Delete', destructive: true })) del.mutate(category.id, { onError: (e) => toast.error((e as Error).message) }); }}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dialog lives OUTSIDE the dropdown so its inputs stay interactive. */}
        {editOpen && <CategoryDialog category={category} onClose={() => setEditOpen(false)} />}
      </td>
    </tr>
  );
}

/** Add or edit a category in a dialog (name, slug, parent, sort, image). */
/**
 * Mounted only while open (so it's NOT nested inside the row's DropdownMenu —
 * that Radix nesting leaves the dialog's inputs un-interactive). State is seeded
 * from `category` on mount.
 */
function CategoryDialog({ category, onClose }: { category?: Category; onClose: () => void }) {
  const { data: cats } = useAdminCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const upload = useUploadProductImage();
  const isEdit = !!category;

  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? '');
  // Deferred upload (matches the hero dialog): a newly picked file + its local
  // preview; the actual upload happens on Save.
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Parent options: top-level categories, excluding the one being edited.
  const parents = (cats ?? []).filter((c) => !c.parentId && c.id !== category?.id);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setImageUrl('');
  }

  async function save() {
    if (name.trim().length < 2) return toast.error('Name must be at least 2 characters');
    try {
      // Upload the picked file now (on Save), then attach its URL.
      let img = imageUrl.trim() || undefined;
      if (file) {
        const res = await upload.mutateAsync(file);
        if (!res?.url) throw new Error('Upload returned no URL');
        img = res.url;
      }
      const body = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        parentId: parentId || (isEdit ? null : undefined),
        sortOrder: Number(sortOrder) || 0,
        imageUrl: img,
      };
      if (isEdit && category) {
        await update.mutateAsync({ id: category.id, body });
        toast.success('Category saved');
      } else {
        await create.mutateAsync(body);
        toast.success('Category created');
      }
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const pending = create.isPending || update.isPending || upload.isPending;
  const shownImage = preview ?? (imageUrl ? mediaSrc(imageUrl) : '');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit category' : 'Add category'}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jackets" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-slug">Slug <span className="text-muted-foreground">(auto if blank)</span></Label>
            <Input id="c-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={name ? slugify(name) : 'auto-generated'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Parent</Label>
              <Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Top level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Top level —</SelectItem>
                  {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-sort">Sort order</Label>
              <Input id="c-sort" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="c-image">Image <span className="text-muted-foreground">(optional)</span></Label>
            <div className="flex items-center gap-3">
              <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/40">
                {shownImage ? (
                  <Image src={shownImage} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <ImageOff className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Input id="c-image" type="file" accept="image/*" onChange={onPickFile} disabled={pending} />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {upload.isPending && <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Uploading…</span>}
                  {shownImage && !upload.isPending && (
                    <button type="button" className="hover:text-foreground" onClick={clearImage}>Remove</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : isEdit ? 'Save category' : 'Add category'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
