#!/bin/sh
set -eu

echo "[db-init] checking payment provider unique indexes"
npx tsx prisma/payment-provider-id-unique-init.ts

echo "[db-init] checking support ticket unique index"
npx tsx prisma/support-ticket-unique-preflight.ts

echo "[db-init] applying Prisma migrations"
npx tsx prisma/production-migration-baseline.ts

npx tsx prisma/platform-domain-init.ts
echo "[db-init] ensuring commerce v5 performance indexes"
npx tsx prisma/commerce-v5-performance-init.ts
echo "[db-init] initializing isolated admin authentication"
npx tsx prisma/auth-separation-init.ts
echo "[db-init] ensuring default app catalog"
npx tsx prisma/app-catalog-init.ts
echo "[db-init] ensuring theme catalog"
npx tsx prisma/theme-catalog-init.ts
echo "[db-init] backfilling Ticarti default legal pages"
npx tsx prisma/legal-pages-init.ts

if [ "${TEST_DB_SEED:-false}" = "true" ]; then
  echo "[db-init] seeding demo/reference data"
  npx tsx prisma/seed.ts
fi

echo "[db-init] complete"
