#!/usr/bin/env bash
# Complete the existing successful image build and publish the two changed website apps.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${PROJECT:-wedidit-64fae}"
REGION="europe-west1"
SERVICE="commerce-api"
IMAGE="europe-west1-docker.pkg.dev/wedidit-64fae/cloud-run-source-deploy/commerce-api:website-cms-20261107-003548"

echo "=== Current API ==="
OLD="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format=json | node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const t=JSON.parse(s).status.traffic||[];process.stdout.write(t.find(x=>x.percent===100)?.revisionName||'')})")"
if [ -z "$OLD" ]; then echo "Cannot identify existing production API revision" >&2; exit 1; fi
echo "Current live revision: $OLD"

echo "=== Deploy already built image as a new revision ==="
SUFFIX="cms$(date +%m%d%H%M%S)"
gcloud run deploy "$SERVICE" --project="$PROJECT" --region="$REGION" --image="$IMAGE" --revision-suffix="$SUFFIX" --no-traffic --quiet
NEW="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.latestReadyRevisionName)')"
if [ -z "$NEW" ] || [ "$NEW" = "$OLD" ]; then echo "Expected a distinct ready revision; no traffic change performed" >&2; exit 1; fi
echo "Ready API revision: $NEW"

echo "=== Route API traffic to actual new revision ==="
gcloud run services update-traffic "$SERVICE" --to-revisions="${NEW}=100" --project="$PROJECT" --region="$REGION" --quiet

# Use the official service URL, not a legacy hostname/tag.
API_URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.url)')"
if [ -z "$API_URL" ]; then
  echo "Could not retrieve Cloud Run service URL" >&2
  gcloud run services update-traffic "$SERVICE" --to-revisions="${OLD}=100" --project="$PROJECT" --region="$REGION" --quiet
  exit 1
fi
echo "Current Cloud Run URL: $API_URL"
echo "=== Check actual API endpoints ==="
failed=0
for endpoint in "/v1/health" "/v1/public/website/locales" "/v1/public/website/blog?lang=tr"; do
  code="$(curl -L -sS --retry 3 --retry-delay 2 --max-time 25 -o /tmp/ticarti-website-cms-response -w '%{http_code}' "${API_URL}${endpoint}")" || code=000
  echo "$endpoint -> HTTP $code"
  if [ "$code" != "200" ]; then
    head -c 450 /tmp/ticarti-website-cms-response 2>/dev/null || true
    printf '\n'
    failed=1
  fi
done
if [ "$failed" -ne 0 ]; then
  echo "API checks failed; restoring $OLD" >&2
  gcloud run services update-traffic "$SERVICE" --to-revisions="${OLD}=100" --project="$PROJECT" --region="$REGION" --quiet
  exit 1
fi

echo "=== Deploy Master and Marketing from current local source ==="
firebase deploy --only apphosting:commerce-master,apphosting:commerce-marketing --project="$PROJECT"

echo "=== Check published websites ==="
for url in \
  "https://commerce-master--wedidit-64fae.europe-west4.hosted.app/website/blog" \
  "https://commerce-master--wedidit-64fae.europe-west4.hosted.app/website/blog/new" \
  "https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app/" \
  "https://ticarti.com/"; do
  printf '%s -> ' "$url"
  curl -L -sS -o /dev/null -w 'HTTP %{http_code}\n' --max-time 25 "$url" || true
done
echo "=== DONE ==="
