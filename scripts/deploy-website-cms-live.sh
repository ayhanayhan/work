#!/usr/bin/env bash
# Publish the actual website CMS changes. Run at the monorepo root.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${PROJECT:-wedidit-64fae}"
API_REGION="${API_REGION:-europe-west1}"
SERVICE="commerce-api"
REPOSITORY="cloud-run-source-deploy"
API_URL="https://commerce-api-ynhobkprgq-ew.a.run.app"
IMAGE="${API_REGION}-docker.pkg.dev/${PROJECT}/${REPOSITORY}/${SERVICE}:website-cms-$(date +%Y%m%d-%H%M%S)"

echo "=== Source & validation ==="
git status --short
npm --workspace @commerce/api run test:website-blog
npm --workspace @commerce/api run build
npm --workspace @commerce/master run build
npm --workspace @commerce/marketing run test:blog
npm --workspace @commerce/marketing run build

echo "=== Capture current live API revision ==="
OLD_REVISION="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$API_REGION" --format=json | node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const t=JSON.parse(s).status.traffic||[];process.stdout.write(t.find(x=>x.percent===100)?.revisionName||'')})")"
if [ -z "$OLD_REVISION" ]; then
  echo "Cannot determine prior 100% live revision; aborting before deployment." >&2
  exit 1
fi
echo "Previous live API: $OLD_REVISION"

echo "=== Build actual API source and deploy live ==="
gcloud builds submit apps/api --tag="$IMAGE" --region="$API_REGION" --project="$PROJECT"
gcloud run deploy "$SERVICE" --image="$IMAGE" --region="$API_REGION" --project="$PROJECT" --quiet

echo "=== Check real API health and active website locales ==="
if ! curl -fsS --retry 4 --retry-delay 2 "$API_URL/v1/health" >/dev/null || \
   ! curl -fsS --retry 4 --retry-delay 2 "$API_URL/v1/public/website/locales" >/dev/null; then
  echo "API check failed, rolling back to $OLD_REVISION" >&2
  gcloud run services update-traffic "$SERVICE" --to-revisions="${OLD_REVISION}=100" --region="$API_REGION" --project="$PROJECT"
  exit 1
fi

echo "=== Deploy impacted Master and Marketing apps ==="
firebase deploy --only apphosting:commerce-master,apphosting:commerce-marketing --project="$PROJECT"

echo "=== Live endpoints ==="
for URL in \
  "https://commerce-master--wedidit-64fae.europe-west4.hosted.app/website/blog" \
  "https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app/" \
  "https://ticarti.com/"; do
  printf '%s ' "$URL"
  curl -L -sS -o /dev/null -w 'HTTP %{http_code}\n' "$URL" || true
done

echo "Website CMS deploy finished. API image: $IMAGE"
