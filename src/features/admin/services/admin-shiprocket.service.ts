import { api } from '@/lib/api-client';
import type { ShiprocketCourier, ShiprocketOrderData } from '@/lib/types';

const base = (orderId: string) => `/api/shiprocket/orders/${orderId}`;

/** Fetch current Shiprocket data for an order (null if not created yet). */
export function fetchShiprocketOrder(orderId: string) {
  return api.get<ShiprocketOrderData | null>(base(orderId));
}

/** Push an order to Shiprocket — creates the Shiprocket order record. */
export function createShiprocketOrder(orderId: string) {
  return api.post<ShiprocketOrderData>(`${base(orderId)}/create`, {});
}

/** Assign a courier and generate AWB number. */
export function assignAwb(orderId: string, courierId?: number) {
  return api.post<ShiprocketOrderData>(`${base(orderId)}/awb`, courierId ? { courierId } : {});
}

/** Schedule courier pickup. */
export function schedulePickup(orderId: string, pickupDate?: string) {
  return api.post<{ success: boolean; pickupDate: string }>(
    `${base(orderId)}/pickup`,
    pickupDate ? { pickupDate } : {},
  );
}

/** Get shipping label PDF URL. */
export function generateLabel(orderId: string) {
  return api.get<{ labelUrl: string | null }>(`${base(orderId)}/label`);
}

/** Get live tracking data from Shiprocket. */
export function trackShipment(orderId: string) {
  return api.get<any>(`${base(orderId)}/track`);
}

/** Get available courier rates for this order's destination. */
export function fetchShippingRates(orderId: string) {
  return api.get<ShiprocketCourier[]>(`${base(orderId)}/rates`);
}

/** Cancel the Shiprocket shipment for an order. */
export function cancelShiprocketShipment(orderId: string) {
  return api.del<{ message: string }>(base(orderId));
}

/** List configured pickup addresses from Shiprocket account. */
export function fetchPickupAddresses() {
  return api.get<any[]>('/api/shiprocket/pickup-addresses');
}

/** Advance simulator tracking state (simulator debug endpoint). */
export function advanceShiprocketState(awb: string) {
  return api.post<{ success: boolean; current_status?: string; message?: string }>(
    `/api/shiprocket-sim/v1/external/debug/advance/${awb}`,
    {},
  );
}

