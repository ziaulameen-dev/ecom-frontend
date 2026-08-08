'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { createCoupon, deleteCoupon, fetchAdminCoupons } from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminCoupons = () =>
  useQuery({ queryKey: adminKeys.coupons, queryFn: fetchAdminCoupons });

export function useCreateCoupon() {
  const inv = useInvalidate(adminKeys.coupons);
  return useMutation({ mutationFn: createCoupon, onSuccess: inv });
}
export function useDeleteCoupon() {
  const inv = useInvalidate(adminKeys.coupons);
  return useMutation({ mutationFn: deleteCoupon, onSuccess: inv });
}
