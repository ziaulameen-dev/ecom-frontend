'use client';

import { X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useAnnouncement } from '@/features/catalog';

// Session-scoped dismissal, exposed as an external store so reads are
// hydration-safe (server snapshot = visible) and dismissing re-renders.
const KEY = 'promo-dismissed';
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const isDismissed = () => typeof window !== 'undefined' && sessionStorage.getItem(KEY) === '1';
const dismiss = () => {
  sessionStorage.setItem(KEY, '1');
  listeners.forEach((l) => l());
};

/** Scrolling promo strip above the header: seamless marquee, pause on hover,
 * dismissible for the session. Messages + on/off come from admin settings. */
export function AnnouncementBar() {
  const { data } = useAnnouncement();
  const hidden = useSyncExternalStore(subscribe, isDismissed, () => false);

  const messages = data?.messages ?? [];
  if (hidden || !data?.active || messages.length === 0) return null;

  // Repeat so one "half" fills wide screens, then double for the −50% loop.
  const half = [...messages, ...messages];
  const track = [...half, ...half];

  return (
    <div className="group relative bg-primary text-primary-foreground">
      <div className="flex overflow-hidden">
        <div className="flex shrink-0 animate-[marquee_32s_linear_infinite] items-center py-2 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {track.map((m, i) => (
            <span key={i} className="flex items-center whitespace-nowrap text-[11px] uppercase tracking-[0.18em]">
              {m}
              <span className="mx-8 size-1 rounded-full bg-brand" aria-hidden />
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={dismiss}
        className="absolute right-0 top-0 grid h-full place-items-center bg-primary pl-4 pr-2 text-primary-foreground/70 transition-colors hover:text-primary-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
