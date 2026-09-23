#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
need=(
  "apps/api/prisma/ticarti-signature-complete-theme-package.json"
  "apps/api/prisma/theme-catalog-init.ts"
  "apps/api/src/merchant/merchant.service.ts"
  "apps/api/src/superadmin/superadmin.service.ts"
  "apps/api/src/superadmin/superadmin.controller.ts"
  "apps/admin/app/components/DesignViews.tsx"
  "apps/superadmin/app/page.tsx"
  "apps/superadmin/app/globals.css"
  "apps/storefront/components/StorefrontGate.tsx"
  "apps/storefront/public/signature-assets/base.css"
  "apps/storefront/public/signature-assets/signature-bundle.css"
  "theme-packages/ticarti-signature-complete-theme-package.json"
  "theme-packages/signature-skin-catalog.json"
  "theme-packages/signature-data-contract.json"
)
for f in "${need[@]}"; do test -f "$ROOT/$f" || { echo "MISSING: $f"; exit 1; }; done

assets=$(find "$ROOT/apps/storefront/public/signature-assets" -maxdepth 1 -type f | wc -l | tr -d ' ')
[ "$assets" -ge 220 ] || { echo "Asset set incomplete: $assets"; exit 1; }

python3 - "$ROOT" <<'PY'
import json, pathlib, sys, hashlib
root=pathlib.Path(sys.argv[1])
main=root/'theme-packages/ticarti-signature-complete-theme-package.json'
api=root/'apps/api/prisma/ticarti-signature-complete-theme-package.json'
d=json.loads(main.read_text(encoding='utf-8'))
if not d.get('themes'): raise SystemExit('theme list missing')
t=d['themes'][0]; c=t.get('config',{})
mods=c.get('modules',[]); pts=c.get('pageTemplates',{}); secs=c.get('sectionSchemas',{}); skins=c.get('skins',[])
if len(mods)<99: raise SystemExit(f'module count too low: {len(mods)}')
if len(pts)<20: raise SystemExit(f'page template count too low: {len(pts)}')
if len(secs)<98: raise SystemExit(f'section schema count too low: {len(secs)}')
if len(skins)!=84: raise SystemExit(f'skin count must be 84, got {len(skins)}')
slugs=[str(x.get('slug','')) for x in skins]
if len(set(slugs))!=84 or any(not x for x in slugs): raise SystemExit('skin slugs must be unique and non-empty')
groups={g:sum(1 for x in skins if x.get('group')==g) for g in ('main-demos','classic-skins','new-skins')}
if groups!={'main-demos':22,'classic-skins':50,'new-skins':12}: raise SystemExit(f'unexpected skin groups: {groups}')
cat=json.loads((root/'theme-packages/signature-skin-catalog.json').read_text(encoding='utf-8'))
if len(cat.get('skins',[]))!=84: raise SystemExit('skin catalog mismatch')
if hashlib.sha256(main.read_bytes()).digest()!=hashlib.sha256(api.read_bytes()).digest(): raise SystemExit('API seed package and root theme package differ')
checks={
 'apps/api/src/merchant/merchant.service.ts':['themeSkins','skinSlug','themeSkin'],
 'apps/api/src/superadmin/superadmin.service.ts':['setPlanThemeSkins','themeSkins'],
 'apps/api/src/superadmin/superadmin.controller.ts':['theme-skins'],
 'apps/superadmin/app/page.tsx':['Pakete göre skin erişimi','theme-skins'],
 'apps/admin/app/components/DesignViews.tsx':['skinSlug','activeSkin'],
 'apps/storefront/components/StorefrontGate.tsx':['data-skin']
}
for rel,terms in checks.items():
    text=(root/rel).read_text(encoding='utf-8')
    for term in terms:
        if term not in text: raise SystemExit(f'{rel}: missing {term}')
print(f'Theme manifest OK: {len(mods)} modules, {len(pts)} page templates, {len(secs)} section schemas')
print(f'Skin access OK: {len(skins)} skins ({groups["main-demos"]} demos + {groups["classic-skins"]} classic + {groups["new-skins"]} new)')
PY

pattern='wo''kiee|shop''ify|theme''forest'
scan=(
  "$ROOT/apps/api/prisma/ticarti-signature-complete-theme-package.json"
  "$ROOT/apps/api/prisma/theme-catalog-init.ts"
  "$ROOT/apps/api/src/merchant/merchant.service.ts"
  "$ROOT/apps/api/src/superadmin/superadmin.service.ts"
  "$ROOT/apps/api/src/superadmin/superadmin.controller.ts"
  "$ROOT/apps/admin/app/components/DesignViews.tsx"
  "$ROOT/apps/superadmin/app/page.tsx"
  "$ROOT/apps/superadmin/app/globals.css"
  "$ROOT/apps/storefront"
  "$ROOT/theme-packages"
  "$ROOT/scripts/verify-signature-skins-by-plan.sh"
)
if grep -IinE "$pattern" "${scan[@]}" > /tmp/ticarti-signature-scan.txt 2>/dev/null; then
  cat /tmp/ticarti-signature-scan.txt
  echo "Forbidden source label found"
  exit 1
fi
if find "$ROOT/apps/storefront" "$ROOT/theme-packages" \( -iname '*wo''kiee*' -o -iname '*shop''ify*' -o -iname '*theme''forest*' \) -print | grep -q .; then
  echo "Forbidden source label found in a filename"
  exit 1
fi

echo "Signature skin-by-plan verification OK ($assets browser assets)."
