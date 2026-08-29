'use client';

import { useEffect, useState } from 'react';
import { useAnnouncement } from '@/features/catalog';
import { cn } from '@/lib/utils';

const DEFAULT_MESSAGES = [
  'SAVE 10% ON YOUR FIRST ORDER',
  'FREE SHIPPING OVER ₹999',
];

/** Fading promo banner above the header:
 * - Mobile: 1 item fading in & out.
 * - Desktop: 50%/50% split with vertical line locked in the exact center.
 * - Non-dismissible.
 */
export function AnnouncementBar() {
  const { data } = useAnnouncement();

  const messages = data?.messages?.length ? data.messages : DEFAULT_MESSAGES;

  // Mobile: cycles 1 message at a time.
  // Desktop: cycles a PAIR of messages at a time (advance by 2).
  const [mobileIndex, setMobileIndex] = useState(0);
  const [desktopIndex, setDesktopIndex] = useState(0);
  const [opacityClass, setOpacityClass] = useState('opacity-100');

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setOpacityClass('opacity-0');
      setTimeout(() => {
        setMobileIndex((prev) => (prev + 1) % messages.length);
        // Advance by 2 so the next pair shows
        setDesktopIndex((prev) => (prev + 2) % messages.length);
        setOpacityClass('opacity-100');
      }, 500);
    }, 3500);
    return () => clearInterval(interval);
  }, [messages.length]);

  if (data && !data.active) return null;

  // Mobile: current single message
  const mobileMsg = messages[mobileIndex];

  // Desktop: current pair — left and right
  const leftMsg  = messages[desktopIndex % messages.length];
  const rightMsg = messages[(desktopIndex + 1) % messages.length];

  return (
    <div className="relative z-40 bg-black text-white select-none overflow-hidden" style={{ minHeight: '34px' }}>
      {/* Mobile / Tablet (< lg): Single message fading in/out */}
      <div className="lg:hidden flex items-center justify-center px-4 py-2 min-h-[34px]">
        <div
          className={cn(
            'text-[10px] font-semibold uppercase tracking-[0.2em] text-white text-center transition-opacity duration-500 ease-in-out',
            opacityClass,
          )}
        >
          {mobileMsg}
        </div>
      </div>

      {/* Desktop (≥ lg): 50% / 50% split — both swap as a pair */}
      <div className="hidden lg:flex items-stretch w-full min-h-[34px]">
        {/* Left 50% */}
        <div
          className={cn(
            'w-1/2 flex items-center justify-center px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity duration-500 ease-in-out',
            opacityClass,
          )}
        >
          {leftMsg}
        </div>

        {/* Full-height vertical divider locked at center */}
        <span className="w-px self-stretch bg-white/40 shrink-0" />

        {/* Right 50% */}
        <div
          className={cn(
            'w-1/2 flex items-center justify-center px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity duration-500 ease-in-out',
            opacityClass,
          )}
        >
          {rightMsg}
        </div>
      </div>
    </div>
  );
}
