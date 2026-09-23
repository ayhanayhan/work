export type PromotionCartItem = {
  variantId: string;
  productId: string;
  sku: string;
  categoryIds: string[];
  quantity: number;
  unitPrice: number;
  brandId?: string | null;
};
export type PromotionContext = {
  subtotal: number;
  items: PromotionCartItem[];
  currency: string;
  customerTags: string[];
  customerOrderCount: number;
  couponCodes: string[];
  exchangeRate: number;
  shippingCountry?: string;
  customerId?: string | null;
  customerGroupId?: string | null;
  customerName?: string;
  customerBirthDate?: string | null;
  now?: Date;
};

function eligibleItems(items: PromotionCartItem[], action: any) {
  const productIds = Array.isArray(action.productIds) ? action.productIds : [];
  const categoryIds = Array.isArray(action.categoryIds) ? action.categoryIds : [];
  const variantIds = Array.isArray(action.variantIds) ? action.variantIds : [];
  if (!productIds.length && !categoryIds.length && !variantIds.length) return items;
  return items.filter(i => productIds.includes(i.productId) || variantIds.includes(i.variantId) || i.categoryIds.some(c => categoryIds.includes(c)));
}

function conditionMatches(c: any, ctx: PromotionContext) {
  const type = String(c?.type || '');
  const value = Number(c?.value || 0);
  if (type === 'subtotal_min') return ctx.subtotal >= value * ctx.exchangeRate;
  if (type === 'subtotal_max') return ctx.subtotal <= value * ctx.exchangeRate;
  if (type === 'total_quantity_min') return ctx.items.reduce((a,i)=>a+i.quantity,0) >= value;
  if (type === 'total_quantity_max') return ctx.items.reduce((a,i)=>a+i.quantity,0) <= value;
  if (type === 'product_quantity') return ctx.items.filter(i=>i.productId===c.productId).reduce((a,i)=>a+i.quantity,0) >= Number(c.quantity || 1);
  if (type === 'category_quantity') return ctx.items.filter(i=>i.categoryIds.includes(c.categoryId)).reduce((a,i)=>a+i.quantity,0) >= Number(c.quantity || 1);
  if (type === 'sku_quantity') return ctx.items.filter(i=>i.sku===c.sku).reduce((a,i)=>a+i.quantity,0) >= Number(c.quantity || 1);
  if (type === 'customer_tag') return ctx.customerTags.includes(String(c.tag || ''));
  if (type === 'customer_is_new') return ctx.customerOrderCount === 0;
  if (type === 'currency') return ctx.currency === String(c.code || '').toUpperCase();
  if (type === 'shipping_country') return !!ctx.shippingCountry && ctx.shippingCountry === String(c.country || '').toUpperCase();
  if (type === 'login_required') return c.value === false ? !ctx.customerId : !!ctx.customerId;
  if (type === 'brand') return ctx.items.some(i=>i.brandId===String(c.brandId||''));
  if (type === 'customer_group') return !!ctx.customerGroupId && ctx.customerGroupId===String(c.groupId||'');
  if (type === 'customer_order_count_min') return ctx.customerOrderCount >= value;
  if (type === 'customer_order_count_max') return ctx.customerOrderCount <= value;
  if (type === 'customer_name') return String(ctx.customerName||'').toLocaleLowerCase('tr').includes(String(c.value||'').toLocaleLowerCase('tr'));
  if (type === 'customer_birthday') {
    if(!ctx.customerBirthDate)return false;const birth=new Date(ctx.customerBirthDate);const now=ctx.now||new Date();return birth.getMonth()===now.getMonth()&&birth.getDate()===now.getDate();
  }
  if (type === 'time_range') {
    const now=ctx.now||new Date();const current=now.getHours()*60+now.getMinutes();const parse=(raw:any)=>{const [h,m]=String(raw||'00:00').split(':').map(Number);return h*60+(m||0)};const start=parse(c.start);const end=parse(c.end||'23:59');return start<=end?current>=start&&current<=end:current>=start||current<=end;
  }
  return false;
}

function customerEligible(raw:any,ctx:PromotionContext){
  if(!raw)return true;
  if(raw.requiresLogin&&!ctx.customerId)return false;
  const groups=Array.isArray(raw.customerGroupIds)?raw.customerGroupIds:[];
  if(groups.length&&!groups.includes(ctx.customerGroupId))return false;
  const includeTags=Array.isArray(raw.includeTags)?raw.includeTags:[];
  if(includeTags.length&&!includeTags.some((tag:string)=>ctx.customerTags.includes(tag)))return false;
  const excludeTags=Array.isArray(raw.excludeTags)?raw.excludeTags:[];
  if(excludeTags.some((tag:string)=>ctx.customerTags.includes(tag)))return false;
  return true;
}

function conditionsMatch(raw: any, ctx: PromotionContext) {
  if (!raw || (Array.isArray(raw) && raw.length === 0)) return true;
  const group = Array.isArray(raw) ? { operator: 'AND', conditions: raw } : raw;
  const parts = Array.isArray(group.conditions) ? group.conditions : [];
  if (!parts.length) return true;
  const results = parts.map((c:any) => c?.conditions ? conditionsMatch(c, ctx) : conditionMatches(c, ctx));
  return String(group.operator || 'AND').toUpperCase() === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

export function evaluatePromotions(promotions: any[], ctx: PromotionContext) {
  let discountTotal = 0;
  let freeShipping = false;
  const gifts: { promotionId: string; variantId: string; quantity: number }[] = [];
  const applied: any[] = [];
  const exclusive = new Set<string>();

  for (const promo of [...promotions].sort((a,b)=>Number(a.priority)-Number(b.priority))) {
    if (promo.activation === 'COUPON') {
      const promoCodes = (promo.codes || []).filter((c:any)=>c.isActive && (!c.usageLimit || c.usageCount < c.usageLimit)).map((c:any)=>String(c.code).toUpperCase());
      if (!ctx.couponCodes.some(c=>promoCodes.includes(c))) continue;
    }
    if (!promo.stackable && applied.length) continue;
    if (promo.exclusiveGroup && exclusive.has(promo.exclusiveGroup)) continue;
    if (!customerEligible(promo.customerEligibility,ctx)) continue;
    if (!conditionsMatch(promo.conditions, ctx)) continue;

    let promoDiscount = 0;
    let promoFreeShipping = false;
    const promoGifts: any[] = [];
    for (const action of Array.isArray(promo.actions) ? promo.actions : []) {
      const type = String(action?.type || '');
      const eligible = eligibleItems(ctx.items, action);
      const eligibleSubtotal = eligible.reduce((sum,i)=>sum+i.unitPrice*i.quantity,0);
      if (type === 'percentage_discount') promoDiscount += eligibleSubtotal * Math.max(0, Number(action.value || 0)) / 100;
      if (type === 'fixed_discount') promoDiscount += Math.max(0, Number(action.value || 0)) * ctx.exchangeRate;
      if (type === 'cheapest_item_discount' && eligible.length) {
        const unit=Math.min(...eligible.map(i=>i.unitPrice));promoDiscount += unit*Math.max(0,Number(action.value||100))/100;
      }
      if (type === 'most_expensive_item_discount' && eligible.length) {
        const unit=Math.max(...eligible.map(i=>i.unitPrice));promoDiscount += unit*Math.max(0,Number(action.value||100))/100;
      }
      if (type === 'free_shipping') promoFreeShipping = true;
      if (type === 'buy_x_pay_y') {
        const buy = Math.max(1, Number(action.buyQuantity || 2));
        const pay = Math.max(0, Math.min(buy, Number(action.payQuantity ?? buy - 1)));
        const prices:number[]=[];
        for (const i of eligible) for(let n=0;n<i.quantity;n++) prices.push(i.unitPrice);
        prices.sort((a,b)=>a-b);
        const fullGroups = Math.floor(prices.length / buy);
        const freePerGroup = buy - pay;
        for (let g=0; g<fullGroups; g++) for (let f=0; f<freePerGroup; f++) promoDiscount += prices[g*buy+f] || 0;
      }
      if (type === 'gift_variant' && action.variantId) promoGifts.push({ promotionId: promo.id, variantId: String(action.variantId), quantity: Math.max(1, Number(action.quantity || 1)) });
      if (type === 'set_bundle_price') {
        const qty = eligible.reduce((a,i)=>a+i.quantity,0);
        const required = Math.max(1, Number(action.quantity || 1));
        const groups = Math.floor(qty / required);
        const normal = eligible.map(i=>({ ...i })).reduce((a,i)=>a+i.unitPrice*i.quantity,0);
        const bundleTarget = groups * Number(action.bundlePrice || 0) * ctx.exchangeRate;
        const groupNormal = groups ? normal * Math.min(1, (groups * required) / Math.max(1, qty)) : 0;
        promoDiscount += Math.max(0, groupNormal - bundleTarget);
      }
    }
    promoDiscount = Math.max(0, Math.min(ctx.subtotal - discountTotal, promoDiscount));
    if (promoDiscount > 0 || promoFreeShipping || promoGifts.length) {
      discountTotal += promoDiscount;
      freeShipping = freeShipping || promoFreeShipping;
      gifts.push(...promoGifts);
      applied.push({ id: promo.id, name: promo.name, discount: promoDiscount, freeShipping: promoFreeShipping, gifts: promoGifts, code: promo.activation === 'COUPON' ? ctx.couponCodes.find(c => (promo.codes || []).some((pc:any)=>String(pc.code).toUpperCase()===c)) : null });
      if (promo.exclusiveGroup) exclusive.add(promo.exclusiveGroup);
      if (promo.stopProcessing) break;
    }
  }
  return { discountTotal: Math.min(ctx.subtotal, discountTotal), freeShipping, gifts, applied };
}
