#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$HOME/Downloads/commerce-saas-wedidit-test-runtimefix}"
PROJECT="${GCP_PROJECT:-wedidit-64fae}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="${CLOUD_RUN_SERVICE:-commerce-api}"
JOB="${DB_INIT_JOB:-commerce-db-init}"
APPHOSTING_REGION="${APPHOSTING_REGION:-europe-west4}"
CANDIDATE_TAG="${CLOUD_RUN_CANDIDATE_TAG:-candidate}"
TICARTI_V30_9_DEPLOY_HARDENING=1

cd "$ROOT"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "HATA: '$1' bulunamadı." >&2; exit 1; }
}
need npm
need node
need npx
need gcloud
need firebase
need python3
need curl

printf '\n== Ticarti Step 5 + 6 + 7 FINAL production deploy ==\n'
echo "Project : $PROJECT"
echo "Region  : $REGION"
echo "Root    : $ROOT"
echo

TOTAL=18
STEP=0
next() { STEP=$((STEP+1)); echo; echo "[$STEP/$TOTAL] $*"; }

TRAFFIC_SHIFTED=0
DEPLOY_SUCCESS=0
PREVIOUS_REVISION=""
REVISION=""
API_URL=""
CANDIDATE_URL=""

on_exit() {
  local rc=$?
  trap - EXIT
  if [ "$DEPLOY_SUCCESS" != "1" ] && [ "$TRAFFIC_SHIFTED" = "1" ] && \
     [ -n "${PREVIOUS_REVISION:-}" ] && [ "${PREVIOUS_REVISION:-}" != "${REVISION:-}" ]; then
    echo
    echo "HATA: Deploy tamamlanmadı. API trafiği eski revision'a geri alınıyor: $PREVIOUS_REVISION" >&2
    if gcloud run services update-traffic "$SERVICE" \
      --project "$PROJECT" \
      --region "$REGION" \
      --to-revisions "$PREVIOUS_REVISION=100" \
      --quiet; then
      echo "ROLLBACK OK: $PREVIOUS_REVISION tekrar %100 trafik alıyor." >&2
    else
      echo "KRITIK: Otomatik API rollback başarısız. Manuel müdahale gerekli." >&2
    fi
  fi
  exit "$rc"
}
trap on_exit EXIT

api_smoke() {
  local label="$1"
  local base="${2%/}"
  local path attempt body
  for path in /v1/health/live /v1/health/ready; do
    body=""
    for attempt in $(seq 1 20); do
      if body="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 12 "$base$path" 2>/dev/null)"; then
        if printf '%s' "$body" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("ok") is True' "$path"; then
          echo "SMOKE OK: $label $path"
          break
        fi
      fi
      if [ "$attempt" = "20" ]; then
        echo "HATA: $label smoke başarısız: $base$path" >&2
        return 1
      fi
      sleep 3
    done
  done
}

web_smoke() {
  local label="$1"
  local url="$2"
  local attempt code
  for attempt in $(seq 1 20); do
    code="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' --connect-timeout 5 --max-time 15 "$url" 2>/dev/null || true)"
    case "$code" in
      2??|3??)
        echo "SMOKE OK: $label HTTP $code"
        return 0
        ;;
    esac
    if [ "$attempt" = "20" ]; then
      echo "HATA: $label smoke başarısız: $url (HTTP ${code:-000})" >&2
      return 1
    fi
    sleep 3
  done
}


next "Dependencies"
npm install

next "Final platform verification"
node scripts/production-e2e-v30_8.mjs
node verify-final-platform.mjs
node scripts/verify-production-readiness.mjs
if [ -f scripts/stabilization-check.mjs ]; then node scripts/stabilization-check.mjs; fi
if [ -f scripts/core-freeze-check.mjs ]; then node scripts/core-freeze-check.mjs; fi
if [ -f scripts/verify-metronic-admin.mjs ]; then node scripts/verify-metronic-admin.mjs; fi
if [ -f scripts/production-migration-v30-check.mjs ]; then node scripts/production-migration-v30-check.mjs; fi
if [ -f scripts/api-image-v30_1-check.mjs ]; then node scripts/api-image-v30_1-check.mjs; fi
if [ -f scripts/production-concurrency-v30_2-check.mjs ]; then node scripts/production-concurrency-v30_2-check.mjs; fi
if [ -f scripts/payment-webhook-v30_3-check.mjs ]; then node scripts/payment-webhook-v30_3-check.mjs; fi
if [ -f scripts/tenant-isolation-v30_4-check.mjs ]; then node scripts/tenant-isolation-v30_4-check.mjs; fi
if [ -f scripts/shipping-rates-v30_5-check.mjs ]; then node scripts/shipping-rates-v30_5-check.mjs; fi
if [ -f scripts/b2b-credit-v30_6-check.mjs ]; then node scripts/b2b-credit-v30_6-check.mjs; fi
if [ -f scripts/exchange-completion-v30_7-check.mjs ]; then node scripts/exchange-completion-v30_7-check.mjs; fi
if [ -f scripts/shipping-rates-v30_5-check.mjs ]; then node scripts/shipping-rates-v30_5-check.mjs; fi

next "Prisma validate + generate"
export DATABASE_URL="${DATABASE_URL:-postgresql://ticarti_build:ticarti_build@127.0.0.1:5432/ticarti_build?schema=public}"
npx prisma validate --schema apps/api/prisma/schema.prisma
npx prisma generate --schema apps/api/prisma/schema.prisma

next "API production build"
npm --workspace @commerce/api run build

next "Admin production build"
npm --workspace @commerce/admin run build

next "Storefront production build"
npm --workspace @commerce/storefront run build

next "Superadmin production build"
npm --workspace @commerce/superadmin run build

next "API image build"
STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="final-step7-${STAMP}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}:${TAG}"
gcloud builds submit . \
  --project "$PROJECT" \
  --region "$REGION" \
  --config cloudbuild-api.yaml \
  --substitutions "_IMAGE=${IMAGE}"

next "Create API candidate revision at 0% traffic"
PREVIOUS_REVISION="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format='value(status.latestReadyRevisionName)')"
if [ -z "$PREVIOUS_REVISION" ]; then
  echo "HATA: Mevcut ready revision rollback hedefi alınamadı." >&2
  exit 1
fi
echo "Rollback revision: $PREVIOUS_REVISION"

SUFFIX="final$(date +%H%M%S)"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$IMAGE" \
  --revision-suffix "$SUFFIX" \
  --tag "$CANDIDATE_TAG" \
  --no-traffic \
  --quiet

REVISION="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format='value(status.latestCreatedRevisionName)')"

if [ -z "$REVISION" ]; then
  echo "HATA: Yeni Cloud Run revision adı alınamadı." >&2
  exit 1
fi

echo "Candidate revision: $REVISION"
READY=""
READY_REASON=""
READY_MESSAGE=""
for ATTEMPT in $(seq 1 100); do
  STATUS_JSON="$(gcloud run revisions describe "$REVISION" \
    --project "$PROJECT" \
    --region "$REGION" \
    --format=json 2>/dev/null || true)"

  if [ -n "$STATUS_JSON" ]; then
    IFS=$'\t' read -r READY READY_REASON READY_MESSAGE <<EOF
$(printf '%s' "$STATUS_JSON" | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    print("\t\t")
    raise SystemExit
for c in d.get("status",{}).get("conditions",[]):
    if c.get("type") == "Ready":
        status=str(c.get("status") or "")
        reason=str(c.get("reason") or "")
        message=str(c.get("message") or "").replace("\t"," ").replace("\n"," ")
        print(f"{status}\t{reason}\t{message}")
        break
else:
    print("\t\t")
')
EOF
  fi

  echo "Readiness [$ATTEMPT/100]: status=${READY:-pending} reason=${READY_REASON:-none}"

  if [ "$READY" = "True" ]; then
    echo "API candidate Ready=True: $REVISION"
    break
  fi

  case "$READY_REASON" in
    HealthCheckContainerError|ContainerMissing|ContainerPermissionDenied|ContainerImageUnauthorized|ContainerImageNotFound|InvalidState|RevisionFailed|ResourceNotReady)
      echo "HATA: Cloud Run revision terminal readiness hatası: $READY_REASON" >&2
      [ -n "$READY_MESSAGE" ] && echo "$READY_MESSAGE" >&2
      exit 1
      ;;
  esac

  sleep 3
done

if [ "$READY" != "True" ]; then
  echo "HATA: Yeni API revision Ready olmadı: $REVISION" >&2
  gcloud run revisions describe "$REVISION" --project "$PROJECT" --region "$REGION" --format='yaml(status.conditions,status.logUrl)' || true
  exit 1
fi

SERVICE_JSON="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format=json)"
CANDIDATE_URL="$(printf '%s' "$SERVICE_JSON" | python3 -c 'import json,sys; rev=sys.argv[1]; tag=sys.argv[2]; d=json.load(sys.stdin); xs=d.get("status",{}).get("traffic",[]); print(next((x.get("url","") for x in xs if x.get("revisionName")==rev and x.get("tag")==tag and x.get("url")), next((x.get("url","") for x in xs if x.get("tag")==tag and x.get("url")), "")))' "$REVISION" "$CANDIDATE_TAG")"
if [ -z "$CANDIDATE_URL" ]; then
  echo "HATA: Candidate tag URL alınamadı (tag=$CANDIDATE_TAG revision=$REVISION)." >&2
  exit 1
fi
echo "Candidate URL: $CANDIDATE_URL"

next "Database schema/init job"
gcloud run jobs update "$JOB" \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$IMAGE" \
  --update-env-vars TEST_DB_SEED=false \
  --quiet

gcloud run jobs execute "$JOB" \
  --project "$PROJECT" \
  --region "$REGION" \
  --wait

next "Candidate API smoke after migration"
api_smoke "candidate" "$CANDIDATE_URL"

next "Shift API traffic to candidate"
gcloud run services update-traffic "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --to-revisions "$REVISION=100" \
  --quiet

TRAFFIC_SHIFTED=1

API_URL="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format='value(status.url)')"

if [ -z "$API_URL" ]; then
  echo "HATA: API URL alınamadı." >&2
  exit 1
fi

echo "API_URL=$API_URL"

next "Post-shift API smoke"
api_smoke "service" "$API_URL"

next "Synchronize App Hosting API origin"
python3 - "$API_URL" <<'PY'
from pathlib import Path
import re, sys
api = sys.argv[1].rstrip('/')
for name in ('admin', 'storefront', 'superadmin', 'developer'):
    p = Path(f'apps/{name}/apphosting.yaml')
    if not p.exists():
        continue
    s = p.read_text(encoding='utf-8')
    lines = s.splitlines()
    out=[]
    in_api_origin=False
    changed=False
    for line in lines:
        stripped=line.strip()
        if stripped.startswith('- variable:'):
            in_api_origin = stripped.split(':',1)[1].strip() == 'API_ORIGIN'
        elif in_api_origin and stripped.startswith('value:'):
            indent=line[:len(line)-len(line.lstrip())]
            line=f'{indent}value: "{api}"'
            changed=True
            in_api_origin=False
        out.append(line)
    ns='\n'.join(out) + ('\n' if s.endswith('\n') else '')
    if not changed:
        ns = re.sub(r'(API_ORIGIN:\s*[^\n]*value:\s*["\']?)(https://[^"\'\s]+)', lambda m:m.group(1)+api, ns)
    p.write_text(ns, encoding='utf-8')
    print('OK', p, '->', api)
PY

next "Firebase Admin + Storefront"
firebase deploy --project "$PROJECT" --only apphosting:commerce-admin
firebase deploy --project "$PROJECT" --only apphosting:commerce-storefront

next "Firebase Superadmin"
firebase deploy --project "$PROJECT" --only apphosting:commerce-superadmin

next "App Hosting smoke"
ADMIN_URL="https://commerce-admin--${PROJECT}.${APPHOSTING_REGION}.hosted.app"
STOREFRONT_URL="https://commerce-storefront--${PROJECT}.${APPHOSTING_REGION}.hosted.app"
SUPERADMIN_URL="https://commerce-superadmin--${PROJECT}.${APPHOSTING_REGION}.hosted.app"
web_smoke "admin" "$ADMIN_URL/admin/login"
web_smoke "storefront" "$STOREFRONT_URL"
web_smoke "superadmin" "$SUPERADMIN_URL"

next "Final verification/status"
node verify-final-platform.mjs
node scripts/verify-production-readiness.mjs

gcloud run services describe "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format='table(metadata.name,status.url,status.latestReadyRevisionName)'

DEPLOY_SUCCESS=1
trap - EXIT

printf '\n=============================================\n'
echo "TICARTI FINAL DEPLOY TAMAMLANDI"
echo "API      : $API_URL"
echo "Revision : $REVISION"
echo "Image    : $IMAGE"
echo "Admin    : commerce-admin"
echo "Storefront: commerce-storefront"
echo "Superadmin: commerce-superadmin"
printf '=============================================\n'
