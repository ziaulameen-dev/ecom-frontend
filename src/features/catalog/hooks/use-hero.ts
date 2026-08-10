'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '../keys';
import {
  createHero,
  deleteHero,
  fetchHero,
  reorderHero,
  setHeroAspect,
  updateHero,
} from '../services/catalog.service';

/** The homepage hero banners (public). */
export const useHero = () =>
  useQuery({ queryKey: catalogKeys.hero, queryFn: fetchHero });

function useHeroInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: catalogKeys.hero });
}

/** Admin: add a hero banner. */
export function useCreateHero() {
  const inv = useHeroInvalidate();
  return useMutation({ mutationFn: createHero, onSuccess: inv });
}

/** Admin: edit a hero banner. */
export function useUpdateHero() {
  const inv = useHeroInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<{ imageUrl: string; linkUrl: string }>) =>
      updateHero(id, input),
    onSuccess: inv,
  });
}

/** Admin: persist a new banner order. */
export function useReorderHero() {
  const inv = useHeroInvalidate();
  return useMutation({ mutationFn: reorderHero, onSuccess: inv });
}

/** Admin: set the store-wide hero aspect ratio. */
export function useSetHeroAspect() {
  const inv = useHeroInvalidate();
  return useMutation({ mutationFn: setHeroAspect, onSuccess: inv });
}

/** Admin: remove a hero banner. */
export function useDeleteHero() {
  const inv = useHeroInvalidate();
  return useMutation({ mutationFn: deleteHero, onSuccess: inv });
}
