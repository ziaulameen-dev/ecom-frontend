'use client';

import {
  AlertCircle,
  Check,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { OrderStatus } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

interface OrderTimelineProps {
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  carrier?: string | null;
  cancelReason?: string | null;
  className?: string;
}

interface Step {
  id: string;
  label: string;
  description?: string;
}

export function OrderTimeline({
  status,
  createdAt,
  carrier,
  cancelReason,
  className,
}: OrderTimelineProps) {
  // Terminal state: Cancelled
  if (status === 'cancelled') {
    return (
      <div className={cn('rounded-sm border border-border bg-muted/30 p-3 flex items-start gap-2.5 text-xs text-muted-foreground', className)}>
        <XCircle className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="space-y-0.5 min-w-0">
          <p className="font-semibold text-foreground">Order Cancelled</p>
          {cancelReason && (
            <p className="text-[11px] text-muted-foreground truncate">
              Reason: {cancelReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Terminal state: Failed
  if (status === 'failed') {
    return (
      <div className={cn('rounded-sm border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-3 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300', className)}>
        <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">Payment Failed</p>
          <p className="text-[11px] text-red-600/90 dark:text-red-400/90">
            Payment could not be completed. You may re-order anytime.
          </p>
        </div>
      </div>
    );
  }

  // Terminal state: Refunded
  if (status === 'refunded') {
    return (
      <div className={cn('rounded-sm border border-purple-200 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/20 p-3 flex items-start gap-2.5 text-xs text-purple-800 dark:text-purple-300', className)}>
        <RotateCcw className="size-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">Order Refunded</p>
          <p className="text-[11px] text-purple-600/90 dark:text-purple-400/90">
            Refund has been processed back to your original payment source.
          </p>
        </div>
      </div>
    );
  }

  // Happy-path: 5 milestones
  const steps: Step[] = [
    {
      id: 'placed',
      label: 'Placed',
      description: formatDate(createdAt).split(',')[0],
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      description: ['confirmed', 'processing', 'shipped', 'delivered'].includes(status) ? 'Confirmed' : 'Pending',
    },
    {
      id: 'processing',
      label: 'Processing',
      description: ['processing', 'shipped', 'delivered'].includes(status) ? 'Packed' : 'Pending',
    },
    {
      id: 'shipped',
      label: 'Shipped',
      description: carrier || (['shipped', 'delivered'].includes(status) ? 'Dispatched' : 'In transit'),
    },
    {
      id: 'delivered',
      label: 'Delivered',
      description: status === 'delivered' ? 'Completed' : 'Expected',
    },
  ];

  // Map status to current step index (0 = placed, 1 = confirmed, 2 = processing, 3 = shipped, 4 = delivered)
  const getActiveStepIndex = (): number => {
    switch (status) {
      case 'pending':
        return 0;
      case 'confirmed':
        return 1;
      case 'processing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStepIndex();
  const isAllDelivered = status === 'delivered';

  return (
    <div className={cn('py-2 sm:py-3 select-none', className)}>
      <div className="relative flex items-center justify-between">
        {/* Continuous Connecting Track */}
        <div className="absolute top-3.5 left-4 right-4 h-0.5 -translate-y-1/2 bg-muted/80 z-0">
          <div
            className="h-full bg-[#187b7b] transition-all duration-500 ease-out"
            style={{
              width: `${(activeIndex / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Step Nodes */}
        {steps.map((step, idx) => {
          const isCompleted = isAllDelivered || idx < activeIndex;
          const isCurrent = !isAllDelivered && idx === activeIndex;
          const isUpcoming = idx > activeIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              {/* Circle Node */}
              <div
                className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  isCompleted && 'bg-[#187b7b] text-white shadow-xs',
                  isCurrent && 'bg-primary-button text-white ring-4 ring-primary-button/20 shadow-xs',
                  isUpcoming && 'bg-background border-2 border-muted-foreground/30 text-muted-foreground/40',
                )}
              >
                {isCompleted ? (
                  <Check className="size-3.5 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="size-2 rounded-full bg-white" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                )}
              </div>

              {/* Label & Description */}
              <div className="mt-1.5 text-center">
                <p
                  className={cn(
                    'text-[11px] xs:text-xs font-semibold tracking-tight transition-colors',
                    (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground/60',
                    isCurrent && 'text-primary-button font-bold',
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-muted-foreground hidden xs:block truncate max-w-[72px] mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
