#!/bin/sh
set -eu
echo "[db-init] applying Prisma schema"
npx prisma db push --skip-generate
npx tsx prisma/platform-domain-init.ts
echo "[db-init] initializing isolated admin authentication"
npx tsx prisma/auth-separation-init.ts
echo "[db-init] ensuring default app catalog"
npx tsx prisma/app-catalog-init.ts
echo "[db-init] ensuring theme catalog"
npx tsx prisma/theme-catalog-init.ts
echo "[db-init] backfilling Ticarti default legal pages"
npx tsx prisma/legal-pages-init.ts
if [ "${TEST_DB_SEED:-true}" = "true" ]; then
  echo "[db-init] seeding demo/reference data"
  npx tsx prisma/seed.ts
fi
echo "[db-init] complete"
