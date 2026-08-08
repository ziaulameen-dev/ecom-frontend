'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { createReview, deleteReview, fetchAdminReviews } from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminReviews = () =>
  useQuery({ queryKey: adminKeys.reviews, queryFn: fetchAdminReviews });

export function useCreateReview() {
  const inv = useInvalidate(adminKeys.reviews);
  return useMutation({ mutationFn: createReview, onSuccess: inv });
}
export function useDeleteReview() {
  const inv = useInvalidate(adminKeys.reviews);
  return useMutation({ mutationFn: deleteReview, onSuccess: inv });
}
