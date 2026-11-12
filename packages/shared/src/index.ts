export type CommerceEvent =
  | 'product.created' | 'product.updated' | 'inventory.updated'
  | 'customer.created' | 'order.created' | 'order.paid'
  | 'order.cancelled' | 'order.fulfilled' | 'order.refunded';
