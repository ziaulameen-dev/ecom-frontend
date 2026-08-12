'use client';

import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

/** Replace {token} with the matching variable (case-insensitive), else leave as-is. */
export function fillTemplate(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  return text.replace(/\{\s*([a-zA-Z0-9_ -]+?)\s*\}/g, (m, key: string) => {
    const v = vars[key.trim().toLowerCase()];
    return v != null && v !== '' ? v : m;
  });
}

/**
 * Render admin-authored rich HTML safely. `vars` fills {color}/{size}-style
 * tokens with the selected variant's values so one text serves every variant.
 */
export function RichText({
  html,
  vars,
  className,
}: {
  html: string | null | undefined;
  vars?: Record<string, string>;
  className?: string;
}) {
  if (!html) return null;
  const withVars = fillTemplate(html, vars);
  // The product data is fetched client-side, so this only renders post-hydration.
  const clean = typeof window === 'undefined' ? '' : DOMPurify.sanitize(withVars);
  return (
    <div
      className={cn('richtext text-sm text-muted-foreground', className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
