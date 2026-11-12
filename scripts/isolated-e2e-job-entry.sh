#!/usr/bin/env bash
set -euo pipefail
[ "${TICARTI_ISOLATED_DB_E2E:-}" = YES ] || { echo 'BLOCKED: isolated E2E approval missing'; exit 2; }
[ -n "${DATABASE_URL:-}" ] || { echo 'BLOCKED: test database secret missing'; exit 2; }
node - <<'NODE'
const u = new URL(process.env.DATABASE_URL);
const socket = u.searchParams.get('host') || '';
if (u.protocol !== 'postgresql:' || socket !== '/cloudsql/wedidit-64fae:europe-west1:commerce-db-loadtest' || decodeURIComponent(u.pathname) !== '/commerce') {
 console.error('BLOCKED: database target is not the approved isolated Cloud SQL instance');
 process.exit(2);
}
console.log('OK: isolated Cloud SQL target verified (connection metadata only)');
NODE
cd /app/apps/api
npx tsx --test src/app-auth/app-auth.postgres-e2e.ts
