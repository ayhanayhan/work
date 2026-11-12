#!/usr/bin/env bash
set -euo pipefail
for p in apps/api apps/admin apps/storefront apps/superadmin apps/developer packages/shared; do
  test -d "$p" || { echo "missing: $p"; exit 1; }
done
test -f firebase.json
test -f/scripts/vendor-standalone-runtime.mjs
test -f 'apps/superadmin/app/api/v1/[...path]/route.ts'
test -f apps/api/src/merchant/merchant-collections.controller.ts
echo 'full-source structural check: OK'
