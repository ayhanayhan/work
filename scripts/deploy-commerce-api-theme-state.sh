#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-wedidit-64fae}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-commerce-api}"
REPO="${REPO:-cloud-run-source-deploy}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:theme-v23-3-2-${STAMP}"

echo "Building: $IMAGE"
gcloud builds submit apps/api \
  --tag="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT"

echo "Deploying image"
gcloud run deploy "$SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT"

REVISION="$(gcloud run services describe "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --format='value(status.latestCreatedRevisionName)')"

if [ -z "$REVISION" ]; then
  echo "ERROR: latestCreatedRevisionName could not be determined"
  exit 1
fi

echo "Routing 100% traffic to: $REVISION"
gcloud run services update-traffic "$SERVICE" \
  --to-revisions="${REVISION}=100" \
  --region="$REGION" \
  --project="$PROJECT"

echo "Final service state"
gcloud run services describe "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --format="yaml(status.latestCreatedRevisionName,status.latestReadyRevisionName,status.traffic,spec.template.spec.containers[0].image)"
