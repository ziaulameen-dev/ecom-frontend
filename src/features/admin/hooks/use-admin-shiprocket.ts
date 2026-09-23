import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignAwb,
  cancelShiprocketShipment,
  createShiprocketOrder,
  fetchPickupAddresses,
  fetchShippingRates,
  fetchShiprocketOrder,
  generateLabel,
  schedulePickup,
  trackShipment,
  advanceShiprocketState,
} from '../services/admin-shiprocket.service';

const keys = {
  order:   (id: string) => ['shiprocket', 'order', id] as const,
  rates:   (id: string) => ['shiprocket', 'rates', id] as const,
  track:   (id: string) => ['shiprocket', 'track', id] as const,
  pickups: ['shiprocket', 'pickup-addresses'] as const,
};

/** Get Shiprocket data for a single order. */
export function useShiprocketOrder(orderId: string) {
  return useQuery({
    queryKey: keys.order(orderId),
    queryFn:  () => fetchShiprocketOrder(orderId),
    retry: false,
  });
}

/** Get available courier rates for a given order. */
export function useShippingRates(orderId: string, enabled = false) {
  return useQuery({
    queryKey: keys.rates(orderId),
    queryFn:  () => fetchShippingRates(orderId),
    enabled,
  });
}

/** Get live tracking data. Enabled only when AWB is assigned. */
export function useTrackShipment(orderId: string, enabled = false) {
  return useQuery({
    queryKey: keys.track(orderId),
    queryFn:  () => trackShipment(orderId),
    enabled,
    refetchInterval: enabled ? 30_000 : false, // poll every 30s when open
  });
}

/** List pickup addresses configured on the Shiprocket account. */
export function usePickupAddresses() {
  return useQuery({
    queryKey: keys.pickups,
    queryFn:  fetchPickupAddresses,
  });
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

function useInvalidate(orderId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.order(orderId) });
}

/** Push order to Shiprocket. */
export function useCreateShiprocketOrder(orderId: string) {
  const invalidate = useInvalidate(orderId);
  return useMutation({ mutationFn: () => createShiprocketOrder(orderId), onSuccess: invalidate });
}

/** Assign courier + generate AWB. */
export function useAssignAwb(orderId: string) {
  const invalidate = useInvalidate(orderId);
  return useMutation({
    mutationFn: (courierId?: number) => assignAwb(orderId, courierId),
    onSuccess: invalidate,
  });
}

/** Schedule pickup. */
export function useSchedulePickup(orderId: string) {
  const invalidate = useInvalidate(orderId);
  return useMutation({
    mutationFn: (pickupDate?: string) => schedulePickup(orderId, pickupDate),
    onSuccess: invalidate,
  });
}

/** Generate or fetch label URL. */
export function useGenerateLabel(orderId: string) {
  const invalidate = useInvalidate(orderId);
  return useMutation({ mutationFn: () => generateLabel(orderId), onSuccess: invalidate });
}

/** Cancel Shiprocket shipment. */
export function useCancelShiprocketShipment(orderId: string) {
  const invalidate = useInvalidate(orderId);
  return useMutation({ mutationFn: () => cancelShiprocketShipment(orderId), onSuccess: invalidate });
}

/** Advance simulator tracking state (for testing simulator transitions). */
export function useAdvanceShiprocketState(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (awb: string) => advanceShiprocketState(awb),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.order(orderId) });
      qc.invalidateQueries({ queryKey: keys.track(orderId) });
    },
  });
}

