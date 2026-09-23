'use client';

import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/lib/use-media-query';

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

/** Global confirmation modal / mobile bottom drawer (mounted once in Providers). */
export function ConfirmDialog() {
  const { open, options, settle } = useConfirmStore();
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // On mobile devices, display confirmation as a touch-friendly bottom drawer
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) settle(false);
        }}
      >
        <DrawerContent className="px-5 pb-8 sm:pb-6 overflow-hidden z-[70]" overlayClassName="z-[65]">
          <DrawerHeader className="text-left p-0 mb-3">
            <DrawerTitle className="text-base font-bold text-foreground">
              {options.title ?? 'Are you sure?'}
            </DrawerTitle>
            {options.description && (
              <DrawerDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {options.description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="flex items-center gap-3 pt-3">
            <Button
              variant="outline"
              className="flex-1 h-11 text-sm font-medium"
              onClick={() => settle(false)}
            >
              {options.cancelText ?? 'Cancel'}
            </Button>
            <Button
              variant={options.destructive ? 'destructive' : 'default'}
              className="flex-1 h-11 text-sm font-medium"
              onClick={() => settle(true)}
            >
              {options.confirmText ?? 'Confirm'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // On desktop, display as standard centered modal dialog
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) settle(false);
      }}
    >
      <DialogContent className="max-w-sm z-[70]" overlayClassName="z-[65]">
        <DialogHeader>
          <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
          {options.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => settle(false)}>
            {options.cancelText ?? 'Cancel'}
          </Button>
          <Button
            variant={options.destructive ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {options.confirmText ?? 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
