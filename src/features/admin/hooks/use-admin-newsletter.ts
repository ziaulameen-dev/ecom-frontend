'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import {
  fetchCustomers,
  fetchSubscribers,
  notifyProduct,
  sendBroadcast,
} from '../services/admin.service';

export const useSubscribers = () =>
  useQuery({ queryKey: adminKeys.subscribers, queryFn: fetchSubscribers });

export const useCustomers = () =>
  useQuery({ queryKey: adminKeys.customers, queryFn: fetchCustomers });

export function useBroadcast() {
  return useMutation({ mutationFn: sendBroadcast });
}

export function useNotifyProduct() {
  return useMutation({ mutationFn: notifyProduct });
}
