export const ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['FULFILLED', 'CANCELLED', 'REFUNDED'],
  FULFILLED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export const PAYMENT_ATTEMPT_TRANSITIONS: Record<string, readonly string[]> = {
  CREATED: ['REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'UNKNOWN'],
  REQUIRES_ACTION: ['PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'UNKNOWN'],
  PROCESSING: ['SUCCEEDED', 'FAILED', 'CANCELLED', 'UNKNOWN'],
  FAILED: ['PROCESSING', 'CANCELLED'],
  UNKNOWN: ['PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
  SUCCEEDED: [],
  CANCELLED: [],
};

export const PAYMENT_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ['PAID', 'FAILED'],
  FAILED: ['PENDING', 'PAID'],
  PAID: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  REFUNDED: [],
};

export const FULFILLMENT_TRANSITIONS: Record<string, readonly string[]> = {
  UNFULFILLED: ['PARTIALLY_FULFILLED', 'FULFILLED'],
  PARTIALLY_FULFILLED: ['FULFILLED'],
  FULFILLED: [],
};

export const REFUND_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ['PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
  PROCESSING: ['SUCCEEDED', 'FAILED', 'CANCELLED'],
  FAILED: ['PENDING', 'PROCESSING', 'CANCELLED'],
  SUCCEEDED: [],
  CANCELLED: [],
};

export const RETURN_TRANSITIONS: Record<string, readonly string[]> = {
  REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['RECEIVED', 'REJECTED', 'CANCELLED'],
  RECEIVED: ['INSPECTED', 'REFUNDED', 'EXCHANGED', 'REJECTED'],
  INSPECTED: ['REFUNDED', 'EXCHANGED', 'REJECTED'],
  REFUNDED: [],
  EXCHANGED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(map: Record<string, readonly string[]>, from: unknown, to: unknown): boolean {
  const a = String(from || '').toUpperCase();
  const b = String(to || '').toUpperCase();
  if (!a || !b) return false;
  if (a === b) return true;
  return Boolean(map[a]?.includes(b));
}

export function assertTransition(kind: string, map: Record<string, readonly string[]>, from: unknown, to: unknown): void {
  if (!canTransition(map, from, to)) {
    throw new Error(`Invalid ${kind} status transition: ${String(from)} -> ${String(to)}`);
  }
}

export function deriveOrderStatus(input: { paymentStatus: string; fulfillmentStatus: string; currentStatus: string }): string {
  const payment = String(input.paymentStatus || '').toUpperCase();
  const fulfillment = String(input.fulfillmentStatus || '').toUpperCase();
  const current = String(input.currentStatus || '').toUpperCase();
  if (current === 'CANCELLED' || current === 'REFUNDED') return current;
  if (payment === 'REFUNDED') return 'REFUNDED';
  if (fulfillment === 'FULFILLED') return 'FULFILLED';
  if (payment === 'PAID' && ['DRAFT', 'PENDING_PAYMENT', 'PAID'].includes(current)) return 'PROCESSING';
  if (payment === 'PENDING' && current === 'DRAFT') return 'PENDING_PAYMENT';
  return current;
}
