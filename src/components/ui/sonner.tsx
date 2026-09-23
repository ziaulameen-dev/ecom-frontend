'use client';

import { AlertCircle, AlertTriangle, Bell, Check, Info, Loader2 } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const toastIcons = {
  success: (
    <div className="flex size-6 items-center justify-center rounded-full bg-[#187b7b] text-white shadow-xs shrink-0">
      <Check className="size-3.5 stroke-[2.5]" />
    </div>
  ),
  error: (
    <div className="flex size-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs shrink-0">
      <AlertCircle className="size-4 stroke-[2.2]" />
    </div>
  ),
  warning: (
    <div className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs shrink-0">
      <AlertTriangle className="size-4 stroke-[2.2]" />
    </div>
  ),
  info: (
    <div className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs shrink-0">
      <Info className="size-4 stroke-[2.2]" />
    </div>
  ),
  loading: (
    <div className="flex size-6 items-center justify-center rounded-full bg-[#187b7b] text-white shadow-xs shrink-0">
      <Loader2 className="size-3.5 animate-spin stroke-[2.5]" />
    </div>
  ),
  default: (
    <div className="flex size-6 items-center justify-center rounded-full bg-[#187b7b] text-white shadow-xs shrink-0">
      <Bell className="size-3.5 stroke-[2.2]" />
    </div>
  ),
};

/** Toast host, themed to match the iOS push notification banner aesthetic. */
function Toaster({ style: _callerStyle, ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      icons={toastIcons}
      toastOptions={{
        classNames: {
          toast: 'group toast',
          title: 'font-semibold text-[13px] text-foreground leading-tight',
          description: 'text-xs text-foreground/80 leading-snug mt-0.5',
          actionButton:
            'bg-[#187b7b] text-white hover:bg-[#136363] rounded-xl text-xs font-medium px-3 py-1.5 transition-colors',
          cancelButton:
            'bg-muted text-muted-foreground rounded-xl text-xs font-medium px-3 py-1.5',
          closeButton:
            'rounded-full border-border bg-background/80 text-muted-foreground hover:text-foreground',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
