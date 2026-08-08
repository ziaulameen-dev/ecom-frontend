'use client';

import { useQuery } from '@tanstack/react-query';
import { authKeys } from '../keys';
import { fetchMe } from '../services/auth.service';

/** Current user (null when logged out). Auth rides in the HttpOnly cookie. */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await fetchMe();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}
