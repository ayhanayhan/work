#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="${GCP_PROJECT:-wedidit-64fae}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="${API_SERVICE:-commerce-api}"
REPO="${GCP_REPO:-cloud-run-source-deploy}"
STAMP="$(date +%Y%m%d-%H%M%S)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:storefront-checkout-v26-7-38-${STAMP}"

if [ ! -f apps/api/dist/main.js ] && [ ! -f apps/api/dist/api/src/main.js ]; then
  echo "HATA: API build ciktisi bulunamadi. Once Prisma generate ve API build calistirin."
  exit 1
fi

echo "1/3 API image build: $IMAGE"
gcloud builds submit apps/api --tag="$IMAGE" --region="$REGION" --project="$PROJECT"

echo "2/3 commerce-api deploy"
gcloud run deploy "$SERVICE" --image="$IMAGE" --region="$REGION" --project="$PROJECT"

echo "3/3 storefront App Hosting deploy (checkout artik magaza domaininde)"
node -e "require('fs').rmSync('apps/storefront/.next',{recursive:true,force:true})"
firebase deploy --only apphosting:commerce-storefront --project "$PROJECT"

echo "Storefront checkout + API deploy tamamlandi. Checkout magaza domaininde calisiyor."
