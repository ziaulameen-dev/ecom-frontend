'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth';
import { updateProfile } from '../services/account.service';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; mobile?: string; gender?: string }) => updateProfile(input),
    onSuccess: (user) => qc.setQueryData(authKeys.me, user),
  });
}
