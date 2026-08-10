'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { fetchSubscribers, notifyProduct, sendBroadcast } from '../services/admin.service';

export const useSubscribers = () =>
  useQuery({ queryKey: adminKeys.subscribers, queryFn: fetchSubscribers });

export function useBroadcast() {
  return useMutation({ mutationFn: sendBroadcast });
}

export function useNotifyProduct() {
  return useMutation({ mutationFn: notifyProduct });
}
