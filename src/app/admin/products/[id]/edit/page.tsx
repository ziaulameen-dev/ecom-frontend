'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/features/admin/components/product-form';
import { useAdminProducts } from '@/features/admin';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: products, isLoading } = useAdminProducts();
  const product = products?.find((p) => p.id === id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!product) {
    return (
      <div className="space-y-3">
        <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to product list
        </Link>
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  return <ProductForm mode="edit" product={product} />;
}
