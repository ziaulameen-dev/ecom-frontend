'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { api } from '@/lib/api-client';
import { API_BASE } from '@/lib/config';
import { cartId } from '@/lib/session';
import { GoogleIcon } from './google-icon';

/** Global passwordless-login modal (mounted once in Providers). */
export function LoginModal() {
  const { open, next, close } = useAuthModal();
  const router = useRouter();
  const qc = useQueryClient();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
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
        await api.post('/api/cart/merge').catch(() => {});
        cartId.clear();
        qc.invalidateQueries({ queryKey: authKeys.me });
        qc.invalidateQueries({ queryKey: ['cart'] });
        toast.success('Signed in with Google');
      })();
    } else if (result === 'google_error') {
      toast.error('Google sign-in failed. Please try again.');
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
    setStep('email'); setEmail(''); setOtp(''); setName(''); setGender(''); setIsNewUser(false);
  }

  function loginWithGoogle() {
    // Full-page navigation to the auth-service (a different origin), which
    // bounces to Google and back, setting the session cookies before returning
    // to the frontend. This is an external URL, so router.push() won't do.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${API_BASE}/auth/google`;
  }

  async function sendCode(e: React.SyntheticEvent) {
    e.preventDefault();
    try {
      const challenge = await requestOtp.mutateAsync(email.trim());
      setIsNewUser(challenge.isNewUser);
      setStep('otp');
      toast.success('Code sent — check your email');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function verify(e: React.SyntheticEvent) {
    e.preventDefault();
    try {
      await verifyOtp.mutateAsync({
        email: email.trim(),
        otp: otp.trim(),
        name: name.trim() || undefined,
        gender: gender || undefined,
      });
      await api.post('/api/cart/merge').catch(() => {});
      cartId.clear();
      toast.success('Welcome!');
      const dest = next;
      close();
      reset();
      if (dest) router.push(dest);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { close(); reset(); } }}>
      <DialogContent>
        <DialogHeader className="items-center text-center sm:text-center">
          <DialogTitle className="text-xl">
            {step === 'email' ? 'Sign in or create account' : 'Enter your code'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email'
              ? 'Passwordless — we’ll email you a 6-digit code.'
              : `We sent a 6-digit code to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <div className="space-y-4">
            <Button type="button" variant="outline" className="w-full h-12" onClick={loginWithGoogle}>
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
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="m-email">Email</Label>
                <Input className="h-12" id="m-email" type="email" required autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full h-12" disabled={requestOtp.isPending}>
                {requestOtp.isPending ? 'Sending…' : 'Send code'}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="m-otp">6-digit code</Label>
              <Input className="h-12" id="m-otp" inputMode="numeric" maxLength={6} required autoFocus placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            {isNewUser && (
              <>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="m-name">Name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input className="h-12" id="m-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2.5">
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
            <Button type="submit" className="w-full h-12" disabled={verifyOtp.isPending}>
              {verifyOtp.isPending ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
              ← Use a different email
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
