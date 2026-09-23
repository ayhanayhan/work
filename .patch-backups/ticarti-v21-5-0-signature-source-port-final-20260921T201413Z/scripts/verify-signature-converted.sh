#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
need=(
  "apps/storefront/app/page.tsx"
  "apps/storefront/app/products/page.tsx"
  "apps/storefront/app/products/[slug]/page.tsx"
  "apps/storefront/components/Header.tsx"
  "apps/storefront/components/Footer.tsx"
  "apps/storefront/components/ProductCard.tsx"
  "apps/storefront/components/StorefrontGate.tsx"
  "apps/storefront/public/signature-assets/base.css"
  "theme-packages/ticarti-signature-complete-theme-package.json"
)
for f in "${need[@]}"; do test -f "$ROOT/$f" || { echo "MISSING: $f"; exit 1; }; done
count=$(find "$ROOT/apps/storefront/public/signature-assets" -type f | wc -l | tr -d ' ')
[ "$count" -ge 150 ] || { echo "Asset set incomplete: $count"; exit 1; }
if grep -RIniE 'wo''kiee|shop''ify|theme''forest' "$ROOT/apps/storefront" "$ROOT/theme-packages" >/tmp/ticarti-brand-scan.txt 2>/dev/null; then
  cat /tmp/ticarti-brand-scan.txt
  echo "Forbidden source label found"
  exit 1
fi
echo "Signature converted storefront verification OK ($count browser assets)."
