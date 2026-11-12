#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT=wedidit-64fae
REGION=europe-west1
JOB=ticarti-isolated-oauth-e2e
INSTANCE=commerce-db-loadtest
IMAGE=europe-west1-docker.pkg.dev/wedidit-64fae/cloud-run-source-deploy/commerce-api-e2e:v33-1-4a
MODE="${1:-plan}"
case "$MODE" in plan|build|create|execute|status) ;; *) echo 'Usage: bash scripts/isolated-e2e-cloudrun.sh {plan|build|create|execute|status}'; exit 2;; esac
if [ "$MODE" = plan ]; then
 echo "PLAN: isolated image ${IMAGE}"
 echo "PLAN: separate job ${JOB}, SQL ${INSTANCE}, secret commerce-loadtest-database-url:2"
 echo 'PLAN: build, create, execute are separate opt-in steps; no production job/service changes'
 exit 0
fi
if [ "$MODE" = status ]; then
 gcloud run jobs describe "$JOB" --project "$PROJECT" --region "$REGION" --format='value(metadata.name,status.conditions[0].status)'
 exit 0
fi
[ "${TICARTI_E2E_CLOUD_EXECUTE:-NO}" = YES ] || { echo 'BLOCKED: TICARTI_E2E_CLOUD_EXECUTE=YES required'; exit 2; }
if [ "$MODE" = build ]; then
 gcloud builds submit . --project "$PROJECT" --region "$REGION" --config cloudbuild-isolated-e2e.yaml --substitutions "_IMAGE=${IMAGE}"
 exit 0
fi
if [ "$MODE" = create ]; then
 [ "$(gcloud sql instances describe "$INSTANCE" --project "$PROJECT" --format='value(state)')" = RUNNABLE ] || { echo 'BLOCKED: isolated SQL not RUNNABLE'; exit 2; }
 if gcloud run jobs describe "$JOB" --project "$PROJECT" --region "$REGION" >/dev/null 2>&1; then
   echo 'BLOCKED: test job already exists; review before updating'; exit 2
 fi
 gcloud run jobs create "$JOB" --project "$PROJECT" --region "$REGION" \
   --image "$IMAGE" \
   --service-account ticarti-e2e-runner@wedidit-64fae.iam.gserviceaccount.com \
   --set-cloudsql-instances wedidit-64fae:europe-west1:commerce-db-loadtest \
   --set-secrets DATABASE_URL=commerce-loadtest-database-url:2 \
   --set-env-vars TICARTI_ISOLATED_DB_E2E=YES \
   --tasks=1 --max-retries=0 --task-timeout=600s
 echo 'Test job created; run execute separately'
 exit 0
fi
if [ "$MODE" = execute ]; then
 gcloud run jobs describe "$JOB" --project "$PROJECT" --region "$REGION" --format=json | python3 -c '
import json,sys
j=json.load(sys.stdin)
cs=[]
def walk(x):
 if isinstance(x,dict):
  if isinstance(x.get("containers"),list): cs.extend(x["containers"])
  for v in x.values(): walk(v)
 elif isinstance(x,list):
  for v in x: walk(v)
walk(j)
if len(cs)!=1: sys.exit("BLOCKED: unexpected job container count")
c=cs[0]
refs={e.get("name"):e.get("valueFrom",{}).get("secretKeyRef",{}) for e in c.get("env",[])}
if refs.get("DATABASE_URL",{}).get("name")!="commerce-loadtest-database-url" or str(refs["DATABASE_URL"].get("key"))!="2": sys.exit("BLOCKED: test secret mismatch")
print("OK: test job secret reference verified")'
 gcloud run jobs execute "$JOB" --project "$PROJECT" --region "$REGION" --wait
fi
