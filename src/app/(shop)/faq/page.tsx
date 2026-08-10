'use client';

import { useContent } from '@/features/catalog';

export default function FaqPage() {
  const { data: content, isLoading } = useContent();
  const faqs = content?.faqs ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Frequently asked questions</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : faqs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No questions yet. Check back soon.</p>
      ) : (
        <div className="mt-8 divide-y">
          {faqs.map((f, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.question}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {f.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
