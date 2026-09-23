export type StorefrontLocale='tr-TR'|'en-US';
const tr={
  'system.storeLoading':'Mağaza yükleniyor…','system.checkoutLoading':'Güvenli ödeme hazırlanıyor…','system.checkoutFailed':'Checkout açılamadı','system.returnCart':'Sepete dön','system.section':'Bölüm',
  'cart.title':'Sepet','cart.empty':'Sepetiniz boş','cart.checkout':'Ödemeye geç','cart.continue':'Alışverişe devam et','cart.remove':'Kaldır','cart.update':'Güncelle',
  'product.addToCart':'Sepete ekle','product.soldOut':'Stokta yok','product.quickView':'Hızlı görünüm','product.quantity':'Adet',
  'account.signIn':'Giriş yap','account.signOut':'Çıkış yap','account.myAccount':'Hesabım','account.orders':'Siparişlerim','account.addresses':'Adreslerim',
  'search.title':'Arama','search.placeholder':'Ara','common.loading':'Yükleniyor…','common.close':'Kapat','common.save':'Kaydet','common.cancel':'Vazgeç'
};
const en:Record<string,string>={
  'system.storeLoading':'Loading store…','system.checkoutLoading':'Preparing secure checkout…','system.checkoutFailed':'Checkout could not be opened','system.returnCart':'Return to cart','system.section':'Section',
  'cart.title':'Cart','cart.empty':'Your cart is empty','cart.checkout':'Checkout','cart.continue':'Continue shopping','cart.remove':'Remove','cart.update':'Update',
  'product.addToCart':'Add to cart','product.soldOut':'Sold out','product.quickView':'Quick view','product.quantity':'Quantity',
  'account.signIn':'Sign in','account.signOut':'Sign out','account.myAccount':'My account','account.orders':'Orders','account.addresses':'Addresses',
  'search.title':'Search','search.placeholder':'Search','common.loading':'Loading…','common.close':'Close','common.save':'Save','common.cancel':'Cancel'
};
export function storefrontLocale(locale?:string):StorefrontLocale{return String(locale||'tr-TR').toLowerCase().startsWith('en')?'en-US':'tr-TR'}
export function sfText(key:string,locale?:string){const d=storefrontLocale(locale)==='en-US'?en:tr as Record<string,string>;return d[key]??tr[key as keyof typeof tr]??key}
export function currentStorefrontLocale(){if(typeof window==='undefined')return 'tr-TR';return localStorage.getItem('commerce-locale')||document.documentElement.lang||navigator.language||'tr-TR'}
