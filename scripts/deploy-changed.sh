#!/usr/bin/env bash
# Deploy ONLY the explicitly selected changed Ticarti services.
# e.g. bash scripts/deploy-changed.sh master
#      bash scripts/deploy-changed.sh api master marketing
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${PROJECT:-wedidit-64fae}"
API_REGION="${API_REGION:-europe-west1}"
if [ "$#" -eq 0 ]; then
  echo "Usage: bash scripts/deploy-changed.sh api|master|marketing [additional services]" >&2
  echo "Select only services with changed code. This intentionally has no deploy-all default." >&2
  exit 2
fi
API=0
BACKENDS=()
for item in "$@"; do
  case "$item" in
    api) API=1 ;;
    master) BACKENDS+=("apphosting:commerce-master") ;;
    marketing) BACKENDS+=("apphosting:commerce-marketing") ;;
    *) echo "Unsupported service: $item. No deployments started." >&2; exit 2 ;;
  esac
done
echo "=== Changed services: $* ==="
git rev-parse --short HEAD

if [ "$API" -eq 1 ]; then
  echo "=== Testing changed API code ==="
  npm --workspace @commerce/api run test:website-blog
  SERVICE="commerce-api"
  IMAGE="${API_REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}:code-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"
  OLD="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$API_REGION" --format=json |
    node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const t=JSON.parse(s).status?.traffic||[];process.stdout.write(t.find(x=>x.percent===100)?.revisionName||'')})")"
  if [ -z "$OLD" ]; then echo "No 100% traffic-serving API revision found. Refusing deployment." >&2; exit 1; fi
  echo "=== Building API image ==="
  gcloud builds submit apps/api --tag="$IMAGE" --project="$PROJECT" --region="$API_REGION"
  SUFFIX="cms$(date +%m%d%H%M%S)"
  NEW="${SERVICE}-${SUFFIX}"
  gcloud run deploy "$SERVICE" --image="$IMAGE" --revision-suffix="$SUFFIX" --no-traffic --project="$PROJECT" --region="$API_REGION" --quiet
  READY="$(gcloud run revisions describe "$NEW" --project="$PROJECT" --region="$API_REGION" --format=json |
    node -e "let s='';process.stdin.on('data',x=>s+=x).on('end',()=>{const c=JSON.parse(s).status?.conditions||[];process.stdout.write(c.find(x=>x.type==='Ready')?.status||'Unknown')})")"
  if [ "$READY" != "True" ]; then echo "API revision is not ready: $NEW ($READY)" >&2; exit 1; fi
  gcloud run services update-traffic "$SERVICE" --to-revisions="${NEW}=100" --project="$PROJECT" --region="$API_REGION" --quiet
  API_URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$API_REGION" --format='value(status.url)')"
  FAILED=0
  if [ -z "$API_URL" ]; then FAILED=1
  else
    for endpoint in "/v1/health" "/v1/public/website/locales" "/v1/public/website/faq?lang=tr" "/v1/public/website/blog?lang=tr"; do
      code="$(curl -LsS --retry 3 --retry-delay 2 --max-time 20 -o /dev/null -w '%{http_code}' "${API_URL}${endpoint}")" || code=000
      echo "$endpoint -> HTTP $code"
      if [ "$code" != 200 ]; then FAILED=1; fi
    done
  fi
  if [ "$FAILED" -ne 0 ]; then
    echo "API health failure. Restoring previous revision $OLD" >&2
    gcloud run services update-traffic "$SERVICE" --to-revisions="${OLD}=100" --project="$PROJECT" --region="$API_REGION" --quiet
    exit 1
  fi
fi

if [ "${#BACKENDS[@]}" -gt 0 ]; then
  ONLY="$(IFS=,; echo "${BACKENDS[*]}")"
  echo "=== Deploying only selected Firebase backends: $ONLY ==="
  firebase deploy --only "$ONLY" --project="$PROJECT"
fi

if [ "$API" -eq 1 ]; then
  echo "=== Retain only the latest 10 API revisions; no day-based cutoff ==="
  if ! bash scripts/prune-cloud-run-revisions.sh --apply; then
    echo "Warning: API live deployment succeeded, but old-revision cleanup failed. It can be retried separately." >&2
  fi
fi
echo "=== Selected service deployments complete ==="
