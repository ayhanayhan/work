#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"
required=(
  "apps/admin/app/components/DesignViews.tsx"
  "apps/admin/app/theme/commerce.scss"
  "apps/api/prisma/schema.prisma"
  "apps/api/prisma/theme-catalog-init.ts"
  "apps/api/prisma/ticarti-signature-complete-theme-package.json"
  "apps/api/src/merchant/merchant.service.ts"
  "apps/api/src/storefront/storefront.service.ts"
  "theme-packages/signature-skin-catalog.json"
)
for f in "${required[@]}"; do [[ -f "$f" ]] || { echo "Eksik: $f" >&2; exit 1; }; done
python3 - <<'PY'
import json
from pathlib import Path
root=Path('.')
pkg=json.loads((root/'apps/api/prisma/ticarti-signature-complete-theme-package.json').read_text())
assert pkg.get('packageVersion')=='21.6.2', pkg.get('packageVersion')
themes=pkg.get('themes') or []
assert len(themes)>=1
t=next(x for x in themes if x.get('slug')=='ticarti-signature-complete')
cfg=t.get('config') or {}
assert t.get('isDefault') is True
assert cfg.get('visibility')=='PUBLIC'
assert cfg.get('catalogGroup')=='Ticarti Temaları'
assert len(cfg.get('skins') or [])==84
schema=(root/'apps/api/prisma/schema.prisma').read_text()
assert '@default("ticarti-signature-complete")' in schema
init=(root/'apps/api/prisma/theme-catalog-init.ts').read_text()
for slug in ['nova-commerce','atelier','noya','orbit-market','casa-linea','aurelia','velo','pantry','tiny-co','forge','mono-studio','vertex-b2b']:
    assert slug in init
assert 'themeDefinition.deleteMany' in init and 'LEGACY_THEME_SLUGS' in init
svc=(root/'apps/api/src/merchant/merchant.service.ts').read_text()
assert "configuredSkinAccess.length?configuredSkinAccess:['*']" in svc
storefront=(root/'apps/api/src/storefront/storefront.service.ts').read_text()
assert "slug:'ticarti-signature-complete'" in storefront
ui=(root/'apps/admin/app/components/DesignViews.tsx').read_text()
assert "t.config?.catalogGroup||'Ticarti Temaları'" in ui
assert 'design-theme-group-title' in ui
css=(root/'apps/admin/app/theme/commerce.scss').read_text()
assert '.design-theme-group-title' in css
cat=json.loads((root/'theme-packages/signature-skin-catalog.json').read_text())
assert cat.get('catalogGroup')=='Ticarti Temaları'
assert len(cat.get('skins') or [])==84
print('Tema katalog temizligi OK: tek Ticarti tema ailesi, 84 skin, eski 12 tema temizleme aktif.')
PY
