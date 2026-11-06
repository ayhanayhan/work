#!/usr/bin/env bash
# Website CMS release: API, Master and Marketing only.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${PROJECT:-wedidit-64fae}"
REGION="${API_REGION:-europe-west1}"
SERVICE="commerce-api"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}:website-editor-faq-$(date +%Y%m%d-%H%M%S)"

echo "=== LOCAL SOURCE ==="
git rev-parse --short HEAD
git status --short
echo "=== BUILD & TEST ==="
npm --workspace @commerce/api run test:website-blog
npm --workspace @commerce/api run build
npm --workspace @commerce/master run build
npm --workspace @commerce/marketing run test:blog
npm --workspace @commerce/marketing run build

echo "=== EXISTING LIVE API REVISION ==="
OLD="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format=json |
  node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const t=JSON.parse(s).status.traffic||[];process.stdout.write(t.find(x=>x.percent===100)?.revisionName||'')})")"
if [ -z "$OLD" ]; then echo "Unable to determine existing 100% API revision" >&2; exit 1; fi
echo "Old: $OLD"

echo "=== BUILD API IMAGE & CREATE DISTINCT REVISION WITHOUT TRAFFIC ==="
gcloud builds submit apps/api --tag="$IMAGE" --region="$REGION" --project="$PROJECT"
SUFFIX="cms$(date +%m%d%H%M%S)"
gcloud run deploy "$SERVICE" --image="$IMAGE" --revision-suffix="$SUFFIX" --no-traffic --project="$PROJECT" --region="$REGION" --quiet
# A zero-traffic revision can be Ready without becoming latestReadyRevisionName.
# Resolve the exact revision we just created, instead of reading the traffic-serving pointer.
NEW="${SERVICE}-${SUFFIX}"
READY="$(gcloud run revisions describe "$NEW" --project="$PROJECT" --region="$REGION" --format='value(status.conditions[0].status)')"
if [ "$READY" != "True" ] || [ "$NEW" = "$OLD" ]; then
  echo "New revision not ready: $NEW (status: $READY)" >&2
  exit 1
fi
echo "New: $NEW"

echo "=== LIVE API TRAFFIC ==="
gcloud run services update-traffic "$SERVICE" --to-revisions="${NEW}=100" --project="$PROJECT" --region="$REGION" --quiet
API_URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.url)')"
if [ -z "$API_URL" ]; then echo "Cloud Run service URL is empty" >&2; exit 1; fi
echo "API URL: $API_URL"

failed=0
for endpoint in "/v1/health" "/v1/public/website/locales" "/v1/public/website/faq?lang=tr" "/v1/public/website/blog?lang=tr"; do
  code="$(curl -L -sS --max-time 20 --retry 4 --retry-delay 2 -o /dev/null -w '%{http_code}' "${API_URL}${endpoint}")" || code=000
  printf '%s -> HTTP %s\n' "$endpoint" "$code"
  if [ "$code" != 200 ]; then failed=1; fi
done
if [ "$failed" -ne 0 ]; then
  echo "API failed; restoring previous live revision: $OLD" >&2
  gcloud run services update-traffic "$SERVICE" --to-revisions="${OLD}=100" --project="$PROJECT" --region="$REGION" --quiet
  exit 1
fi

echo "=== MASTER & MARKETING APP HOSTING ==="
firebase deploy --only apphosting:commerce-master,apphosting:commerce-marketing --project="$PROJECT"
echo "=== SMOKE CHECK ==="
for url in \
 "https://master.ticarti.com/website/blog/new" \
 "https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app/" \
 "https://ticarti.com/"; do
  printf '%s -> ' "$url"
  curl -L -sS --max-time 20 -o /dev/null -w 'HTTP %{http_code}\n' "$url" || true
done
echo "CMS release completed. API revision: $NEW"
