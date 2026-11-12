#!/usr/bin/env bash
set -euo pipefail

PROJECT="${GCP_PROJECT:-wedidit-64fae}"
REGION="${GCP_REGION:-europe-west1}"

printf '\n=== TICARTI PHASE 1 DEPLOY ===\n'
printf 'Project: %s\nRegion: %s\n\n' "$PROJECT" "$REGION"

command -v npm >/dev/null || { echo 'ERROR: npm bulunamadi'; exit 1; }
command -v gcloud >/dev/null || { echo 'ERROR: gcloud CLI bulunamadi'; exit 1; }
command -v firebase >/dev/null || { echo 'ERROR: firebase CLI bulunamadi'; exit 1; }

printf '\n[1/4] Dependencies\n'
npm ci

printf '\n[2/4] Superadmin build kontrolu\n'
npm --workspace @commerce/superadmin run build

printf '\n[3/4] API candidate build + deploy\n'
TICARTI_DEPLOY_EXECUTE=YES \
TICARTI_PROMOTE_APPROVED=YES \
TICARTI_RUNTIME_SMOKE_APPROVED=YES \
bash scripts/deploy-fast.sh api

printf '\n[4/4] Superadmin App Hosting deploy\n'
TICARTI_DEPLOY_EXECUTE=YES bash scripts/deploy-fast.sh frontend superadmin

printf '\n=== DEPLOY TAMAMLANDI ===\n'
printf 'Superadmin: https://superadmin.ticarti.com\n'
printf 'Kontrol: https://superadmin.ticarti.com/content/home\n'
printf 'Paketler: https://superadmin.ticarti.com/plans\n'
