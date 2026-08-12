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
    <div className={cn('grid grid-cols-1 gap-5 rounded-sm border p-6 sm:grid-cols-3 sm:gap-6 sm:p-8', className)}>
      {ITEMS.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex items-center gap-3 sm:justify-center">
          <div className="relative grid shrink-0 place-items-center text-ink">
            <Icon className="z-2 size-10" strokeWidth={1.2} />
            <div className="z-1 absolute bottom-0 right-0 size-8 rounded-full bg-gradient-to-br from-brand/50 to-brand/10" />
          </div>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
