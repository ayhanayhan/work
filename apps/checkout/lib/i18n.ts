export type UiLocale='tr-TR'|'en-US';

const tr={
  'common.optional':'isteğe bağlı','common.edit':'Düzenle','common.free':'Ücretsiz','common.apply':'Uygula','common.close':'Kapat',
  'checkout.loading':'Güvenli ödeme hazırlanıyor…','checkout.openFailed':'Checkout açılamadı','checkout.sessionMissing':'Checkout oturumu eksik','checkout.returnStore':'Mağazaya dön',
  'checkout.steps.address':'Adres','checkout.steps.shipping':'Teslimat','checkout.steps.payment':'Ödeme',
  'checkout.contact.title':'İletişim bilgileri','checkout.contact.firstName':'Ad','checkout.contact.lastName':'Soyad','checkout.contact.phone':'Telefon','checkout.contact.email':'E-posta','checkout.contact.emailOptional':'E-posta (isteğe bağlı)','checkout.contact.phoneRequiredHelp':'Teslimat ve sipariş güncellemeleri için telefon zorunludur.','checkout.contact.marketing':'Beni haberlerden ve özel tekliflerden haberdar et',
  'checkout.address.billing':'Fatura adresi','checkout.address.line1':'Adres','checkout.address.line2':'Adres devamı','checkout.address.line2Placeholder':'Apartman, daire, şirket vb.','checkout.address.country':'Ülke / Bölge','checkout.address.postal':'Posta kodu','checkout.address.state':'İl / Eyalet','checkout.address.district':'İlçe','checkout.address.selectState':'İl seçin','checkout.address.selectDistrict':'İlçe seçin','checkout.address.invoiceToggle':'Fatura bilgisi girin','checkout.address.company':'Firma / Kurum adı','checkout.address.shippingDifferent':'Teslimat adresim farklı olsun',
  'checkout.actions.continueShipping':'Teslimata devam et','checkout.actions.continuePayment':'Ödemeye devam et','checkout.actions.completeOrder':'Siparişi Tamamla','checkout.actions.processing':'İşleniyor…',
  'checkout.shipping.help':'Siparişiniz için uygun teslimat yöntemini seçin.','checkout.payment.help':'Tüm ödeme işlemleri güvenli bağlantı üzerinden gerçekleştirilir.','checkout.payment.note':'Sipariş notu','checkout.payment.notePlaceholder':'Siparişinizle ilgili bir not ekleyin','checkout.payment.secure':'Ödemeler güvenli ve şifrelidir',
  'checkout.summary.addDiscount':'İndirim kodu ekle','checkout.summary.discountCode':'İndirim kodu','checkout.summary.subtotal':'Ara toplam','checkout.summary.discount':'İndirim','checkout.summary.shipping':'Teslimat / Kargo','checkout.summary.paymentFee':'Ödeme hizmet bedeli','checkout.summary.tax':'Vergi','checkout.summary.total':'Toplam','checkout.summary.promoGift':'Promosyon hediyesi',
  'checkout.footer.returns':'İade Politikası','checkout.footer.privacy':'Gizlilik Politikası','checkout.footer.terms':'Hizmet Şartları','checkout.footer.designedBy':'Designed by',
  'checkout.errors.phoneInvalid':'Geçerli bir telefon numarası girin.','checkout.errors.phoneRequired':'Telefon numarası zorunludur.','checkout.errors.shippingRequired':'Devam etmek için bir teslimat yöntemi seçin.','checkout.errors.steps':'Lütfen checkout adımlarını sırayla tamamlayın.','checkout.errors.session':'Checkout oturumu açılamadı','checkout.header.securePayment':'Güvenli ödeme','checkout.header.login':'Giriş yap','checkout.shipping.free':'Ücretsiz','checkout.shipping.taxIncluded':'KDV dahil','checkout.payment.bankTransferDetails':'Havale / EFT bilgileri','checkout.payment.bankName':'Banka','checkout.payment.accountHolder':'Hesap sahibi',
  'checkout.login.question':'Zaten hesabınız var mı?','checkout.login.action':'Giriş yap','checkout.emptyCart':'Sepetiniz boş','checkout.products':'Ürünlere dön',
};

const en:Record<string,string>={
  'common.optional':'optional','common.edit':'Edit','common.free':'Free','common.apply':'Apply','common.close':'Close',
  'checkout.loading':'Preparing secure checkout…','checkout.openFailed':'Checkout could not be opened','checkout.sessionMissing':'Checkout session is incomplete','checkout.returnStore':'Return to store',
  'checkout.steps.address':'Address','checkout.steps.shipping':'Shipping','checkout.steps.payment':'Payment',
  'checkout.contact.title':'Contact information','checkout.contact.firstName':'First name','checkout.contact.lastName':'Last name','checkout.contact.phone':'Phone','checkout.contact.email':'Email','checkout.contact.emailOptional':'Email (optional)','checkout.contact.phoneRequiredHelp':'A phone number is required for delivery and order updates.','checkout.contact.marketing':'Keep me updated with news and special offers',
  'checkout.address.billing':'Billing address','checkout.address.line1':'Address','checkout.address.line2':'Address line 2','checkout.address.line2Placeholder':'Apartment, suite, company, etc.','checkout.address.country':'Country / Region','checkout.address.postal':'Postal code','checkout.address.state':'State / Province','checkout.address.district':'District','checkout.address.selectState':'Select state','checkout.address.selectDistrict':'Select district','checkout.address.invoiceToggle':'Enter invoice details','checkout.address.company':'Company / Organization name','checkout.address.shippingDifferent':'Use a different shipping address',
  'checkout.actions.continueShipping':'Continue to shipping','checkout.actions.continuePayment':'Continue to payment','checkout.actions.completeOrder':'Complete order','checkout.actions.processing':'Processing…',
  'checkout.shipping.help':'Choose a shipping method for your order.','checkout.payment.help':'All payment transactions are completed over a secure connection.','checkout.payment.note':'Order note','checkout.payment.notePlaceholder':'Add a note about your order','checkout.payment.secure':'Payments are secure and encrypted',
  'checkout.summary.addDiscount':'Add discount code','checkout.summary.discountCode':'Discount code','checkout.summary.subtotal':'Subtotal','checkout.summary.discount':'Discount','checkout.summary.shipping':'Shipping','checkout.summary.paymentFee':'Payment fee','checkout.summary.tax':'Tax','checkout.summary.total':'Total','checkout.summary.promoGift':'Promotion gift',
  'checkout.footer.returns':'Returns Policy','checkout.footer.privacy':'Privacy Policy','checkout.footer.terms':'Terms of Service','checkout.footer.designedBy':'Designed by',
  'checkout.errors.phoneInvalid':'Enter a valid phone number.','checkout.errors.phoneRequired':'Phone number is required.','checkout.errors.shippingRequired':'Choose a shipping method to continue.','checkout.errors.steps':'Complete checkout steps in order.','checkout.errors.session':'Checkout session could not be opened','checkout.header.securePayment':'Secure payment','checkout.header.login':'Sign in','checkout.shipping.free':'Free','checkout.shipping.taxIncluded':'Tax included','checkout.payment.bankTransferDetails':'Bank transfer details','checkout.payment.bankName':'Bank','checkout.payment.accountHolder':'Account holder',
  'checkout.login.question':'Already have an account?','checkout.login.action':'Sign in','checkout.emptyCart':'Your cart is empty','checkout.products':'Return to products',
};

function normalizeLocale(locale?:string):UiLocale{
  return String(locale||'tr-TR').toLowerCase().startsWith('en')?'en-US':'tr-TR';
}
export function uiText(key:string,locale?:string){
  const l=normalizeLocale(locale);const dict=l==='en-US'?en:tr as Record<string,string>;
  return dict[key]??tr[key as keyof typeof tr]??key;
}
export function currentUiLocale(){
  if(typeof window==='undefined')return 'tr-TR';
  return localStorage.getItem('commerce-locale')||document.documentElement.lang||navigator.language||'tr-TR';
}
