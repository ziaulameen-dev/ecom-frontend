import { CreditCard, Headphones, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders above ₹500' },
  { icon: CreditCard, title: 'Flexible Payment', desc: 'Multiple secure payment options' },
  { icon: Headphones, title: '24×7 Support', desc: 'We support online all days' },
];

/** Trust/value-props band (Free Shipping · Flexible Payment · 24×7 Support). */
export function ValueProps({ className }: { className?: string }) {
  return null;
}
