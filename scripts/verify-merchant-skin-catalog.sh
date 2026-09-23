#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"
required=(
  "apps/admin/app/components/DesignViews.tsx"
  "apps/admin/app/theme/commerce.scss"
  "apps/api/src/merchant/merchant.service.ts"
  "apps/api/prisma/ticarti-signature-complete-theme-package.json"
)
for f in "${required[@]}"; do [[ -f "$f" ]] || { echo "Eksik: $f" >&2; exit 1; }; done
python3 - <<'PY'
import json
from pathlib import Path
root=Path('.')
p=root/'apps/api/prisma/ticarti-signature-complete-theme-package.json'
d=json.loads(p.read_text())
themes=d.get('themes',[])
assert themes, 'Signature tema paketi bulunamadi'
t=themes[0]
skins=t.get('config',{}).get('skins',[])
assert len(skins)==84, f'84 skin bekleniyordu, bulunan: {len(skins)}'
assert t.get('config',{}).get('visibility')=='PUBLIC', 'Merchant katalog gorunurlugu PUBLIC degil'
svc=(root/'apps/api/src/merchant/merchant.service.ts').read_text()
assert "configuredSkinAccess.length?configuredSkinAccess:['*']" in svc, 'Varsayilan tum skin erisimi hotfixi bulunamadi'
ui=(root/'apps/admin/app/components/DesignViews.tsx').read_text()
assert 'design-theme-compact-tools' in ui and 'design-theme-copy' in ui, 'Tek sutun skin listesi bulunamadi'
css=(root/'apps/admin/app/theme/commerce.scss').read_text()
assert '.design-theme-list{display:flex;flex-direction:column' in css, 'Tema listesi tek sutun degil'
print('Merchant skin catalog OK: 84 skins, PUBLIC catalog, single-column list.')
PY
