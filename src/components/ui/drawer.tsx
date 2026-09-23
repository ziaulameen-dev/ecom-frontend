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

export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideHandle?: boolean;
  overlayClassName?: string;
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ className, children, hideHandle = false, overlayClassName, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const closeTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement);

  const startY = React.useRef<number | null>(null);
  const startTime = React.useRef<number>(0);
  const lastY = React.useRef<number>(0);
  const lastTime = React.useRef<number>(0);
  const currentVelocityY = React.useRef<number>(0); // px/ms (>0 moving down, <0 moving up)
  const currentTranslateY = React.useRef<number>(0);
  const isDragging = React.useRef<boolean>(false);
  const hasMoved = React.useRef<boolean>(false);
  const isClosing = React.useRef<boolean>(false);

  // Reset transform and animation state on mount and unmount
  React.useEffect(() => {
    isClosing.current = false;
    isDragging.current = false;
    hasMoved.current = false;
    if (innerRef.current) {
      innerRef.current.style.transform = '';
      innerRef.current.style.transition = '';
    }
    return () => {
      if (innerRef.current) {
        innerRef.current.style.transform = '';
        innerRef.current.style.transition = '';
      }
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // Only allow dragging on mobile screens
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;

    // Do not hijack interactive elements like buttons, links, inputs
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select')) return;

    if (e.button !== 0 || isClosing.current) return;
    startY.current = e.clientY;
    lastY.current = e.clientY;
    startTime.current = Date.now();
    lastTime.current = Date.now();
    currentVelocityY.current = 0;
    currentTranslateY.current = 0;
    isDragging.current = true;
    hasMoved.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    if (innerRef.current) {
      innerRef.current.style.transition = 'none';
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current || startY.current === null || isClosing.current) return;
    const deltaY = e.clientY - startY.current;
    if (Math.abs(deltaY) > 5) {
      hasMoved.current = true;
    }

    const now = Date.now();
    const dt = Math.max(now - lastTime.current, 1);
    const dy = e.clientY - lastY.current;
    currentVelocityY.current = dy / dt; // Instantaneous velocity right now
    lastY.current = e.clientY;
    lastTime.current = now;

    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      if (innerRef.current) {
        innerRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    } else {
      const resistance = deltaY * 0.15;
      currentTranslateY.current = resistance;
      if (innerRef.current) {
        innerRef.current.style.transform = `translateY(${resistance}px)`;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current || isClosing.current) return;
    isDragging.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const deltaY = currentTranslateY.current;
    // If the user was actively dragging upwards on release, do NOT close
    const isDraggingUp = currentVelocityY.current < -0.15;

    startY.current = null;
    currentTranslateY.current = 0;

    // Pulling down more than 80px then close, otherwise be open
    if (deltaY > 80 && !isDraggingUp) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}
      isClosing.current = true;
      if (innerRef.current) {
        innerRef.current.style.animation = 'none';
        innerRef.current.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
        innerRef.current.style.transform = 'translateY(100%)';
      }
      setTimeout(() => {
        closeTriggerRef.current?.click();
        setTimeout(() => {
          isClosing.current = false;
          hasMoved.current = false;
          if (innerRef.current) {
            innerRef.current.style.animation = '';
            innerRef.current.style.transition = '';
            innerRef.current.style.transform = '';
          }
        }, 100);
      }, 220);
    } else {
      // Otherwise be open: smoothly spring back to translateY(0) without replaying CSS enter animation
      if (innerRef.current) {
        innerRef.current.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
        innerRef.current.style.transform = 'translateY(0)';
      }
      setTimeout(() => {
        if (!isClosing.current && innerRef.current) {
          innerRef.current.style.transition = '';
          innerRef.current.style.transform = '';
        }
        hasMoved.current = false;
      }, 230);
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current || isClosing.current) return;
    isDragging.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const deltaY = currentTranslateY.current;
    const isDraggingUp = currentVelocityY.current < -0.15;
    startY.current = null;
    currentTranslateY.current = 0;

    if (deltaY > 80 && !isDraggingUp) {
      isClosing.current = true;
      if (innerRef.current) {
        innerRef.current.style.animation = 'none';
        innerRef.current.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
        innerRef.current.style.transform = 'translateY(100%)';
      }
      setTimeout(() => {
        closeTriggerRef.current?.click();
        setTimeout(() => {
          isClosing.current = false;
          hasMoved.current = false;
          if (innerRef.current) {
            innerRef.current.style.animation = '';
            innerRef.current.style.transition = '';
            innerRef.current.style.transform = '';
          }
        }, 100);
      }, 220);
    } else {
      // Otherwise be open
      if (innerRef.current) {
        innerRef.current.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
        innerRef.current.style.transform = 'translateY(0)';
      }
      setTimeout(() => {
        if (!isClosing.current && innerRef.current) {
          innerRef.current.style.transition = '';
          innerRef.current.style.transform = '';
        }
        hasMoved.current = false;
      }, 230);
    }
  };

  const onClickHandle = (e: React.MouseEvent) => {
    // If it was a clean tap without dragging, dismiss the drawer smoothly
    if (!hasMoved.current && !isClosing.current) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}
      isClosing.current = true;
      if (innerRef.current) {
        innerRef.current.style.animation = 'none';
        innerRef.current.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
        innerRef.current.style.transform = 'translateY(100%)';
      }
      setTimeout(() => {
        closeTriggerRef.current?.click();
        setTimeout(() => {
          isClosing.current = false;
          if (innerRef.current) {
            innerRef.current.style.animation = '';
            innerRef.current.style.transition = '';
            innerRef.current.style.transform = '';
          }
        }, 100);
      }, 220);
    }
  };

  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={innerRef}
        className={cn(
          'fixed z-50 flex flex-col bg-background shadow-2xl transition ease-in-out duration-300 outline-none overflow-y-auto box-border',
          // Mobile: Slides up from bottom (fit content with max height)
          'inset-x-0 bottom-0 top-auto w-full max-w-full h-auto max-h-[85vh] rounded-t-2xl border-t border-x overflow-x-hidden',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          // Desktop: Right side slide-in drawer
          'md:top-0 md:bottom-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-full md:max-w-xl md:rounded-none md:border-l md:border-t-0 md:border-r-0',
          'md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0',
          className,
        )}
        {...props}
      >
        {/* Hidden close trigger for programmatic gesture closing */}
        <DialogPrimitive.Close ref={closeTriggerRef} className="sr-only" />

        <DrawerContext.Provider
          value={{
            dragProps: {
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerCancel,
            },
            onClickHandle,
          }}
        >
          {/* Mobile Top Drag Indicator Bar with drag-down-to-close */}
          {!hideHandle && <DrawerHandle />}
          {children}
        </DrawerContext.Provider>
      </DialogPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = DialogPrimitive.Content.displayName;

interface DrawerContextValue {
  dragProps: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
  onClickHandle?: (e: React.MouseEvent) => void;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

export function useDrawer() {
  return React.useContext(DrawerContext);
}

export interface DrawerHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  pillClassName?: string;
}

const DrawerHandle = React.forwardRef<HTMLDivElement, DrawerHandleProps>(
  ({ className, pillClassName, ...props }, ref) => {
    const ctx = useDrawer();

    return (
      <div
        ref={ref}
        onPointerDown={ctx?.dragProps.onPointerDown}
        onPointerMove={ctx?.dragProps.onPointerMove}
        onPointerUp={ctx?.dragProps.onPointerUp}
        onPointerCancel={ctx?.dragProps.onPointerCancel}
        onClick={ctx?.onClickHandle}
        className={cn(
          'mx-auto w-full shrink-0 flex items-center justify-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing touch-none select-none md:hidden',
          className,
        )}
        role="button"
        tabIndex={0}
        aria-label="Drag down to close drawer"
        {...props}
      >
        <div
          className={cn(
            'h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/45 active:bg-muted-foreground/60 transition-colors',
            pillClassName,
          )}
        />
      </div>
    );
  },
);
DrawerHandle.displayName = 'DrawerHandle';

const DrawerHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(DrawerContext);
  return (
    <div
      ref={ref}
      {...ctx?.dragProps}
      className={cn('flex flex-col space-y-1 text-left pb-2 touch-none md:touch-auto', className)}
      {...props}
    />
  );
});
DrawerHeader.displayName = 'DrawerHeader';

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
  DrawerHandle,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
};
