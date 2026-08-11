'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the last box is filled (all `length` digits entered). */
  onComplete?: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Segmented one-time-code input: `length` single-digit boxes that behave like
 * one field — typing advances, backspace retreats, and pasting a full code
 * fills every box. `value` is the plain joined string (e.g. "123456").
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = true,
  disabled,
  className,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function focusBox(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  }

  function emit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const arr = Array.from({ length }, (_, k) => value[k] ?? '');
    arr[index] = digit;
    emit(arr.join(''));
    if (digit) focusBox(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = Array.from({ length }, (_, k) => value[k] ?? '');
      if (arr[index]) {
        arr[index] = '';
        emit(arr.join(''));
      } else if (index > 0) {
        arr[index - 1] = '';
        emit(arr.join(''));
        focusBox(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    emit(pasted);
    focusBox(Math.min(pasted.length, length - 1));
  }

  return (
    <div className={cn('flex items-center justify-center gap-2 sm:gap-2.5', className)}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            'size-11 rounded-lg border bg-transparent text-center text-lg font-semibold tabular-nums outline-none transition-colors sm:size-12',
            'focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10',
            'disabled:opacity-60',
          )}
        />
      ))}
    </div>
  );
}
