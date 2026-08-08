'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { createCategory, deleteCategory, fetchAdminCategories } from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminCategories = () =>
  useQuery({ queryKey: adminKeys.categories, queryFn: fetchAdminCategories });

export function useCreateCategory() {
  const inv = useInvalidate(adminKeys.categories);
  return useMutation({ mutationFn: createCategory, onSuccess: inv });
}
export function useDeleteCategory() {
  const inv = useInvalidate(adminKeys.categories);
  return useMutation({ mutationFn: deleteCategory, onSuccess: inv });
}
