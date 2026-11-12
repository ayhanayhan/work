export type ExtensionSurface='admin'|'storefront'|'checkout'|'customer'|'function'|'analytics';
export type ExtensionTargetDefinition={target:string;surface:ExtensionSurface;types:string[];risk:'LOW'|'STANDARD'|'PRIVILEGED';description:string;contextKeys:string[]};

export const EXTENSION_TARGETS:ExtensionTargetDefinition[]=[
  {target:'admin.dashboard.block',surface:'admin',types:['BLOCK'],risk:'LOW',description:'Admin dashboard generic block',contextKeys:['storeId','range']},
  {target:'admin.dashboard.kpi',surface:'admin',types:['KPI'],risk:'LOW',description:'Admin dashboard KPI card',contextKeys:['storeId','range']},
  {target:'admin.dashboard.chart',surface:'admin',types:['CHART'],risk:'LOW',description:'Admin dashboard chart',contextKeys:['storeId','range']},
  {target:'admin.dashboard.table',surface:'admin',types:['TABLE'],risk:'LOW',description:'Admin dashboard table',contextKeys:['storeId','range']},
  {target:'admin.dashboard.feed',surface:'admin',types:['FEED'],risk:'LOW',description:'Admin dashboard activity feed',contextKeys:['storeId','range']},
  {target:'admin.dashboard.alert',surface:'admin',types:['ALERT'],risk:'LOW',description:'Admin dashboard alert/status',contextKeys:['storeId','range']},
  {target:'admin.dashboard.action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Admin dashboard action',contextKeys:['storeId']},
  {target:'admin.navigation.item',surface:'admin',types:['NAVIGATION'],risk:'STANDARD',description:'Admin navigation item',contextKeys:[]},
  {target:'admin.product.list.action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Product list action',contextKeys:['productIds']},
  {target:'admin.product.list.bulk-action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Product bulk action',contextKeys:['productIds']},
  {target:'admin.product.detail.block',surface:'admin',types:['BLOCK'],risk:'STANDARD',description:'Product detail block',contextKeys:['productId','variantId']},
  {target:'admin.product.detail.action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Product detail action',contextKeys:['productId','variantId']},
  {target:'admin.product.form.section',surface:'admin',types:['BLOCK'],risk:'STANDARD',description:'Product editor section',contextKeys:['productId']},
  {target:'admin.order.list.action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Order list action',contextKeys:['orderIds']},
  {target:'admin.order.detail.block',surface:'admin',types:['BLOCK'],risk:'STANDARD',description:'Order detail block',contextKeys:['orderId']},
  {target:'admin.order.detail.action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Order detail action',contextKeys:['orderId']},
  {target:'admin.customer.detail.block',surface:'admin',types:['BLOCK'],risk:'STANDARD',description:'Customer detail block',contextKeys:['customerId']},
  {target:'admin.customer.detail.action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Customer detail action',contextKeys:['customerId']},
  {target:'admin.inventory.block',surface:'admin',types:['BLOCK'],risk:'STANDARD',description:'Inventory block',contextKeys:['variantId','warehouseId']},
  {target:'admin.inventory.action',surface:'admin',types:['ACTION'],risk:'STANDARD',description:'Inventory action',contextKeys:['variantId','warehouseId']},
  {target:'admin.marketing.block',surface:'admin',types:['BLOCK'],risk:'LOW',description:'Marketing block',contextKeys:[]},
  {target:'admin.reports.block',surface:'admin',types:['BLOCK'],risk:'LOW',description:'Reports block',contextKeys:[]},
  {target:'admin.pos.block',surface:'admin',types:['BLOCK'],risk:'STANDARD',description:'POS block',contextKeys:[]},
  {target:'admin.settings.page',surface:'admin',types:['PAGE'],risk:'STANDARD',description:'Application settings page',contextKeys:[]},

  {target:'storefront.header.before',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'Before storefront header',contextKeys:['page']},
  {target:'storefront.header.after',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'After storefront header',contextKeys:['page']},
  {target:'storefront.footer.before',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'Before storefront footer',contextKeys:['page']},
  {target:'storefront.footer.after',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'After storefront footer',contextKeys:['page']},
  {target:'storefront.home.section',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'Homepage section',contextKeys:['page']},
  {target:'storefront.collection.before-grid',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'Before collection grid',contextKeys:['collectionId']},
  {target:'storefront.collection.after-grid',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'After collection grid',contextKeys:['collectionId']},
  {target:'storefront.product.before-title',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'Before product title',contextKeys:['productId','variantId']},
  {target:'storefront.product.after-title',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'After product title',contextKeys:['productId','variantId']},
  {target:'storefront.product.after-price',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'After product price',contextKeys:['productId','variantId']},
  {target:'storefront.product.before-buy-button',surface:'storefront',types:['BLOCK'],risk:'STANDARD',description:'Before add-to-cart controls',contextKeys:['productId','variantId']},
  {target:'storefront.product.after-buy-button',surface:'storefront',types:['BLOCK'],risk:'STANDARD',description:'After add-to-cart controls',contextKeys:['productId','variantId']},
  {target:'storefront.product.tab',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'Product information tab',contextKeys:['productId','variantId']},
  {target:'storefront.cart.line',surface:'storefront',types:['BLOCK'],risk:'STANDARD',description:'Cart line extension',contextKeys:['cartToken','lineId','variantId']},
  {target:'storefront.cart.footer',surface:'storefront',types:['BLOCK'],risk:'STANDARD',description:'Cart footer extension',contextKeys:['cartToken']},
  {target:'storefront.search.block',surface:'storefront',types:['BLOCK'],risk:'LOW',description:'Search page block',contextKeys:['query']},
  {target:'storefront.account.dashboard',surface:'storefront',types:['BLOCK'],risk:'STANDARD',description:'Customer account dashboard',contextKeys:['customerId']},
  {target:'storefront.account.order-detail',surface:'storefront',types:['BLOCK'],risk:'STANDARD',description:'Customer order detail',contextKeys:['customerId','orderId']},

  {target:'checkout.contact',surface:'checkout',types:['BLOCK'],risk:'STANDARD',description:'Checkout contact step',contextKeys:['cartToken']},
  {target:'checkout.shipping',surface:'checkout',types:['BLOCK'],risk:'STANDARD',description:'Checkout shipping step',contextKeys:['cartToken']},
  {target:'checkout.delivery-options',surface:'checkout',types:['BLOCK'],risk:'STANDARD',description:'Checkout delivery options',contextKeys:['cartToken']},
  {target:'checkout.payment.before',surface:'checkout',types:['BLOCK'],risk:'PRIVILEGED',description:'Before payment controls',contextKeys:['cartToken']},
  {target:'checkout.payment.after',surface:'checkout',types:['BLOCK'],risk:'PRIVILEGED',description:'After payment controls',contextKeys:['cartToken']},
  {target:'checkout.summary',surface:'checkout',types:['BLOCK'],risk:'STANDARD',description:'Checkout summary',contextKeys:['cartToken']},
  {target:'checkout.thank-you',surface:'checkout',types:['BLOCK'],risk:'STANDARD',description:'Thank-you page',contextKeys:['orderId']},

  {target:'customer.account.navigation',surface:'customer',types:['NAVIGATION'],risk:'STANDARD',description:'Customer account navigation',contextKeys:['customerId']},
  {target:'customer.account.page',surface:'customer',types:['PAGE'],risk:'STANDARD',description:'Customer account page',contextKeys:['customerId']},

  {target:'analytics.web-pixel',surface:'analytics',types:['WEB_PIXEL'],risk:'PRIVILEGED',description:'Consent-aware analytics event consumer',contextKeys:['event']},

  {target:'function.cart.transform',surface:'function',types:['FUNCTION'],risk:'PRIVILEGED',description:'Server-side cart transformation contract',contextKeys:['cartId']},
  {target:'function.discount.evaluate',surface:'function',types:['FUNCTION'],risk:'PRIVILEGED',description:'Server-side discount evaluation contract',contextKeys:['cartId']},
  {target:'function.checkout.validation',surface:'function',types:['VALIDATOR'],risk:'PRIVILEGED',description:'Server-side checkout validation contract',contextKeys:['cartId']},
  {target:'function.shipping.rate',surface:'function',types:['FUNCTION'],risk:'PRIVILEGED',description:'Shipping rate contract',contextKeys:['cartId','address']},
  {target:'function.payment.filter',surface:'function',types:['FUNCTION'],risk:'PRIVILEGED',description:'Payment method filtering contract',contextKeys:['cartId']},
  {target:'function.order.risk',surface:'function',types:['FUNCTION'],risk:'PRIVILEGED',description:'Order risk signal contract',contextKeys:['orderId']},
];

const TARGET_MAP=new Map(EXTENSION_TARGETS.map(x=>[x.target,x]));
export function extensionTarget(target:string){return TARGET_MAP.get(String(target||'').trim())||null}
export function targetSurface(target:string):ExtensionSurface|null{return extensionTarget(target)?.surface||null}
export function isPublicExtensionTarget(target:string){const s=targetSurface(target);return s==='storefront'||s==='checkout'}
export function isPrivilegedTarget(target:string){return extensionTarget(target)?.risk==='PRIVILEGED'}
