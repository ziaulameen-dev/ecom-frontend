'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAdminPayouts,
  useAdminReferrals,
  useAffiliateSettings,
  useDecidePayout,
  useSetAffiliateSettings,
} from '@/features/admin';
import type { PayoutStatus, ReferralStatus } from '@/lib/types';
import { formatDate, money } from '@/lib/utils';

const refBadge: Record<ReferralStatus, 'secondary' | 'success' | 'destructive'> = {
  pending: 'secondary', confirmed: 'secondary', matured: 'success', void: 'destructive',
};
const payBadge: Record<PayoutStatus, 'secondary' | 'success' | 'destructive' | 'default'> = {
  requested: 'secondary', approved: 'default', paid: 'success', rejected: 'destructive',
};

export default function AdminAffiliatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Affiliate &amp; Referrals</h1>
        <p className="text-sm text-muted-foreground">Commission settings, payout requests, and referral activity.</p>
      </div>
      <SettingsCard />
      <PayoutsCard />
      <ReferralsCard />
    </div>
  );
}

function SettingsCard() {
  const { data } = useAffiliateSettings();
  const save = useSetAffiliateSettings();
  const [f, setF] = useState({ commission: '', threshold: '', minPayout: '' });
  const [seeded, setSeeded] = useState(false);
  if (!seeded && data) {
    setSeeded(true);
    setF({
      commission: String(data.commissionMinor / 100),
      threshold: String(data.unlockThreshold),
      minPayout: String(data.minPayoutMinor / 100),
    });
  }

  async function submit() {
    try {
      await save.mutateAsync({
        commissionMinor: Math.round(Number(f.commission) * 100),
        unlockThreshold: Number(f.threshold),
        minPayoutMinor: Math.round(Number(f.minPayout) * 100),
      });
      toast.success('Settings saved');
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Program settings</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-commission">Commission per order (₹)</Label>
          <Input id="a-commission" type="number" min={0} value={f.commission} onChange={(e) => setF({ ...f, commission: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-threshold">Referrals to unlock</Label>
          <Input id="a-threshold" type="number" min={1} value={f.threshold} onChange={(e) => setF({ ...f, threshold: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-minpayout">Minimum payout (₹)</Label>
          <Input id="a-minpayout" type="number" min={0} value={f.minPayout} onChange={(e) => setF({ ...f, minPayout: e.target.value })} />
        </div>
        <div className="sm:col-span-3">
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutsCard() {
  const { data: payouts, isLoading } = useAdminPayouts();
  const decide = useDecidePayout();
  const act = (id: string, status: PayoutStatus) =>
    decide.mutate({ id, status }, { onSuccess: () => toast.success('Updated'), onError: (e) => toast.error((e as Error).message) });

  return (
    <Card>
      <CardHeader><CardTitle>Payout requests</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground">Loading…</p>
          : !payouts?.length ? <p className="text-sm text-muted-foreground">No payout requests.</p>
            : (
              <div className="divide-y text-sm">
                {payouts.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="font-medium">{p.userEmail ?? p.userId.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.method === 'upi'
                          ? `UPI: ${p.upiId ?? '—'}`
                          : `A/C: ${p.accountNumber ?? '—'} · IFSC: ${p.ifsc ?? '—'}${p.accountName ? ` · ${p.accountName}` : ''}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.verified && p.verifiedName
                          ? <span className="text-emerald-600 dark:text-emerald-400">✓ Verified: {p.verifiedName}</span>
                          : 'Unverified'}
                        {' · '}{formatDate(p.createdAt)}{p.note ? ` · ${p.note}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{money(p.amountMinor, 'INR')}</span>
                      <Badge variant={payBadge[p.status]}>{p.status}</Badge>
                      {p.status === 'requested' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => act(p.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => act(p.id, 'rejected')}>Reject</Button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <Button size="sm" variant="primary" onClick={() => act(p.id, 'paid')}>Mark paid</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </CardContent>
    </Card>
  );
}

function ReferralsCard() {
  const { data: referrals, isLoading } = useAdminReferrals();
  return (
    <Card>
      <CardHeader><CardTitle>Referrals</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground">Loading…</p>
          : !referrals?.length ? <p className="text-sm text-muted-foreground">No referrals yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Order</th>
                      <th className="py-2 pr-4 font-medium">Referrer</th>
                      <th className="py-2 pr-4 font-medium">Buyer</th>
                      <th className="py-2 pr-4 font-medium">Commission</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono">{r.orderReference ?? r.orderId.slice(0, 8)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{r.referrerUserId.slice(0, 8)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{r.buyerUserId.slice(0, 8)}</td>
                        <td className="py-2 pr-4">{money(r.commissionMinor, 'INR')}</td>
                        <td className="py-2 pr-4"><Badge variant={refBadge[r.status]}>{r.status}</Badge></td>
                        <td className="py-2 text-muted-foreground">{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </CardContent>
    </Card>
  );
}
