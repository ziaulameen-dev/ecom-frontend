'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountKeys } from '../keys';
import {
  createAddress, deleteAddress, fetchAddresses, updateAddress,
} from '../services/account.service';
import type { AddressInput } from '../types';

export function useAddresses() {
  return useQuery({ queryKey: accountKeys.addresses, queryFn: () => fetchAddresses() });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddressInput) => createAddress(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddressInput }) => updateAddress(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });
}
