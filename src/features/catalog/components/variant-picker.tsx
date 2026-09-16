'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Variant } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TypeGroup {
  typeId: string;
  type: string;
  display: 'text' | 'swatch';
  values: { value: string; swatch: string | null }[];
}

/** Selection state: typeId -> chosen value. */
export type Selection = Record<string, string>;

/** Find the variant that matches the full selection (all types satisfied). */
export function matchVariant(variants: Variant[], sel: Selection): Variant | undefined {
  return variants.find((v) =>
    v.options.every((o) => sel[o.typeId] === o.value),
  );
}

function buildGroups(variants: Variant[]): TypeGroup[] {
  const map = new Map<string, TypeGroup>();
  for (const v of variants) {
    for (const o of v.options) {
      const g = map.get(o.typeId) ?? {
        typeId: o.typeId,
        type: o.type,
        display: o.swatch ? 'swatch' : 'text',
        values: [],
      };
      if (!g.values.some((x) => x.value === o.value)) {
        g.values.push({ value: o.value, swatch: o.swatch });
      }
      map.set(o.typeId, g);
    }
  }
  return [...map.values()];
}

export function useVariantSelection(variants: Variant[]) {
  const groups = useMemo(() => buildGroups(variants ?? []), [variants]);
  const initial = useMemo<Selection>(() => {
    const def = variants?.find((v) => v.isDefault) ?? variants?.[0];
    const sel: Selection = {};
    def?.options?.forEach((o) => (sel[o.typeId] = o.value));
    return sel;
  }, [variants]);

  const [selection, setSelection] = useState<Selection>(initial);

  useEffect(() => {
    if (Object.keys(initial).length > 0 && Object.keys(selection).length === 0) {
      setSelection(initial);
    }
  }, [initial, selection]);

  const active = useMemo(() => {
    const matched = matchVariant(variants ?? [], selection);
    if (matched) return matched;
    return variants?.find((v) => v.isDefault) ?? variants?.[0];
  }, [variants, selection]);

  return { groups, selection, setSelection, active };
}

export function VariantPicker({
  groups,
  selection,
  onChange,
  onOpenSizeChart,
}: {
  groups: TypeGroup[];
  selection: Selection;
  onChange: (sel: Selection) => void;
  onOpenSizeChart?: () => void;
}) {
  if (!groups || groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const isSize = g.type.toLowerCase().includes('size');
        const label = isSize ? 'Size' : g.type;

        return (
          <div key={g.typeId}>
            <div className="mb-2 flex items-center justify-between text-xs sm:text-sm font-bold text-gray-900">
              <div>
                {label}: <span className="text-gray-500 font-normal">{selection[g.typeId]}</span>
              </div>
              {isSize && onOpenSizeChart && (
                <button
                  type="button"
                  onClick={onOpenSizeChart}
                  className="text-xs font-bold text-[#187b7b] uppercase hover:underline tracking-wide"
                >
                  SIZE CHART
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {g.values.map((val) => {
                const selected = selection[g.typeId] === val.value;
                if (g.display === 'swatch' && val.swatch) {
                  return (
                    <button
                      key={val.value}
                      type="button"
                      aria-label={val.value}
                      onClick={() => onChange({ ...selection, [g.typeId]: val.value })}
                      className={cn(
                        'size-7 rounded-full border-2 transition',
                        selected
                          ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-1'
                          : 'border-gray-300 hover:border-gray-500'
                      )}
                      style={{ backgroundColor: val.swatch }}
                    />
                  );
                }
                return (
                  <button
                    key={val.value}
                    type="button"
                    onClick={() => onChange({ ...selection, [g.typeId]: val.value })}
                    className={cn(
                      'h-9 min-w-[42px] px-2.5 rounded-xs border text-xs font-semibold transition-all flex items-center justify-center',
                      selected
                        ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                        : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400'
                    )}
                  >
                    {val.value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
