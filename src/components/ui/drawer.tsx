'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerPortal = DialogPrimitive.Portal;
const DrawerClose = DialogPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col bg-background shadow-2xl transition ease-in-out duration-300 outline-none p-6 overflow-y-auto',
        // Mobile: Slides up from bottom (fit content with max height)
        'inset-x-0 bottom-0 top-auto h-auto max-h-[85vh] rounded-t-2xl border-t border-x',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        // Desktop: Right side slide-in drawer
        'md:top-0 md:bottom-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-full md:max-w-xl md:rounded-none md:border-l md:border-t-0 md:border-r-0',
        'md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0',
        className,
      )}
      {...props}
    >
      {/* Mobile Top Drag Indicator Bar */}
      <div className="mx-auto -mt-2 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-muted md:hidden" />
      {children}
    </DialogPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = DialogPrimitive.Content.displayName;

function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1 text-left pb-2', className)} {...props} />;
}

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold text-foreground', className)} {...props} />
));
DrawerTitle.displayName = DialogPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DrawerDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
};
