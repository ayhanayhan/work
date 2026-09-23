#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:-wedidit-64fae}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="commerce-api"
JOB="commerce-db-init"
REPO="cloud-run-source-deploy"
STAMP="$(date +%Y%m%d-%H%M%S)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:full-v21-0-0-${STAMP}"
SUFFIX="v210$(date +%H%M%S)"

if [ ! -f apps/api/dist/main.js ]; then
  echo "HATA: apps/api/dist/main.js yok. Once scripts/build-all.sh calistirin."
  exit 1
fi

echo "1/6 API image build: $IMAGE"
gcloud builds submit apps/api --tag="$IMAGE" --region="$REGION" --project="$PROJECT"

echo "2/6 Yeni API revision 0% trafik ile deploy ediliyor"
gcloud run deploy "$SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --revision-suffix="$SUFFIX" \
  --no-traffic

REVISION="$(gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT" --format='value(status.latestCreatedRevisionName)')"

READY=""
for i in $(seq 1 40); do
  READY="$(gcloud run revisions describe "$REVISION" --region="$REGION" --project="$PROJECT" --format='value(status.conditions[0].status)' 2>/dev/null || true)"
  [ "$READY" = "True" ] && break
  [ "$READY" = "False" ] && break
  sleep 3
done
if [ "$READY" != "True" ]; then
  echo "HATA: Yeni revision hazir degil: $REVISION"
  exit 1
fi

echo "3/6 DB job exact image ile calisiyor"
gcloud run jobs update "$JOB" --image="$IMAGE" --region="$REGION" --project="$PROJECT"
gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT" --wait

echo "4/6 DB basarili; API trafik yeni revision'a geciyor"
gcloud run services update-traffic "$SERVICE" --to-revisions="$REVISION=100" --region="$REGION" --project="$PROJECT"

API_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT" --format='value(status.url)')"
python3 - "$API_URL" <<'PY'
from pathlib import Path
import sys
api=sys.argv[1].rstrip('/')
for rel in ['apps/admin/apphosting.yaml','apps/storefront/apphosting.yaml','apps/superadmin/apphosting.yaml']:
    p=Path(rel)
    if not p.exists(): continue
    s=p.read_text(encoding='utf-8')
    s=s.replace('https://REPLACE_WITH_CLOUD_RUN_API_URL',api).replace('REPLACE_WITH_CLOUD_RUN_API_URL',api)
    p.write_text(s,encoding='utf-8')
PY

echo "5/6 Firebase App Hosting deploy"
# Local Next.js outputs can contain macOS absolute trace paths and must never be
# uploaded as App Hosting source. firebase.json also excludes these directories;
# removing them here makes the deployment deterministic on every workstation.
for APP in admin storefront superadmin; do
  node -e "require('fs').rmSync('apps/$APP/.next',{recursive:true,force:true})"
done
firebase deploy --only apphosting:commerce-admin --project "$PROJECT"
firebase deploy --only apphosting:commerce-storefront --project "$PROJECT"
firebase deploy --only apphosting:commerce-superadmin --project "$PROJECT"

echo "6/6 TAMAMLANDI"
echo "API: $API_URL"
echo "Revision: $REVISION"
echo "Image: $IMAGE"
