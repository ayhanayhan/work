#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAKE_DATABASE_URL="${LOCAL_PRISMA_URL:-postgresql://local:local@127.0.0.1:5432/commerce}"

node scripts/clean-next-trace-stubs.mjs

(
  cd apps/api
  DATABASE_URL="$FAKE_DATABASE_URL" npx prisma format
  DATABASE_URL="$FAKE_DATABASE_URL" npx prisma validate
  DATABASE_URL="$FAKE_DATABASE_URL" npx prisma generate
  npm run build
  test -f dist/main.js
)

npm --prefix apps/admin run build
npm --prefix apps/storefront run build
npm --prefix apps/superadmin run build

echo "TUM BUILD'LER BASARILI"
