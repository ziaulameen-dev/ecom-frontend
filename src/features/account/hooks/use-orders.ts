'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountKeys } from '../keys';
import { cancelOrder, fetchMyOrders, fetchOrder } from '../services/account.service';

export function useMyOrders() {
  return useQuery({ queryKey: accountKeys.orders, queryFn: () => fetchMyOrders() });
}

export function useOrder(id: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: accountKeys.order(id),
    queryFn: () => fetchOrder(id),
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) => cancelOrder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.orders }),
  });
}
