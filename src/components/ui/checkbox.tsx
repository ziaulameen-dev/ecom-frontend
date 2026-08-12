'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A dependency-free controlled checkbox box (compose your own label around it). */
export function Checkbox({
  checked,
  onCheckedChange,
  className,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors',
        checked
          ? 'border-primary-button bg-primary-button text-white'
          : 'border-input bg-background hover:border-foreground/40',
        className,
      )}
      {...props}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}
