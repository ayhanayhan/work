export const CORE_EVENT_TOPICS = [
  'order.created','order.updated','order.paid','order.cancelled','order.fulfilled','order.refunded',
  'product.created','product.updated','product.deleted','variant.updated',
  'inventory.changed','inventory.low_stock',
  'customer.created','customer.updated',
  'cart.created','cart.updated','checkout.completed',
  'app.installed','app.enabled','app.disabled','app.uninstalled',
  'fulfillment.created','fulfillment.updated','refund.created','payment.updated',
] as const;

export function normalizeEventName(value: unknown) {
  const event=String(value||'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9_.:-]{1,119}$/.test(event)) throw new Error('Invalid event name');
  return event;
}

export function eventPatternMatches(pattern:string,event:string){
  if(pattern==='*') return true;
  if(pattern.endsWith('.*')) return event.startsWith(pattern.slice(0,-1));
  return pattern===event;
}
