'use client';

import { create } from 'zustand';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve?: (value: boolean) => void;
  request: (options: ConfirmOptions) => Promise<boolean>;
  settle: (value: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: {},
  request: (options) =>
    new Promise<boolean>((resolve) => set({ open: true, options, resolve })),
  settle: (value) => {
    get().resolve?.(value);
    set({ open: false, resolve: undefined });
  },
}));

/**
 * Promise-based confirmation — a drop-in replacement for window.confirm():
 *   if (await confirm({ title: 'Delete?', destructive: true })) del.mutate(id);
 * Requires <ConfirmDialog /> mounted once (in Providers).
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(options);
}

/** Global confirmation modal (mounted once in Providers). */
export function ConfirmDialog() {
  const { open, options, settle } = useConfirmStore();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) settle(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
          {options.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => settle(false)}>{options.cancelText ?? 'Cancel'}</Button>
          <Button variant={options.destructive ? 'destructive' : 'default'} onClick={() => settle(true)}>
            {options.confirmText ?? 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
