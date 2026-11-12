#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="${GCP_PROJECT:-wedidit-64fae}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE=commerce-api
JOB=commerce-db-init
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}"
usage() {
  printf '%s\n' 'Usage: scripts/deploy-fast.sh frontend {admin|storefront|superadmin|developer|help}' '       scripts/deploy-fast.sh api' '       scripts/deploy-fast.sh api-migrate' 'Set TICARTI_DEPLOY_EXECUTE=YES to enable real deployment. Default is a non-mutating plan.'
}
MODE="${1:-}"; APP="${2:-}"
case "$MODE" in
  frontend)
    case "$APP" in admin|storefront|superadmin|developer|help) ;; *) usage; exit 2;; esac
    [ -f "apps/${APP}/package.json" ] || { echo 'Missing workspace'; exit 1; }
    echo "PLAN: firebase deploy --only apphosting:commerce-${APP} --project ${PROJECT}"
    [ "${TICARTI_DEPLOY_EXECUTE:-NO}" = YES ] || exit 0
    command -v firebase >/dev/null || { echo 'firebase CLI missing'; exit 1; }
    firebase deploy --only "apphosting:commerce-${APP}" --project "$PROJECT"
    exit 0;;
  api|api-migrate) [ -z "$APP" ] || { usage; exit 2; };;
  *) usage; exit 2;;
esac
STAMP="$(date -u +%Y%m%d%H%M%S)"
IMAGE="${REGISTRY}:fast-${STAMP}"
CACHE="${REGISTRY}:fast-build-cache"
echo "PLAN: build API image ${IMAGE}, deploy no-traffic candidate, check live+ready, promote only on success"
if [ "$MODE" = api-migrate ]; then
 echo "PLAN: update and execute ${JOB} using exact candidate image before traffic shift"
else
 echo 'PLAN: NO database job; schema changes require api-migrate'
fi
[ "${TICARTI_DEPLOY_EXECUTE:-NO}" = YES ] || exit 0
command -v gcloud >/dev/null || { echo 'gcloud CLI missing'; exit 1; }
command -v curl >/dev/null || { echo 'curl missing'; exit 1; }
if [ "$MODE" = api-migrate ] && [ "${TICARTI_MIGRATION_APPROVED:-NO}" != YES ]; then
 echo 'Migration requires TICARTI_MIGRATION_APPROVED=YES, verified backup and compatible migration plan'; exit 1
fi
if [ "$MODE" = api ]; then
 echo 'API-only deploy: confirm that no unapplied database migrations are present'
fi
if [ "$MODE" = api-migrate ]; then
  bash scripts/release-v33-1-1-preflight.sh
fi
npm run verify:production-migrations
node scripts/p1-platform-hardening-check.mjs
node scripts/core-v33-priorities-check.mjs
node scripts/verify-fast-deploy.mjs
node scripts/verify-v33-1-security.mjs
node scripts/verify-v33-1-commerce.mjs
npm run verify:p0
gcloud builds submit . --config cloudbuild-api-fast.yaml --region "$REGION" --project "$PROJECT" --substitutions "_IMAGE=${IMAGE},_CACHE_IMAGE=${CACHE}"
SUFFIX="f$(date -u +%m%d%H%M%S)"
TAG="candidate-${SUFFIX}"
gcloud run deploy "$SERVICE" --image "$IMAGE" --region "$REGION" --project "$PROJECT" --revision-suffix "$SUFFIX" --tag "$TAG" --no-traffic
SERVICE_JSON="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" --format=json)"
CANDIDATE="$(printf '%s' "$SERVICE_JSON" | python3 -c '
import json,sys
j=json.load(sys.stdin)
tag=sys.argv[1]; expected=sys.argv[2]
rows=[x for x in j.get("status",{}).get("traffic",[]) if x.get("tag")==tag]
if len(rows)!=1 or rows[0].get("revisionName")!=expected or not rows[0].get("url", "").startswith("https://"):
    sys.exit("BLOCKED: candidate tag/revision mismatch")
print(rows[0]["revisionName"] + " " + rows[0]["url"])
' "$TAG" "${SERVICE}-${SUFFIX}")"
read -r REVISION CANDIDATE_URL <<< "$CANDIDATE"
REVISION_IMAGE="$(gcloud run revisions describe "$REVISION" --region "$REGION" --project "$PROJECT" --format='value(status.imageDigest)')"
# Cloud Run stores the immutable digest, not the mutable tag passed to deploy.
# Resolve the tag in Artifact Registry and compare two digests rather than tag vs digest.
IMAGE_DESCRIPTION="$(gcloud artifacts docker images describe "$IMAGE" --project "$PROJECT" --format=json)"
EXPECTED_IMAGE_DIGEST="$(printf '%s' "$IMAGE_DESCRIPTION" | python3 -c '
import json,re,sys
row=json.load(sys.stdin)
summary=row.get("image_summary",row)
for key in ("fully_qualified_digest","digest"):
    match=re.search(r"sha256:[0-9a-f]{64}",str(summary.get(key,"")),re.I)
    if match:
        print(match.group(0).lower())
        sys.exit(0)
sys.exit("BLOCKED: Artifact Registry image digest unavailable")
')"
ACTUAL_IMAGE_DIGEST="$(printf '%s' "$REVISION_IMAGE" | grep -Eo 'sha256:[0-9a-f]{64}' | /usr/bin/head -1)"
[ -n "$EXPECTED_IMAGE_DIGEST" ] && [ "$ACTUAL_IMAGE_DIGEST" = "$EXPECTED_IMAGE_DIGEST" ] || {
  echo 'BLOCKED: candidate revision digest differs from Artifact Registry tag digest'; exit 1;
}
if [ "$MODE" = api-migrate ]; then
  bash scripts/release-v33-1-1-preflight.sh
  gcloud run jobs update "$JOB" --image "$IMAGE" --region "$REGION" --project "$PROJECT"
  gcloud run jobs execute "$JOB" --region "$REGION" --project "$PROJECT" --wait
fi
for path in /v1/health/live /v1/health/ready; do
  echo "Candidate health: ${path}"
  ok=NO
  for i in $(seq 1 12); do
    if curl --fail --silent --show-error --max-time 12 "${CANDIDATE_URL}${path}" | node -e 'let x="";process.stdin.on("data",d=>x+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(x);process.exit(j.ok===true?0:1)}catch{process.exit(1)}})' ; then ok=YES; break; fi
    sleep 5
  done
  [ "$ok" = YES ] || { echo "Candidate health failed: ${path}; traffic unchanged"; exit 1; }
done
if [ "$MODE" = api-migrate ]; then
  echo "Migration candidate ${REVISION} healthy; traffic unchanged. Run OAuth runtime checks before separate promotion."
  exit 0
fi
if [ "${TICARTI_PROMOTE_APPROVED:-NO}" != YES ]; then
  echo "Candidate ${REVISION} healthy. Traffic remains unchanged until TICARTI_PROMOTE_APPROVED=YES"
  exit 0
fi
[ "${TICARTI_RUNTIME_SMOKE_APPROVED:-NO}" = YES ] || { echo 'BLOCKED: runtime smoke approval missing'; exit 1; }
gcloud run services update-traffic "$SERVICE" --to-revisions "${REVISION}=100" --region "$REGION" --project "$PROJECT"
echo "Promoted candidate ${REVISION} to 100%"
