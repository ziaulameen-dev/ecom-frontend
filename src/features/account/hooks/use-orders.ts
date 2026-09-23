'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountKeys } from '../keys';
import { cancelOrder, fetchMyOrders, fetchOrder, fetchOrderTracking, updateOrderAddress } from '../services/account.service';

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

export function useOrderTracking(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountKeys.orderTracking(id),
    queryFn: () => fetchOrderTracking(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    staleTime: 15_000,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) => cancelOrder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.orders }),
  });
}

export function useUpdateOrderAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      address: {
        fullName: string;
        phone: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
    }) => updateOrderAddress(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.orders }),
  });
}
