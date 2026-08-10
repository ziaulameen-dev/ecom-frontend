'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../keys';
import { fetchAdminReturns, returnAction } from '../services/admin.service';

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export const useAdminReturns = () =>
  useQuery({
    queryKey: adminKeys.returns,
    queryFn: fetchAdminReturns,
    // Keep the admin view fresh for customer-created returns even if the SSE
    // live channel drops (EventSource can't refresh the access token): refetch
    // on focus and poll every 20s while the tab is open.
    refetchOnWindowFocus: true,
    refetchInterval: 20_000,
  });

export function useReturnAction() {
  const inv = useInvalidate(adminKeys.returns);
  return useMutation({ mutationFn: returnAction, onSuccess: inv });
}
