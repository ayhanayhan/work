export type SyncResult = { ok: boolean; externalId?: string; message?: string; data?: unknown };

/** Integration contracts intentionally live outside Commerce Core.
 * Future provider packages (Trendyol, iyzico, cargo, e-invoice) implement these interfaces.
 */
export interface MarketplaceProvider {
  readonly code: string;
  pushProduct(productId: string): Promise<SyncResult>;
  updateProduct(productId: string): Promise<SyncResult>;
  updateStock(variantId: string, quantity: number): Promise<SyncResult>;
  updatePrice(variantId: string, price: number): Promise<SyncResult>;
  pullOrders(since?: Date): Promise<SyncResult>;
  acknowledgeOrder(orderId: string): Promise<SyncResult>;
  cancelOrder(orderId: string): Promise<SyncResult>;
}

export interface PaymentProvider {
  readonly code: string;
  createPayment(orderId: string, amount: number, context?: unknown): Promise<SyncResult>;
  verifyPayment(reference: string): Promise<SyncResult>;
  cancelPayment(orderId: string): Promise<SyncResult>;
  refundPayment(orderId: string, amount?: number): Promise<SyncResult>;
}

export interface ShippingProvider {
  readonly code: string;
  getRates(input: unknown): Promise<SyncResult>;
  createShipment(orderId: string): Promise<SyncResult>;
  cancelShipment(shipmentId: string): Promise<SyncResult>;
  trackShipment(shipmentId: string): Promise<SyncResult>;
}

export interface InvoiceProvider {
  readonly code: string;
  createInvoice(orderId: string): Promise<SyncResult>;
  cancelInvoice(invoiceId: string): Promise<SyncResult>;
  getInvoice(invoiceId: string): Promise<SyncResult>;
}
