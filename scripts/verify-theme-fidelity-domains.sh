#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"
required=(
  "apps/storefront/components/StorefrontGate.tsx"
  "apps/storefront/components/Header.tsx"
  "apps/storefront/components/Footer.tsx"
  "apps/storefront/public/signature-assets/signature-bundle.css"
  "apps/storefront/public/signature-assets/signature-runtime.css"
  "apps/api/src/merchant/merchant.service.ts"
  "apps/api/src/merchant-auth/merchant-auth.service.ts"
  "apps/api/prisma/platform-domain-init.ts"
  "apps/api/prisma/theme-catalog-init.ts"
  "apps/api/prisma/ticarti-signature-complete-theme-package.json"
  "apps/admin/app/components/DesignViews.tsx"
  "theme-packages/ticarti-signature-complete-theme-package.json"
  "theme-packages/signature-skin-catalog.json"
)
for f in "${required[@]}"; do [[ -f "$f" ]] || { echo "Eksik: $f" >&2; exit 1; }; done
python3 - <<'PY'
import json
from pathlib import Path
root=Path('.')
pkg=json.loads((root/'theme-packages/ticarti-signature-complete-theme-package.json').read_text())
assert pkg.get('packageVersion')=='21.6.3', pkg.get('packageVersion')
t=next(x for x in pkg.get('themes',[]) if x.get('slug')=='ticarti-signature-complete')
assert t.get('version')=='21.6.3'
cfg=t.get('config') or {}
assert cfg.get('visibility')=='PUBLIC'
assert cfg.get('sourceFidelity')=='DOM_CSS_DEFAULTS_MODULES'
skins=cfg.get('skins') or []
assert len(skins)==84, len(skins)
demo=next(x for x in skins if x.get('slug')=='demo-1')
g=(demo.get('design') or {}).get('general') or {}
h=(demo.get('design') or {}).get('header') or {}
f=(demo.get('design') or {}).get('footer') or {}
assert g.get('bodyFont')=='Inter' and g.get('headingFont')=='Inter'
assert g.get('containerWidth')==1600
assert g.get('primaryColor')=='#304ffe'
assert g.get('backgroundColor')=='#ffffff'
assert g.get('surfaceColor')=='#f0f0f0'
assert g.get('textColor')=='#000000'
assert g.get('borderColor')=='#d9d9d9'
assert g.get('borderRadius')==20
assert h.get('logoMaxWidth')==130 and h.get('logoMaxWidthMobile')==100
assert h.get('sticky') is True and h.get('searchMode')=='opened'
assert f.get('backgroundColor')=='#000000' and f.get('textColor')=='#ffffff'
assert f.get('lineColor')=='#444444'
assert len(demo.get('homePreset') or [])==14
for s in skins:
    design=s.get('design') or {}
    for group in ('general','header','footer','products'):
        assert isinstance(design.get(group),dict), (s.get('slug'),group)
    assert len(s.get('homePreset') or [])==14, s.get('slug')

gate=(root/'apps/storefront/components/StorefrontGate.tsx').read_text()
assert '/signature-assets/signature-bundle.css' in gate
assert '/signature-assets/signature-runtime.css' in gate
header=(root/'apps/storefront/components/Header.tsx').read_text()
for token in ['section-header','header__main','header__desktop','header__mobile','header__icons']:
    assert token in header, token
footer=(root/'apps/storefront/components/Footer.tsx').read_text()
for token in ['footer__block-item','footer__block-heading','footer__content-bottom','list-payment']:
    assert token in footer, token
svc=(root/'apps/api/src/merchant/merchant.service.ts').read_text()
assert 'const loadThemeModules=options?.loadThemeModules!==false' in svc
assert 'const defaults:any=this.defaultDesignSettings()' in svc
ui=(root/'apps/admin/app/components/DesignViews.tsx').read_text()
assert 'const loadThemeModules=true' in ui
assert 'Skin seçildiğinde tema ayarları ve modül düzeni birlikte uygulanır.' in ui
platform=(root/'apps/api/prisma/platform-domain-init.ts').read_text()
for token in ["['academy'","['ai'","['cdn'"]:
    assert token in platform, token
for path in ['apps/api/src/merchant/merchant.service.ts','apps/api/src/merchant-auth/merchant-auth.service.ts']:
    txt=(root/path).read_text()
    for slug in ["'academy'","'cdn'","'ai'"]:
        assert slug in txt, (path,slug)
print('Tema fidelity hotfix OK: 84 skin, tam CSS bundle, header/footer uyumu, skin defaults + modül uygulama ve 3 platform subdomain rezervasyonu.')
PY
