'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { fetchAdminReturns, returnAction } from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminReturns = () =>
  useQuery({ queryKey: adminKeys.returns, queryFn: fetchAdminReturns });

export function useReturnAction() {
  const inv = useInvalidate(adminKeys.returns);
  return useMutation({ mutationFn: returnAction, onSuccess: inv });
}
