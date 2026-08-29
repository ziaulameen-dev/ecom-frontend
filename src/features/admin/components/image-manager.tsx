'use client';

import { Eye, GripVertical, ImagePlus, Loader2, Play, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn, mediaSrc } from '@/lib/utils';
import { useUploadProductImage } from '../hooks/use-admin-products';

function isVideoUrl(url: string) {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return /\.(mp4|webm|mov|mkv|avi|ogv|3gp|m4v)$/i.test(clean);
}

/** Ordered image & video list for a variant (upload + drag-to-reorder + remove). Stores plain URL strings. */
export function ImageManager({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const upload = useUploadProductImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    let next = value;
    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Only images and videos are allowed');
        continue;
      }
      try {
        const res = await upload.mutateAsync(file);
        next = [...next, res.url];
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

  return (
    <div className="flex flex-wrap gap-2">
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPick} />
      {value.map((url, i) => (
        <div
          key={`${url}-${i}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(i)}
          className={cn('group relative size-16 overflow-hidden rounded-md border bg-muted/40', dragIdx === i && 'opacity-50')}
        >
          {isVideoUrl(url) ? (
            <>
              <video src={mediaSrc(url)} className="h-full w-full object-cover" muted playsInline />
              <span className="absolute left-0.5 top-0.5 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white">
                <Play className="size-2" /> video
              </span>
            </>
          ) : (
            <Image src={mediaSrc(url)} alt="" fill unoptimized sizes="64px" className="object-cover" />
          )}
          <span
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragEnd={() => setDragIdx(null)}
            title="Drag to reorder"
            className="absolute bottom-0.5 left-0.5 z-10 cursor-grab rounded bg-black/50 p-0.5 text-white active:cursor-grabbing"
          >
            <GripVertical className="size-3" />
          </span>
          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <a href={mediaSrc(url)} target="_blank" rel="noopener noreferrer" title="View media" className="rounded bg-white/90 p-1 text-black hover:bg-white">
              <Eye className="size-3.5" />
            </a>
            <button type="button" onClick={() => remove(i)} title="Delete" className="rounded bg-destructive p-1 text-white">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={upload.isPending}
        className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50"
      >
        {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        <span className="text-[9px]">Add</span>
      </button>
    </div>
  );
}
