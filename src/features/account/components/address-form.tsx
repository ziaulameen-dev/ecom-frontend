'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AddressInput } from '../types';
import { usePincode } from '../hooks/use-pincode';

const schema = z.object({
  fullName: z.string().min(2, 'Enter a name'),
  phone: z.string().min(6, 'Enter a phone').max(15),
  line1: z.string().min(2, 'Enter an address'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Enter a city'),
  state: z.string().optional(),
  postalCode: z.string().min(4, 'Enter a pincode'),
});
type Values = z.infer<typeof schema>;

export function AddressForm({
  onSubmit,
  submitting,
  defaultValues,
  submitLabel = 'Save address',
  onCancel,
}: {
  onSubmit: (values: AddressInput) => void;
  submitting?: boolean;
  defaultValues?: Partial<Values>;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues });

  const { lookupPincode } = usePincode();
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [autoFilledStatus, setAutoFilledStatus] = useState<string | null>(null);
  const [availableOffices, setAvailableOffices] = useState<string[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>('');

  const postalCode = watch('postalCode');

  // Auto-fill City & State when a valid 6-digit Pincode is typed
  useEffect(() => {
    const pin = (postalCode ?? '').trim();
    if (/^\d{6}$/.test(pin)) {
      let cancelled = false;
      setPincodeLoading(true);

      lookupPincode(pin).then((data) => {
        if (cancelled) return;
        setPincodeLoading(false);
        if (data) {
          if (data.city) setValue('city', data.city, { shouldValidate: true });
          if (data.state) setValue('state', data.state, { shouldValidate: true });
          const offices = data.offices ?? [];
          setAvailableOffices(offices);
          setAutoFilledStatus(`${data.city}, ${data.state}`);
          // Edit mode: pre-select the office already saved in the address line.
          const line1 = watch('line1') || '';
          const match = offices.find((o) => line1.includes(o));
          if (match) setSelectedOffice(match);
        } else {
          setAvailableOffices([]);
          setAutoFilledStatus(null);
        }
      });

      return () => {
        cancelled = true;
      };
    } else {
      setPincodeLoading(false);
      setAutoFilledStatus(null);
      setAvailableOffices([]);
      setSelectedOffice('');
    }
  }, [postalCode, lookupPincode, setValue, watch]);

  /** Called when user selects an Area / Post Office from the Shadcn Select dropdown */
  function handleOfficeSelect(office: string) {
    if (!office) return;
    setSelectedOffice(office);
    const currentLine = watch('line1') || '';
    if (!currentLine.includes(office)) {
      setValue('line1', currentLine ? `${office}, ${currentLine}` : office, {
        shouldValidate: true,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v))} className="grid grid-cols-2 gap-3">
      {/* Full Name */}
      <Field label="Full name" error={errors.fullName?.message} className="col-span-2">
        <Input {...register('fullName')} placeholder="John Doe" />
      </Field>

      {/* Phone */}
      <Field label="Phone" error={errors.phone?.message}>
        <Input {...register('phone')} type="tel" placeholder="9876543210" />
      </Field>

      {/* Pincode with loader & badge DIRECTLY below pincode field */}
      <Field label="Pincode" error={errors.postalCode?.message}>
        <div className="relative">
          <Input {...register('postalCode')} placeholder="e.g. 628204" maxLength={6} />
          {pincodeLoading && (
            <Loader2
              className="absolute right-2.5 top-2.5 animate-spin text-muted-foreground"
              size={16}
            />
          )}
        </div>
        {autoFilledStatus && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 size={13} className="shrink-0" />
            <span><span className="hidden sm:inline">Auto-filled: </span>{autoFilledStatus}</span>
          </div>
        )}
      </Field>

      {/* Post Office / Area selection using UI Select component with properly aligned arrow */}
      {availableOffices.length > 0 && (
        <div className="col-span-2 space-y-1.5">
          <Label>Select Area / Post Office (Optional)</Label>
          <Select value={selectedOffice} onValueChange={handleOfficeSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your local post office / area…" />
            </SelectTrigger>
            <SelectContent>
              {availableOffices.map((office) => (
                <SelectItem key={office} value={office}>
                  {office}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Address line 1 */}
      <Field label="Address line 1" error={errors.line1?.message} className="col-span-2">
        <Input
          {...register('line1')}
          placeholder="House / flat no, street, area"
        />
      </Field>

      {/* Address line 2 (optional) */}
      <Field label="Address line 2 (optional)" error={errors.line2?.message} className="col-span-2">
        <Input {...register('line2')} placeholder="Landmark, apartment name…" />
      </Field>

      {/* City + State */}
      <Field label="City" error={errors.city?.message}>
        <Input {...register('city')} placeholder="City" />
      </Field>
      <Field label="State" error={errors.state?.message}>
        <Input {...register('state')} placeholder="State" />
      </Field>

      <div className="col-span-2 mt-1 flex items-center gap-2">
        <Button type="submit" variant="primary" className="w-fit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
