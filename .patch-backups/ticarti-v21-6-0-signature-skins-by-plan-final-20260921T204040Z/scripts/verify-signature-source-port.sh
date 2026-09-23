#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
need=(
  "apps/storefront/app/layout.tsx"
  "apps/storefront/app/page.tsx"
  "apps/storefront/app/products/page.tsx"
  "apps/storefront/app/products/[slug]/page.tsx"
  "apps/storefront/app/cart/page.tsx"
  "apps/storefront/components/Header.tsx"
  "apps/storefront/components/Footer.tsx"
  "apps/storefront/components/ProductCard.tsx"
  "apps/storefront/components/StorefrontGate.tsx"
  "apps/storefront/public/signature-assets/base.css"
  "apps/storefront/public/signature-assets/signature-bundle.css"
  "apps/storefront/public/signature-assets/swiper-bundle.min.css"
  "apps/storefront/public/signature-assets/swiper-bundle.min.js"
  "apps/storefront/public/signature-assets/masonry.pkgd.min.js"
  "apps/storefront/public/signature-assets/icon-heart.svg"
  "apps/storefront/public/signature-assets/icon-cart.svg"
  "theme-packages/ticarti-signature-complete-theme-package.json"
  "theme-packages/signature-data-contract.json"
)
for f in "${need[@]}"; do
  test -f "$ROOT/$f" || { echo "MISSING: $f"; exit 1; }
done

assets=$(find "$ROOT/apps/storefront/public/signature-assets" -maxdepth 1 -type f | wc -l | tr -d ' ')
[ "$assets" -ge 220 ] || { echo "Asset set incomplete: $assets"; exit 1; }

python3 - "$ROOT" <<'PY'
import json, pathlib, sys
root=pathlib.Path(sys.argv[1])
p=root/'theme-packages/ticarti-signature-complete-theme-package.json'
d=json.loads(p.read_text(encoding='utf-8'))
t=d['themes'][0]
c=t.get('config',{})
mods=c.get('modules',[])
pts=c.get('pageTemplates',{})
secs=c.get('sectionSchemas',{})
if len(mods) < 99: raise SystemExit(f'module count too low: {len(mods)}')
if len(pts) < 20: raise SystemExit(f'page template count too low: {len(pts)}')
if len(secs) < 98: raise SystemExit(f'section schema count too low: {len(secs)}')
json.loads((root/'theme-packages/signature-data-contract.json').read_text(encoding='utf-8'))
print(f'Theme manifest OK: {len(mods)} modules, {len(pts)} page templates, {len(secs)} section schemas')
PY

# Explicitly split tokens so these labels never occur literally in this package.
pattern='wo''kiee|shop''ify|theme''forest'
if find "$ROOT/apps/storefront" "$ROOT/theme-packages" "$ROOT/scripts" -type f -print0 | \
   xargs -0 grep -IinE "$pattern" > /tmp/ticarti-theme-brand-scan.txt 2>/dev/null; then
  cat /tmp/ticarti-theme-brand-scan.txt
  echo "Forbidden source label found"
  exit 1
fi
if find "$ROOT/apps/storefront" "$ROOT/theme-packages" "$ROOT/scripts" -iname '*wo''kiee*' -o -iname '*shop''ify*' -o -iname '*theme''forest*' | grep -q .; then
  echo "Forbidden source label found in a filename"
  exit 1
fi

echo "Signature source-port verification OK ($assets browser assets)."
