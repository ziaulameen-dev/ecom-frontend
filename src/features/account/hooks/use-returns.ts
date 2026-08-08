'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderItem } from '@/lib/types';
import { accountKeys } from '../keys';
import { fetchMyReturns, requestReturn } from '../services/account.service';

export function useMyReturns() {
  return useQuery({ queryKey: accountKeys.returns, queryFn: () => fetchMyReturns() });
}

/** Create a return for the whole order, then upload evidence images (if any). */
export function useRequestReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; reason?: string; items: OrderItem[]; files: File[] }) =>
      requestReturn(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.returns });
      qc.invalidateQueries({ queryKey: accountKeys.orders });
    },
  });
}
