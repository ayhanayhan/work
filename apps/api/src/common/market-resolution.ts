export type MarketLike = {
  id: string;
  handle?: string | null;
  active?: boolean;
  countries?: string[] | null;
  currencies?: string[] | null;
  locales?: string[] | null;
  settings?: any;
};

export type PriceListLike = {
  id: string;
  marketId?: string | null;
  customerGroupId?: string | null;
  currency: string;
  priority?: number | null;
  active?: boolean;
};

export type MarketContext = {
  country?: string | null;
  currency?: string | null;
  locale?: string | null;
  customerGroupId?: string | null;
  companyPriceListId?: string | null;
};

export function resolveMarket(markets: MarketLike[], ctx: MarketContext): MarketLike | null {
  const country = String(ctx.country || '').trim().toUpperCase();
  const currency = String(ctx.currency || '').trim().toUpperCase();
  const locale = String(ctx.locale || '').trim().toLowerCase();
  const active = markets.filter((m) => m.active !== false);
  const score = (m: MarketLike) => {
    let points = 0;
    const countries = (m.countries || []).map((x) => String(x).toUpperCase());
    const currencies = (m.currencies || []).map((x) => String(x).toUpperCase());
    const locales = (m.locales || []).map((x) => String(x).toLowerCase());
    if (country && countries.includes(country)) points += 100;
    if (currency && currencies.includes(currency)) points += 30;
    if (locale && locales.includes(locale)) points += 10;
    if ((m.settings as any)?.isDefault === true) points += 1;
    return points;
  };
  return active
    .map((market, index) => ({ market, index, score: score(market) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.market || null;
}

export function eligiblePriceLists(lists: PriceListLike[], market: MarketLike | null, ctx: MarketContext): PriceListLike[] {
  const currency = String(ctx.currency || '').toUpperCase();
  const group = String(ctx.customerGroupId || '');
  const companyPriceListId = String(ctx.companyPriceListId || '');
  return lists
    .filter((l) => l.active !== false && String(l.currency || '').toUpperCase() === currency)
    .filter((l) => {
      if (companyPriceListId && l.id === companyPriceListId) return true;
      if (l.customerGroupId && String(l.customerGroupId) !== group) return false;
      if (l.marketId && String(l.marketId) !== String(market?.id || '')) return false;
      return true;
    })
    .sort((a, b) => {
      const ac = companyPriceListId && a.id === companyPriceListId ? -100000 : 0;
      const bc = companyPriceListId && b.id === companyPriceListId ? -100000 : 0;
      return ac - bc || Number(a.priority ?? 100) - Number(b.priority ?? 100) || String(a.id).localeCompare(String(b.id));
    });
}

export function explainMarketResolution(markets: MarketLike[], lists: PriceListLike[], ctx: MarketContext) {
  const market = resolveMarket(markets, ctx);
  const priceLists = eligiblePriceLists(lists, market, ctx);
  return {
    market,
    priceLists,
    context: {
      country: String(ctx.country || '').toUpperCase() || null,
      currency: String(ctx.currency || '').toUpperCase() || null,
      locale: String(ctx.locale || '').toLowerCase() || null,
      customerGroupId: ctx.customerGroupId || null,
      companyPriceListId: ctx.companyPriceListId || null,
    },
    precedence: ['company-price-list', 'country-market', 'currency-market', 'locale-market', 'customer-group-price-list', 'market-price-list', 'generic-price-list'],
  };
}
