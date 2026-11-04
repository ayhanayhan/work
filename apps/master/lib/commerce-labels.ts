export type CommerceDisplay = Record<string, string | undefined | null> | undefined | null;

const LABELS: Record<string, string> = {
  // Order
  PENDING_PAYMENT: 'Ödeme bekliyor', PROCESSING: 'Hazırlanıyor', FULFILLED: 'Tamamlandı', COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi', REFUNDED: 'İade edildi', PARTIALLY_REFUNDED: 'Kısmi iade',
  // Payment
  PENDING: 'Bekliyor', PAID: 'Ödendi', FAILED: 'Başarısız', SUCCEEDED: 'Başarılı', AUTHORIZED: 'Onaylandı',
  REQUIRES_ACTION: 'İşlem gerekli', CREATED: 'Oluşturuldu', SETTLED: 'Kapatıldı', OPEN: 'Açık',
  // Fulfillment / shipment
  UNFULFILLED: 'Gönderilmedi', PARTIALLY_FULFILLED: 'Kısmi gönderildi', DELIVERED: 'Teslim edildi', SHIPPED: 'Kargoya verildi',
  IN_TRANSIT: 'Yolda', READY: 'Hazır',
  // Common operation history
  NOTE: 'Not', ITEMS_EDITED: 'Ürünler düzenlendi', POS_ORDER_CREATED: 'POS siparişi oluşturuldu', MANUAL_ORDER_CREATED: 'Manuel sipariş oluşturuldu',
  DETAILS_UPDATED: 'Sipariş bilgileri güncellendi', INVOICE_CREATED: 'E-belge oluşturuldu', RISK_UPDATED: 'Risk değerlendirmesi güncellendi',
  // Draft / return / exchange
  DRAFT: 'Taslak', REQUESTED: 'Talep edildi', APPROVED: 'Onaylandı', REJECTED: 'Reddedildi', RECEIVED: 'Teslim alındı',
  INSPECTED: 'Kontrol edildi', EXCHANGED: 'Değiştirildi', REQUIRED: 'Bekleniyor',
  // Risk
  NORMAL: 'Normal', REVIEW: 'Kontrol gerekli', HIGH: 'Yüksek risk',
  // Sources
  storefront: 'Mağaza', web: 'Mağaza', pos: 'POS / Hızlı Satış', manual_order: 'Manuel Sipariş', admin: 'Yönetim Paneli',
  marketplace: 'Pazaryeri', exchange: 'Değişim', api: 'API',
  // Payment methods
  POS: 'POS', MANUAL: 'Manuel', STRIPE: 'Stripe', POS_CARD: 'Kart', CARD: 'Kart', CREDIT_CARD: 'Kredi / Banka Kartı', CASH: 'Nakit', BANK_TRANSFER: 'Havale / EFT',
  bank_transfer: 'Havale / EFT', COD: 'Kapıda Ödeme', POS_CASH: 'Nakit', EXCHANGE_ADJUSTMENT: 'Değişim Farkı', EXCHANGE_CREDIT: 'Değişim Kredisi',
  // Delivery / shipping methods
  PICKUP: 'Mağazadan Teslim', POS_PICKUP: 'Mağazadan Teslim', SHIPPING: 'Kargo', COURIER: 'Kurye', DELIVERY: 'Teslimat',
  // Transactions
  SALE: 'Satış', CAPTURE: 'Tahsilat', REFUND: 'Geri ödeme', VOID: 'İptal', AUTHORIZE: 'Provizyon',
};

function generic(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const direct = LABELS[raw] || LABELS[raw.toUpperCase()] || LABELS[raw.toLowerCase()];
  if (direct) return direct;
  return raw.replace(/[_-]+/g, ' ').toLocaleLowerCase('tr-TR').replace(/(^|\s)\p{L}/gu, (m) => m.toLocaleUpperCase('tr-TR'));
}

export function commerceLabel(value: unknown, displayValue?: unknown) {
  const display = String(displayValue ?? '').trim();
  return display || generic(value);
}

export function orderStatusLabel(orderOrValue: any) {
  return commerceLabel(orderOrValue?.status ?? orderOrValue, orderOrValue?.display?.status);
}
export function paymentStatusLabel(orderOrValue: any) {
  return commerceLabel(orderOrValue?.paymentStatus ?? orderOrValue, orderOrValue?.display?.paymentStatus);
}
export function fulfillmentStatusLabel(orderOrValue: any) {
  return commerceLabel(orderOrValue?.fulfillmentStatus ?? orderOrValue, orderOrValue?.display?.fulfillmentStatus);
}
export function paymentMethodLabel(orderOrValue: any) {
  return commerceLabel(orderOrValue?.paymentMethod ?? orderOrValue, orderOrValue?.display?.paymentMethod);
}
export function shippingMethodLabel(orderOrValue: any) {
  const raw = orderOrValue?.shippingMethod ?? orderOrValue?.metadata?.manualOrder?.deliveryType ?? orderOrValue?.metadata?.pos?.deliveryType ?? orderOrValue;
  return commerceLabel(raw, orderOrValue?.display?.shippingMethod);
}
export function orderSourceLabel(orderOrValue: any) {
  return commerceLabel(orderOrValue?.source ?? orderOrValue, orderOrValue?.display?.source);
}
export function riskLabel(orderOrValue: any) {
  return commerceLabel(orderOrValue?.riskLevel ?? orderOrValue, orderOrValue?.display?.risk);
}
export function invoiceStatusLabel(value: any, display?: CommerceDisplay) {
  return commerceLabel(value, display?.invoiceStatus);
}
export function operationStatusLabel(value: any, displayValue?: any) {
  return commerceLabel(value, displayValue);
}
export function transactionTypeLabel(value: any, displayValue?: any) {
  return commerceLabel(value, displayValue);
}
export function transactionStatusLabel(value: any, displayValue?: any) {
  return commerceLabel(value, displayValue);
}

export function commerceNoteLabel(note: unknown) {
  let out = String(note ?? '').trim();
  if (!out) return '';
  const tokens = Object.keys(LABELS).sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    if (!token || token === token.toLowerCase()) continue;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(^|[^A-Z0-9_])(${escaped})(?=$|[^A-Z0-9_])`, 'g'), (_, p1) => `${p1}${LABELS[token]}`);
  }
  return out;
}
