#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
PKG="$ROOT/theme-packages/ticarti-signature-complete-theme-package.json"
[ -f "$PKG" ] || { echo "Tema paketi bulunamadi: $PKG"; exit 1; }
python3 - "$PKG" <<'PY'
import json,sys
p=sys.argv[1]
x=json.load(open(p,encoding='utf-8'))
assert x.get('format')=='ticarti-theme-package'
t=x['themes'][0]; c=t['config']
assert len(c.get('modules',[]))==99, len(c.get('modules',[]))
assert len(c.get('pageTemplates',[]))>=20, len(c.get('pageTemplates',[]))
required={'slider','featured_collection','collection_list','lookbook','image_comparison','ticker_text','shoppable_feed','media_collage','product_banner_list','featured_collection_tabs'}
mods={m.get('type') or m.get('key') or m.get('id') for m in c.get('modules',[])}
missing=required-mods
if missing: raise SystemExit('Eksik temel moduller: '+', '.join(sorted(missing)))
print('Tema dogrulandi:',t['name'])
print('Modul:',len(c['modules']),'Sayfa sablonu:',len(c['pageTemplates']))
PY
for f in \
  apps/storefront/components/Header.tsx \
  apps/storefront/components/ProductCard.tsx \
  apps/storefront/components/StorefrontGate.tsx \
  apps/storefront/components/ThemeRuntime.tsx \
  apps/storefront/app/page.tsx \
  apps/storefront/app/globals.css; do
  [ -f "$ROOT/$f" ] || { echo "Eksik storefront dosyasi: $f"; exit 1; }
done
echo "Storefront cekirdek dosyalari: OK"
