import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE } from './config';

/** Merge conditional + conflicting Tailwind classes (shadcn's helper). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve an image URL for rendering. Absolute URLs (http/https/data/blob) pass
 * through; API-relative paths (e.g. MinIO-served "/api/products/images/…") get
 * the gateway origin prepended so they resolve from the browser.
 */
export function mediaSrc(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Format paise as INR (India-only store). */
export function money(amountMinor: number | null | undefined, currency = 'INR') {
  if (amountMinor == null) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amountMinor / 100);
  } catch {
    return `₹${(amountMinor / 100).toFixed(0)}`;
  }
}

/** Short, readable date. */
export function formatDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
