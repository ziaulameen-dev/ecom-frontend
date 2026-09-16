import { CreditCard, Headphones, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders above ₹500' },
  { icon: CreditCard, title: 'Flexible Payment', desc: 'Multiple secure payment options' },
  { icon: Headphones, title: '24×7 Support', desc: 'We support online all days' },
];

/** Trust/value-props band (Free Shipping · Flexible Payment · 24×7 Support). */
export function ValueProps({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-3 gap-2 rounded-xs border p-3.5 py-4 sm:gap-6 sm:p-6 md:p-8', className)}>
      {ITEMS.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-3 sm:justify-center">
          <div className="relative grid shrink-0 place-items-center text-ink">
            <Icon className="relative z-10 size-6 sm:size-8 md:size-10" strokeWidth={1.2} />
            <div className="absolute bottom-0 -right-1 z-0 size-5 sm:size-7 md:size-8 rounded-full bg-gradient-to-br from-brand/50 to-brand/10" />
          </div>
          <div>
            <div className="text-[10px] sm:text-sm font-semibold leading-tight">{title}</div>
            <div className="hidden sm:block text-xs text-muted-foreground mt-0.5">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
