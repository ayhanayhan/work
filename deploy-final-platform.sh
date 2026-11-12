#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$HOME/Downloads/commerce-saas-wedidit-test-runtimefix}"; PROJECT="${GCP_PROJECT:-wedidit-64fae}"; REGION="${GCP_REGION:-europe-west1}"; SERVICE="commerce-api"; JOB="commerce-db-init"; cd "$ROOT"
echo '== Ticarti Final Platform production deploy =='
echo '[1/13] Dependencies'; npm install
echo '[2/13] Structural verification'; node verify-final-platform.mjs .; node scripts/stabilization-check.mjs; node scripts/core-freeze-check.mjs; node scripts/verify-metronic-admin.mjs
echo '[3/13] Prisma'; export DATABASE_URL="${DATABASE_URL:-postgresql://ticarti_build:ticarti_build@127.0.0.1:5432/ticarti_build?schema=public}"; npx prisma format --schema apps/api/prisma/schema.prisma; npx prisma validate --schema apps/api/prisma/schema.prisma; npx prisma generate --schema apps/api/prisma/schema.prisma
echo '[4/13] Builds'; npm --workspace @commerce/api run build; npm --workspace @commerce/admin run build; npm --workspace @commerce/storefront run build; npm --workspace @commerce/superadmin run build
echo '[5/13] API image'; STAMP="$(date +%Y%m%d-%H%M%S)"; IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}:final-${STAMP}"; gcloud builds submit apps/api --project "$PROJECT" --region "$REGION" --tag "$IMAGE"
echo '[6/13] New API revision 0%'; SUFFIX="final$(date +%H%M%S)"; gcloud run deploy "$SERVICE" --project "$PROJECT" --region "$REGION" --image "$IMAGE" --revision-suffix "$SUFFIX" --no-traffic --quiet; REVISION="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestCreatedRevisionName)')"; READY=''; for i in $(seq 1 80); do READY="$(gcloud run revisions describe "$REVISION" --project "$PROJECT" --region "$REGION" --format='value(status.conditions[0].status)' 2>/dev/null||true)"; [ "$READY" = True ]&&break; [ "$READY" = False ]&&break; sleep 3; done; [ "$READY" = True ]||{ echo "Revision not ready: $REVISION" >&2; exit 1; }
echo '[7/13] DB init'; gcloud run jobs update "$JOB" --project "$PROJECT" --region "$REGION" --image "$IMAGE" --update-env-vars TEST_DB_SEED=false --quiet; gcloud run jobs execute "$JOB" --project "$PROJECT" --region "$REGION" --wait
echo '[8/13] Traffic'; gcloud run services update-traffic "$SERVICE" --project "$PROJECT" --region "$REGION" --to-revisions "$REVISION=100" --quiet; API_URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo '[9/13] Health'; curl -fsS "$API_URL/v1/health/ready" || curl -fsS "$API_URL/health/ready"
echo '[10/13] App Hosting origins'; python3 - "$API_URL" <<'PY'
from pathlib import Path
import re,sys
api=sys.argv[1].rstrip('/')
for name in ('admin','storefront'):
 p=Path(f'apps/{name}/apphosting.yaml')
 if not p.exists():continue
 s=p.read_text();s=s.replace('https://REPLACE_WITH_CLOUD_RUN_API_URL',api).replace('REPLACE_WITH_CLOUD_RUN_API_URL',api);s=re.sub(r'(API_ORIGIN:\s*[^\n]*value:\s*["\']?)(https://[^"\'\s]+)',lambda m:m.group(1)+api,s);s=re.sub(r'(NEXT_PUBLIC_API_URL:\s*[^\n]*value:\s*["\']?)(https://[^"\'\s]+)',lambda m:m.group(1)+api,s);p.write_text(s)
PY
echo '[11/13] Admin'; firebase deploy --project "$PROJECT" --only apphosting:commerce-admin
echo '[12/13] Storefront'; firebase deploy --project "$PROJECT" --only apphosting:commerce-storefront
echo '[13/13] Source cleanup dry-run'; python3 scripts/cleanup-apphosting-sources.py --keep 10 || true
echo "DONE API=$API_URL REVISION=$REVISION IMAGE=$IMAGE"
