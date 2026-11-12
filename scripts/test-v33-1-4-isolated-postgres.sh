#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"
if [ "${TICARTI_ISOLATED_DB_E2E:-}" != "YES" ]; then echo 'BLOCKED: set TICARTI_ISOLATED_DB_E2E=YES'; exit 2; fi
if [ -z "${DATABASE_URL:-}" ]; then echo 'BLOCKED: isolated DATABASE_URL missing'; exit 2; fi
if [ -n "${CONTROL_DATABASE_URL:-}" ] && [ "$CONTROL_DATABASE_URL" != "$DATABASE_URL" ]; then echo 'BLOCKED: CONTROL_DATABASE_URL differs'; exit 2; fi
npx tsx --test src/app-auth/app-auth.postgres-e2e.ts
