#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$HOME/Downloads/ticarti-full-final-v21-0-0}"
cd "$ROOT"
python3 - <<'PY'
from pathlib import Path
checks={
'apps/admin/app/components/CatalogViews.tsx':[
'Ürün İçeriği & SEO','product-language-tabs','Teknik & Ticari Bilgiler','Kombinasyonlu varyant','Bağımsız varyant','Görsel belirleyici','Birlikte Al & Bundle','Ürüne Özel Fiyat / İndirim','Sabit Döviz Fiyatları','replaceVariants:false','CategoryChecks'
],
'apps/admin/app/layout.tsx':['Inter'],
'apps/admin/app/components/SettingsV17.tsx':['Sabit Kur','Otomatik kur güncelleme','Kurları Şimdi Güncelle'],
'apps/admin/app/components/PluginViews.tsx':['fixed-currency-prices','FixedCurrencyApp'],
'apps/api/src/apps/apps.service.ts':['Sabit Döviz Fiyatları','fixed-currency-prices'],
'apps/api/src/superadmin/superadmin.controller.ts':['currency-rates','currency-rates/refresh'],
'apps/api/src/superadmin/superadmin.service.ts':['refreshCurrencyRates','currencyRates'],
'apps/api/src/storefront/storefront.service.ts':['fixedCurrencyPrices','fixedPricing'],
'apps/storefront/themes/ticarti/layout/Header.tsx':['together','bundle'],
'apps/superadmin/app/page.tsx':['Döviz','CurrencyControl'],
'apps/superadmin/app/error.tsx':['Tekrar Dene'],
}
for f,needles in checks.items():
    p=Path(f)
    if not p.exists(): raise SystemExit(f'MISSING: {f}')
    s=p.read_text(errors='ignore')
    for n in needles:
        if n not in s: raise SystemExit(f'MISSING MARKER: {f}: {n}')
cat=Path('apps/admin/app/components/CatalogViews.tsx').read_text()
if 'CatalogTranslations' in cat: raise SystemExit('Legacy separate translation panel is still imported')
tech=cat.find('Teknik & Ticari Bilgiler')
localized=cat.find('<LocalizedContent')
if tech<0 or localized<0 or not tech<localized: raise SystemExit('Localized language card is not positioned after technical product info')
service=Path('apps/api/src/storefront/storefront.service.ts').read_text()
if "fixedCurrencyPrices?.[ci.code]" not in service: raise SystemExit('Fixed currency storefront resolver is missing')
print('OK: v23.0.1 feature markers verified')
PY
npm run build --workspace=apps/api
npm run build --workspace=apps/admin
npm run build --workspace=apps/storefront
npm run build --workspace=apps/superadmin
echo "OK: v23.0.1 API + Admin + Storefront + Superadmin builds verified"
