'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authKeys } from '@/features/auth/keys';
import { useRequestOtp } from '@/features/auth/hooks/use-request-otp';
import { useVerifyOtp } from '@/features/auth/hooks/use-verify-otp';
import { useAuthModal } from '@/features/auth/store/auth-modal.store';
import { cartKeys } from '@/features/cart/keys';
import { api } from '@/lib/api-client';
import { API_BASE } from '@/lib/config';
import { cartId } from '@/lib/session';
import type { CartView } from '@/lib/types';
import { useMediaQuery } from '@/lib/use-media-query';
import { GoogleIcon } from './google-icon';

/** Global passwordless-login modal (mounted once in Providers).
 *  Desktop (sm+): Centered Dialog modal.
 *  Mobile (<sm): Bottom Drawer that slides up from the bottom.
 */
export function LoginModal() {
  const { open, next, close } = useAuthModal();
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const router = useRouter();
  const qc = useQueryClient();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Only first-time accounts get the (optional) name/gender fields on the code step.
  const [isNewUser, setIsNewUser] = useState(false);

  // Handle the redirect back from Google (auth-service adds ?auth=…). On
  // success the session cookies are already set — merge the guest cart, refresh
  // the user, and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('auth');
    if (!result) return;

    if (result === 'google_success') {
      (async () => {
        try {
          const merged = await api.post<CartView>('/api/cart/merge');
          if (merged?.id) {
            qc.setQueryData(cartKeys.cart, merged);
          }
        } catch {
          qc.invalidateQueries({ queryKey: cartKeys.cart });
        } finally {
          cartId.clear();
        }
        qc.invalidateQueries({ queryKey: authKeys.me });
      })();
    } else if (result === 'google_error') {
      setError('Google sign-in failed. Please try again.');
    }

    params.delete('auth');
    const qs = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (qs ? `?${qs}` : ''),
    );
  }, [qc]);

  function reset() {
    setStep('email');
    setEmail('');
    setOtp('');
    setName('');
    setGender('');
    setError(null);
    setIsNewUser(false);
  }

  function loginWithGoogle() {
    window.location.href = `${API_BASE}/auth/google`;
  }

  async function sendCode(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    try {
      const challenge = await requestOtp.mutateAsync(email.trim());
      setIsNewUser(challenge.isNewUser);
      setStep('otp');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submitOtp(code = otp) {
    if (code.trim().length < 6 || verifyOtp.isPending) return;
    setError(null);
    try {
      await verifyOtp.mutateAsync({
        email: email.trim(),
        otp: code.trim(),
        name: name.trim() || undefined,
        gender: gender || undefined,
      });
      const dest = next;
      close();
      reset();
      if (dest) router.push(dest);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const formBody = (
    <>
      {error && (
        <div className="rounded-xs bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 dark:text-red-400 text-center font-medium">
          {error}
        </div>
      )}

      {step === 'email' ? (
        <div className="space-y-4">
          <Button type="button" variant="outline" className="w-full h-12 text-sm font-medium" onClick={loginWithGoogle}>
            <GoogleIcon className="size-5" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-xs text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={sendCode} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-email">Email</Label>
              <Input
                className="h-12"
                id="m-email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            <Button type="submit" variant="primary" className="w-full h-12 font-semibold" disabled={requestOtp.isPending}>
              {requestOtp.isPending ? 'Sending…' : 'Send code'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); submitOtp(); }} className="space-y-4">
          <div className="flex flex-col items-center gap-2.5">
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (error) setError(null);
              }}
              onComplete={(code) => { if (!isNewUser) submitOtp(code); }}
            />
          </div>
          {isNewUser && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="m-name">Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input className="h-12" id="m-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Gender <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Helps us show you the most relevant products first.</p>
              </div>
            </>
          )}
          <Button type="submit" variant="primary" className="w-full h-12 font-semibold" disabled={verifyOtp.isPending || otp.trim().length < 6}>
            {verifyOtp.isPending ? 'Verifying…' : 'Verify & continue'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setError(null);
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Use a different email
          </button>
        </form>
      )}
    </>
  );

  // Desktop Dialog view
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { close(); reset(); } }}>
        <DialogContent>
          <DialogHeader className="items-center text-center sm:text-center pb-2">
            <DialogTitle className="text-xl font-bold">
              {step === 'email' ? 'Sign in or create account' : 'Enter your code'}
            </DialogTitle>
            <DialogDescription>
              {step === 'email'
                ? 'Passwordless — we’ll email you a 6-digit code.'
                : `We sent a 6-digit code to ${email}`}
            </DialogDescription>
          </DialogHeader>
          {formBody}
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile Bottom Drawer view
  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) { close(); reset(); } }}>
      <DrawerContent className="px-5 pt-3 pb-8 rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <DrawerHeader className="items-center text-center pb-2">
          <DrawerTitle className="text-xl font-bold">
            {step === 'email' ? 'Sign in or create account' : 'Enter your code'}
          </DrawerTitle>
          <DrawerDescription>
            {step === 'email'
              ? 'Passwordless — we’ll email you a 6-digit code.'
              : `We sent a 6-digit code to ${email}`}
          </DrawerDescription>
        </DrawerHeader>
        {formBody}
      </DrawerContent>
    </Drawer>
  );
}
