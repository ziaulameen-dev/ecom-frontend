'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import {
  addAttributeValue,
  createAttributeType,
  deleteAttributeType,
  deleteAttributeValue,
  fetchAdminAttributes,
  updateAttributeType,
} from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminAttributes = () =>
  useQuery({ queryKey: adminKeys.attributes, queryFn: fetchAdminAttributes });

export function useCreateAttributeType() {
  const inv = useInvalidate(adminKeys.attributes);
  return useMutation({ mutationFn: createAttributeType, onSuccess: inv });
}
export function useUpdateAttributeType() {
  const inv = useInvalidate(adminKeys.attributes);
  return useMutation({ mutationFn: updateAttributeType, onSuccess: inv });
}
export function useAddAttributeValue() {
  const inv = useInvalidate(adminKeys.attributes);
  return useMutation({ mutationFn: addAttributeValue, onSuccess: inv });
}
export function useDeleteAttributeType() {
  const inv = useInvalidate(adminKeys.attributes);
  return useMutation({ mutationFn: deleteAttributeType, onSuccess: inv });
}
export function useDeleteAttributeValue() {
  const inv = useInvalidate(adminKeys.attributes);
  return useMutation({ mutationFn: deleteAttributeValue, onSuccess: inv });
}
