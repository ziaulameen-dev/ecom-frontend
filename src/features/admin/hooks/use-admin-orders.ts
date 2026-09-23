'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminOrdersQuery } from '@/lib/types';
import { adminKeys } from '../keys';
import {
  adminCancelOrder,
  fetchAdminOrder,
  fetchAdminOrders,
  refundOrder,
  setTracking,
  shipOrder,
  updateOrderStatus,
} from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminOrders = (query?: AdminOrdersQuery) =>
  useQuery({
    queryKey: [...adminKeys.orders, query ?? {}],
    queryFn: () => fetchAdminOrders(query),
    // Keep the admin view fresh for new/updated orders even if the SSE live
    // channel drops: refetch on focus and poll every 20s while the tab is open.
    refetchOnWindowFocus: true,
    refetchInterval: 20_000,
  });

/** Fetch a single order directly by id — bypasses the 500-order list cache. */
export const useAdminOrder = (id: string) =>
  useQuery({
    queryKey: [...adminKeys.orders, 'detail', id],
    queryFn: () => fetchAdminOrder(id),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });

export function useUpdateOrderStatus() {
  const inv = useInvalidate(adminKeys.orders);
  return useMutation({ mutationFn: updateOrderStatus, onSuccess: inv });
}

/**
 * Atomically ships an order: sets carrier + tracking number AND transitions
 * status to 'shipped' in a single API call. Prefer this over chaining
 * useSetTracking + useUpdateOrderStatus.
 */
export function useShipOrder() {
  const inv = useInvalidate(adminKeys.orders);
  return useMutation({ mutationFn: shipOrder, onSuccess: inv });
}

export function useSetTracking() {
  const inv = useInvalidate(adminKeys.orders);
  return useMutation({ mutationFn: setTracking, onSuccess: inv });
}
export function useAdminCancelOrder() {
  const inv = useInvalidate(adminKeys.orders);
  return useMutation({ mutationFn: adminCancelOrder, onSuccess: inv });
}
export function useRefundOrder() {
  const inv = useInvalidate(adminKeys.orders);
  return useMutation({ mutationFn: refundOrder, onSuccess: inv });
}
