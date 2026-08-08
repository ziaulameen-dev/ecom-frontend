'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import {
  addVariant,
  createProduct,
  deleteProduct,
  deleteVariant,
  fetchAdminProducts,
  updateProduct,
  updateVariant,
} from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminProducts = () =>
  useQuery({ queryKey: adminKeys.products, queryFn: fetchAdminProducts });

export function useCreateProduct() {
  const inv = useInvalidate(adminKeys.products);
  return useMutation({ mutationFn: createProduct, onSuccess: inv });
}
export function useUpdateProduct() {
  const inv = useInvalidate(adminKeys.products);
  return useMutation({ mutationFn: updateProduct, onSuccess: inv });
}
export function useDeleteProduct() {
  const inv = useInvalidate(adminKeys.products);
  return useMutation({ mutationFn: deleteProduct, onSuccess: inv });
}
export function useAddVariant() {
  const inv = useInvalidate(adminKeys.products);
  return useMutation({ mutationFn: addVariant, onSuccess: inv });
}
export function useUpdateVariant() {
  const inv = useInvalidate(adminKeys.products);
  return useMutation({ mutationFn: updateVariant, onSuccess: inv });
}
export function useDeleteVariant() {
  const inv = useInvalidate(adminKeys.products);
  return useMutation({ mutationFn: deleteVariant, onSuccess: inv });
}
