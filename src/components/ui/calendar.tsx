'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { DayPicker, useDayPicker, type MonthCaptionProps } from 'react-day-picker';
import 'react-day-picker/style.css';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Theme react-day-picker (v10) selection colors to the app palette. */
const themeVars = {
  '--rdp-accent-color': 'var(--primary)',
  '--rdp-accent-background-color': 'var(--accent)',
  '--rdp-today-color': 'var(--primary)',
  '--rdp-range_start-date-background-color': 'var(--primary)',
  '--rdp-range_end-date-background-color': 'var(--primary)',
  '--rdp-range_start-color': 'var(--primary-foreground)',
  '--rdp-range_end-color': 'var(--primary-foreground)',
  '--rdp-range_middle-background-color': 'var(--accent)',
  '--rdp-range_middle-color': 'var(--accent-foreground)',
  '--rdp-selected-border': '1.5px solid var(--primary)',
} as React.CSSProperties;

/** Custom header: prev button (left) · month/year (centered) · next (right). */
function MonthCaption({ calendarMonth }: MonthCaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useDayPicker();
  const navBtn = cn(
    buttonVariants({ variant: 'outline' }),
    'size-8 p-0 opacity-70 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30',
  );
  return (
    <div className="relative mb-2 flex h-9 items-center justify-center">
      <button
        type="button"
        aria-label="Previous month"
        className={cn(navBtn, 'absolute left-0')}
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-sm font-medium">{format(calendarMonth.date, 'LLLL yyyy')}</span>
      <button
        type="button"
        aria-label="Next month"
        className={cn(navBtn, 'absolute right-0')}
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function Calendar({ className, style, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      style={{ ...themeVars, ...style }}
      // Own header (aligned), hide RDP's default nav to avoid duplicate buttons.
      components={{ MonthCaption, Nav: () => <></> }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
