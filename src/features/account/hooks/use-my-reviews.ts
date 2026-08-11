'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountKeys } from '../keys';
import {
  fetchMyReviews,
  fetchReviewable,
  submitReview,
} from '../services/account.service';

/** Products the customer can review (delivered, not yet reviewed). */
export function useReviewable() {
  return useQuery({ queryKey: accountKeys.reviewable, queryFn: fetchReviewable });
}

/** Reviews the customer has already written. */
export function useMyReviews() {
  return useQuery({ queryKey: accountKeys.myReviews, queryFn: fetchMyReviews });
}

/** Submit a review; refreshes both the reviewable list and the user's reviews. */
export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.reviewable });
      qc.invalidateQueries({ queryKey: accountKeys.myReviews });
    },
  });
}
