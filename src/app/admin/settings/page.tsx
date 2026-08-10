'use client';

import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminProducts,
  useBroadcast,
  useNotifyProduct,
  useSetShippingRate,
  useShippingRate,
  useSubscribers,
  useUploadProductImage,
} from '@/features/admin';
import {
  useAnnouncement,
  useContent,
  useCreateHero,
  useDeleteHero,
  useHero,
  useReorderHero,
  useSetAnnouncement,
  useSetContent,
  useSetHeroAspect,
  useUpdateHero,
} from '@/features/catalog';
import type { FaqItem, HeroBanner, SocialLink } from '@/lib/types';
import { cn, mediaSrc, money } from '@/lib/utils';

const toPaise = (rupees: string) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise: number) => (paise / 100).toFixed(2);

const TABS = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'hero', label: 'Homepage hero' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'faq', label: 'FAQ' },
  { id: 'social', label: 'Social links' },
  { id: 'newsletter', label: 'Newsletter' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<TabId>('shipping');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Store-wide configuration.</p>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm',
              tab === t.id
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shipping' && <ShippingCard />}
      {tab === 'hero' && <HeroManager />}
      {tab === 'announcement' && <AnnouncementCard />}
      {tab === 'faq' && <FaqCard />}
      {tab === 'social' && <SocialCard />}
      {tab === 'newsletter' && <NewsletterCard />}
    </div>
  );
}

/* ------------------------------------------------------------------ Shipping */

function ShippingCard() {
  const { data, isLoading } = useShippingRate();
  const setRate = useSetShippingRate();
  const [form, setForm] = useState({ amount: 0, rupees: '' });
  const [syncedFrom, setSyncedFrom] = useState<number | null>(null);
  const { amount, rupees } = form;

  if (data && data.amountMinor !== syncedFrom) {
    setSyncedFrom(data.amountMinor);
    setForm({ amount: data.amountMinor, rupees: toRupees(data.amountMinor) });
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-base">Shipping</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="delivery-charge">Flat delivery charge (₹)</Label>
            <Input
              id="delivery-charge"
              type="number"
              step="0.01"
              min={0}
              value={rupees}
              onChange={(e) => setForm({ amount: toPaise(e.target.value), rupees: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Currently {money(amount)} — applied to every order at checkout.
            </p>
          </div>
        )}

        <Button
          onClick={() =>
            setRate.mutate(Number(amount), {
              onSuccess: () => toast.success('Saved'),
              onError: (e) => toast.error((e as Error).message),
            })
          }
          disabled={setRate.isPending || isLoading}
        >
          {setRate.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- Hero banners */

function HeroManager() {
  const { data: hero, isLoading } = useHero();
  const create = useCreateHero();
  const update = useUpdateHero();
  const reorder = useReorderHero();
  const del = useDeleteHero();
  const setAspect = useSetHeroAspect();
  const banners = hero?.banners;

  const [items, setItems] = useState<HeroBanner[]>([]);
  const [sig, setSig] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<HeroBanner | null>(null);
  const [aw, setAw] = useState('500');
  const [ah, setAh] = useState('265');
  const [aspectSynced, setAspectSynced] = useState(false);
  const dragIndex = useRef<number | null>(null);

  // Seed/refresh the local ordered copy whenever the set of banners changes.
  const nextSig = (banners ?? []).map((b) => b.id).join(',');
  if (banners && nextSig !== sig) {
    setSig(nextSig);
    setItems(banners);
  }
  // Seed the shared aspect ratio once from the config.
  if (hero && !aspectSynced) {
    setAspectSynced(true);
    setAw(String(hero.aspectWidth));
    setAh(String(hero.aspectHeight));
  }

  const ratioW = Number(aw) || 500;
  const ratioH = Number(ah) || 265;

  function onDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setItems(next);
    setSig(next.map((b) => b.id).join(','));
    reorder.mutate(
      next.map((b) => b.id),
      { onError: (e) => toast.error((e as Error).message) },
    );
  }

  async function remove(id: string) {
    if (!(await confirm({ title: 'Remove this banner?', confirmText: 'Remove', destructive: true }))) return;
    del.mutate(id, {
      onSuccess: () => toast.success('Banner removed'),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <div className="space-y-4">
      {/* Shared aspect ratio for all banners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aspect ratio (all banners)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Input type="number" min={1} value={aw} onChange={(e) => setAw(e.target.value)} className="w-24" aria-label="Aspect width" />
            <span className="text-muted-foreground">×</span>
            <Input type="number" min={1} value={ah} onChange={(e) => setAh(e.target.value)} className="w-24" aria-label="Aspect height" />
          </div>
          <Button
            size="sm"
            onClick={() =>
              setAspect.mutate(
                { aspectWidth: ratioW, aspectHeight: ratioH },
                { onSuccess: () => toast.success('Ratio saved'), onError: (e: Error) => toast.error(e.message) },
              )
            }
            disabled={setAspect.isPending}
          >
            {setAspect.isPending ? 'Saving…' : 'Save ratio'}
          </Button>
          <p className="w-full text-xs text-muted-foreground">Applies to every hero banner (default 500 × 265).</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Drag to reorder — shown as a carousel on the homepage.</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>Add banner</Button>
      </div>

      <Card>
        <CardContent className="space-y-2 p-3">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !items.length ? (
            <p className="p-4 text-sm text-muted-foreground">
              No banners yet — a default image shows on the homepage. Add one (or more, for a carousel).
            </p>
          ) : (
            items.map((b, i) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className="flex items-center gap-3 rounded-lg border bg-card p-2"
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">
                  {b.imageUrl && (
                    <Image src={mediaSrc(b.imageUrl)} alt="" width={80} height={48} unoptimized className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate font-medium">{b.linkUrl}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(b)} aria-label="Edit banner">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(b.id)} disabled={del.isPending} aria-label="Remove banner">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {addOpen && (
        <BannerDialog
          saving={create.isPending}
          aspectWidth={ratioW}
          aspectHeight={ratioH}
          onClose={() => setAddOpen(false)}
          onSave={(d) =>
            create.mutate(d, {
              onSuccess: () => {
                toast.success('Banner added');
                setAddOpen(false);
              },
              onError: (e) => toast.error((e as Error).message),
            })
          }
        />
      )}
      {editing && (
        <BannerDialog
          initial={editing}
          saving={update.isPending}
          aspectWidth={ratioW}
          aspectHeight={ratioH}
          onClose={() => setEditing(null)}
          onSave={(d) =>
            update.mutate(
              { id: editing.id, ...d },
              {
                onSuccess: () => {
                  toast.success('Banner updated');
                  setEditing(null);
                },
                onError: (e) => toast.error((e as Error).message),
              },
            )
          }
        />
      )}
    </div>
  );
}

/** Add/edit dialog. The image is uploaded only on submit, so an accidental
 * refresh before saving never leaves an orphaned upload. */
function BannerDialog({
  initial, onClose, onSave, saving, aspectWidth, aspectHeight,
}: {
  initial?: HeroBanner;
  onClose: () => void;
  onSave: (d: { imageUrl: string; linkUrl: string }) => void;
  saving: boolean;
  aspectWidth: number;
  aspectHeight: number;
}) {
  const upload = useUploadProductImage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initial?.imageUrl ? mediaSrc(initial.imageUrl) : null,
  );
  const [link, setLink] = useState(initial?.linkUrl ?? '');
  const [busy, setBusy] = useState(false);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  async function submit() {
    if (!file && !initial?.imageUrl) return toast.error('Choose an image first');
    setBusy(true);
    try {
      let imageUrl = initial?.imageUrl ?? '';
      if (file) {
        const { url } = await upload.mutateAsync(file); // upload happens now, on save
        imageUrl = url;
      }
      onSave({ imageUrl, linkUrl: link.trim() || '/shop' });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit banner' : 'Add banner'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="relative w-full overflow-hidden rounded-lg border bg-muted"
            style={{ aspectRatio: `${aspectWidth} / ${aspectHeight}` }}
          >
            {preview ? (
              <Image src={preview} alt="Banner preview" width={800} height={450} unoptimized className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">Preview</div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bf-file">Banner image</Label>
            <Input id="bf-file" type="file" accept="image/*" onChange={pickFile} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bf-link">Click-through link</Label>
            <Input id="bf-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/shop?category=watches" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || saving}>
            {busy || saving ? 'Saving…' : initial ? 'Save' : 'Add'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- Announcement */

function AnnouncementCard() {
  const { data } = useAnnouncement();
  const save = useSetAnnouncement();
  const [text, setText] = useState('');
  const [active, setActive] = useState(true);
  const [synced, setSynced] = useState(false);

  if (data && !synced) {
    setSynced(true);
    setText(data.messages.join('\n'));
    setActive(data.active);
  }

  function submit() {
    const messages = text.split('\n').map((s) => s.trim()).filter(Boolean);
    save.mutate(
      { messages, active },
      {
        onSuccess: () => toast.success('Saved'),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Announcement bar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4" />
          Show the announcement bar
        </label>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ann-msgs">Messages (one per line)</Label>
          <Textarea
            id="ann-msgs"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Free shipping over ₹4,999\nFestive sale — up to 40% off'}
          />
          <p className="text-xs text-muted-foreground">They scroll as a marquee. Leave empty (or turn off) to hide the bar.</p>
        </div>

        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------------- FAQ */

function FaqCard() {
  const { data: content } = useContent();
  const save = useSetContent();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [synced, setSynced] = useState(false);

  if (content && !synced) {
    setSynced(true);
    setFaqs(content.faqs ?? []);
  }

  const setAt = (i: number, patch: Partial<FaqItem>) =>
    setFaqs((list) => list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  function submit() {
    const cleaned = faqs
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question && f.answer);
    save.mutate(
      { faqs: cleaned },
      { onSuccess: () => toast.success('FAQ saved'), onError: (e) => toast.error((e as Error).message) },
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">FAQ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {faqs.length === 0 && <p className="text-sm text-muted-foreground">No questions yet — add one below.</p>}

        {faqs.map((f, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Input value={f.question} onChange={(e) => setAt(i, { question: e.target.value })} placeholder="Question" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove question"
                onClick={() => setFaqs((list) => list.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea rows={3} value={f.answer} onChange={(e) => setAt(i, { answer: e.target.value })} placeholder="Answer" />
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFaqs((l) => [...l, { question: '', answer: '' }])}>
            Add question
          </Button>
          <Button size="sm" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ Social links */

function SocialCard() {
  const { data: content } = useContent();
  const save = useSetContent();
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [synced, setSynced] = useState(false);

  if (content && !synced) {
    setSynced(true);
    setSocials(content.socials ?? []);
  }

  const setAt = (i: number, patch: Partial<SocialLink>) =>
    setSocials((list) => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  function submit() {
    const cleaned = socials
      .map((s) => ({ label: s.label.trim(), url: s.url.trim() }))
      .filter((s) => s.label && s.url);
    save.mutate(
      { socials: cleaned },
      { onSuccess: () => toast.success('Social links saved'), onError: (e) => toast.error((e as Error).message) },
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Social links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {socials.length === 0 && <p className="text-sm text-muted-foreground">No links yet — add one below.</p>}

        {socials.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="w-40 shrink-0" value={s.label} onChange={(e) => setAt(i, { label: e.target.value })} placeholder="Label (e.g. Instagram)" />
            <Input value={s.url} onChange={(e) => setAt(i, { url: e.target.value })} placeholder="https://…" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove link"
              onClick={() => setSocials((list) => list.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSocials((l) => [...l, { label: '', url: '' }])}>
            Add link
          </Button>
          <Button size="sm" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- Newsletter */

function NewsletterCard() {
  const { data: subs, isLoading } = useSubscribers();
  const broadcast = useBroadcast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const active = (subs ?? []).filter((s) => s.status === 'active');

  function send() {
    if (subject.trim().length < 2 || body.trim().length < 2) {
      return toast.error('Add a subject and message');
    }
    const html = body
      .split('\n')
      .map((line) => `<p>${line.replace(/</g, '&lt;')}</p>`)
      .join('');
    broadcast.mutate(
      { subject: subject.trim(), html },
      {
        onSuccess: (r) => {
          toast.success(`Sent to ${r.sent} of ${r.total} subscribers`);
          setSubject('');
          setBody('');
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send a broadcast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-subject">Subject</Label>
            <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="New arrivals just dropped 🎉" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-body">Message</Label>
            <Textarea id="nl-body" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'Hi there,\n\nCheck out our latest products…'} />
            <p className="text-xs text-muted-foreground">
              Sends to {active.length} active subscriber{active.length === 1 ? '' : 's'}. An unsubscribe link is added automatically.
            </p>
          </div>
          <Button onClick={send} disabled={broadcast.isPending || active.length === 0}>
            {broadcast.isPending ? 'Sending…' : 'Send broadcast'}
          </Button>

          <div className="border-t pt-4">
            <AnnounceProduct disabled={active.length === 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Subscribers{subs ? ` (${active.length} active / ${subs.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !subs?.length ? (
            <p className="text-sm text-muted-foreground">No subscribers yet.</p>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto text-sm">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 border-b py-1.5 last:border-0">
                  <span className={cn('truncate', s.status === 'unsubscribed' && 'text-muted-foreground line-through')}>{s.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Email active subscribers a "new arrival" for a chosen product. */
function AnnounceProduct({ disabled }: { disabled?: boolean }) {
  const { data: products } = useAdminProducts();
  const notify = useNotifyProduct();
  const [productId, setProductId] = useState('');

  function send() {
    if (!productId) return toast.error('Pick a product');
    notify.mutate(productId, {
      onSuccess: (r) => toast.success(`Sent to ${r.sent} of ${r.total} subscribers`),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="nl-product">Announce a product (new arrival)</Label>
      <div className="flex gap-2">
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger id="nl-product" className="min-w-0 flex-1">
            <SelectValue placeholder="Select a product…" />
          </SelectTrigger>
          <SelectContent>
            {(products ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={send} disabled={notify.isPending || disabled || !productId}>
          {notify.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
