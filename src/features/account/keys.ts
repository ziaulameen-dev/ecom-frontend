/** React Query keys for the account feature. */
export const accountKeys = {
  addresses: ['addresses'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  returns: ['my-returns'] as const,
};
