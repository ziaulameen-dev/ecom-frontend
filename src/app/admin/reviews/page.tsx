'use client';

import { MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { RatingStars } from '@/components/rating-stars';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminProducts, useAdminReviews, useCreateReview, useDeleteReview,
} from '@/features/admin';
import type { Review } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function AdminReviewsPage() {
  const { data: products } = useAdminProducts();
  const { data: reviews, isLoading } = useAdminReviews();

  const nameOf = (id: string) => products?.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (reviews ?? []).filter((r) => {
      if (rating !== 'all' && r.rating !== Number(rating)) return false;
      if (
        q
        && !r.authorName.toLowerCase().includes(q)
        && !r.body.toLowerCase().includes(q)
        && !(r.title ?? '').toLowerCase().includes(q)
        && !nameOf(r.productId).toLowerCase().includes(q)
      ) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews, products, search, rating]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reviews</h1>
          <p className="text-sm text-muted-foreground">{reviews?.length ?? 0} reviews</p>
        </div>
        <ReviewDialog trigger={<Button><Plus className="size-4" /> Add Review</Button>} />
      </div>

      {/* Toolbar / filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by author, review or product…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3" colSpan={6}><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No reviews found.</td></tr>
              ) : (
                filtered.map((r) => <ReviewRow key={r.id} review={r} productName={nameOf(r.productId)} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReviewRow({ review, productName }: { review: Review; productName: string }) {
  const del = useDeleteReview();
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="min-w-0 max-w-56 truncate font-medium">{productName}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <RatingStars value={review.rating} />
          <span className="text-xs text-muted-foreground">{review.rating}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{review.authorName}</td>
      <td className="px-4 py-3">
        <div className="min-w-0 max-w-80">
          {review.title && <div className="truncate font-medium">{review.title}</div>}
          <div className="truncate text-muted-foreground">{review.body}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(review.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => { if (await confirm({ title: 'Delete review?', description: `The review by "${review.authorName}" will be removed.`, confirmText: 'Delete', destructive: true })) del.mutate(review.id, { onError: (e) => toast.error((e as Error).message) }); }}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

/** Add a review in a dialog — same create hook + payload as before. */
function ReviewDialog({ trigger }: { trigger: React.ReactNode }) {
  const { data: products } = useAdminProducts();
  const create = useCreateReview();

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ productId: '', rating: 5, title: '', body: '', authorName: '' });

  // Effective product: user's choice, or default to the first product.
  const productId = f.productId || products?.[0]?.id || '';

  async function submit() {
    try {
      await create.mutateAsync({
        productId, rating: Number(f.rating),
        title: f.title || undefined, body: f.body, authorName: f.authorName,
      });
      setF((s) => ({ ...s, title: '', body: '', authorName: '' }));
      toast.success('Review added');
      setOpen(false);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add review</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={(v) => setF({ ...f, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rating</Label>
              <Select value={String(f.rating)} onValueChange={(v) => setF({ ...f, rating: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-author">Author</Label>
            <Input id="r-author" value={f.authorName} onChange={(e) => setF({ ...f, authorName: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-title">Title <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="r-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-body">Review</Label>
            <Textarea id="r-body" className="min-h-24" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!productId || f.body.length < 2 || f.authorName.length < 2 || create.isPending}
            >
              {create.isPending ? 'Saving…' : 'Add review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
