'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import { fetchAnnouncement, setAnnouncement } from '../services/catalog.service';

/** The storefront announcement bar (public). */
export const useAnnouncement = () =>
  useQuery({ queryKey: catalogKeys.announcement, queryFn: fetchAnnouncement });

/** Admin: set the announcement messages + on/off state. */
export function useSetAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setAnnouncement,
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.announcement }),
  });
}
