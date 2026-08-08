'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import {
  adminCancelOrder,
  fetchAdminOrders,
  refundOrder,
  setTracking,
  updateOrderStatus,
} from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminOrders = () =>
  useQuery({ queryKey: adminKeys.orders, queryFn: fetchAdminOrders });

export function useUpdateOrderStatus() {
  const inv = useInvalidate(adminKeys.orders);
  return useMutation({ mutationFn: updateOrderStatus, onSuccess: inv });
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
