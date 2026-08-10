'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import { fetchContent, setContent } from '../services/catalog.service';

/** Store-wide content: FAQ + footer socials (public). */
export const useContent = () =>
  useQuery({ queryKey: catalogKeys.content, queryFn: fetchContent });

/** Admin: update FAQ and/or socials, then refresh the storefront copy. */
export function useSetContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setContent,
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.content }),
  });
}
