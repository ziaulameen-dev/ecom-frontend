'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

function ConfirmInner() {
  const sp = useSearchParams();
  const email = sp.get('email') ?? '';
  const token = sp.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/newsletter/confirm?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then(() => alive && setState('done'))
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [email, token]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Confirm subscription</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {state === 'loading' && 'Confirming…'}
        {state === 'done' && `You're subscribed! ${email} will now receive our updates.`}
        {state === 'error' && 'This confirmation link is invalid or has expired.'}
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button variant="outline">Back to store</Button>
      </Link>
    </div>
  );
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center text-muted-foreground">Loading…</div>}>
      <ConfirmInner />
    </Suspense>
  );
}
