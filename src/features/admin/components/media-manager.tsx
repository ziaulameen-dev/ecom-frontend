'use client';

import { Eye, GripVertical, ImagePlus, Loader2, Play, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { MediaItem } from '@/lib/types';
import { cn, mediaSrc } from '@/lib/utils';
import { useUploadProductImage } from '../hooks/use-admin-products';

/**
 * Ordered common-media gallery (images + videos) for a product. Upload multiple
 * files, reorder by drag or the up/down arrows, and remove. The first image is
 * the listing cover; on the storefront a variant shows its own images first,
 * then this common media.
 */
export function MediaManager({
  value,
  onChange,
}: {
  value: MediaItem[];
  onChange: (media: MediaItem[]) => void;
}) {
  const upload = useUploadProductImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    let next = value;
    for (const file of files) {
      try {
        const res = await upload.mutateAsync(file);
        next = [...next, { url: res.url, type: res.type }];
        onChange(next);
      } catch (err) {
        toast.error((err as Error).message);
      }
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  function onDrop(i: number) {
    if (dragIdx === null || dragIdx === i) return;
    move(dragIdx, i);
    setDragIdx(null);
  }

  const coverIdx = value.findIndex((m) => m.type === 'image');

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPick} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((m, i) => (
          <div
            key={`${m.url}-${i}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-lg border bg-muted/40',
              dragIdx === i && 'opacity-50',
            )}
          >
            {m.type === 'video' ? (
              <>
                <video src={mediaSrc(m.url)} className="h-full w-full object-cover" muted playsInline />
                <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                  <Play className="size-2.5" /> video
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(m.url)} alt="" className="h-full w-full object-cover" />
            )}
            {i === coverIdx && (
              <span className="absolute right-1 top-1 rounded bg-foreground px-1 py-0.5 text-[10px] text-background">Cover</span>
            )}
            <span
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragEnd={() => setDragIdx(null)}
              title="Drag to reorder"
              className="absolute bottom-1 left-1 z-10 cursor-grab rounded bg-black/50 p-0.5 text-white hover:bg-black/70 active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </span>
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <a
                href={mediaSrc(m.url)}
                target="_blank"
                rel="noopener noreferrer"
                title={m.type === 'video' ? 'View video' : 'View image'}
                className="rounded bg-white/90 p-1.5 text-black hover:bg-white"
              >
                <Eye className="size-4" />
              </a>
              <button type="button" onClick={() => remove(i)} title="Delete" className="rounded bg-destructive p-1.5 text-white">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50"
        >
          {upload.isPending ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span className="text-[11px]">{upload.isPending ? 'Uploading…' : 'Add media'}</span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Images &amp; videos (up to 25&nbsp;MB). Drag tiles to reorder. The first image is the cover;
        variant images appear before this common media.
      </p>
    </div>
  );
}
