#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-wedidit-64fae}"
REGION="${REGION:-europe-west1}"
RUN_SERVICE="${RUN_SERVICE:-commerce-api-loadtest}"
SQL_INSTANCE="${SQL_INSTANCE:-commerce-db-loadtest}"
REDIS_INSTANCE="${REDIS_INSTANCE:-commerce-redis-loadtest}"
DB_SECRET_NAME="${DB_SECRET_NAME:-commerce-loadtest-database-url}"
REDIS_SECRET_NAME="${REDIS_SECRET_NAME:-commerce-loadtest-redis-url}"
BYPASS_SECRET_NAME="${BYPASS_SECRET_NAME:-commerce-loadtest-bypass-token}"
BASE_VARIANT_ID="${LOADTEST_BASE_VARIANT_ID:-86de26c5-eb4f-4fe6-aa6c-62b1c2512617}"
STORE_SLUG="${LOADTEST_STORE_SLUG:-main}"
FIXTURE_FILE="${LOADTEST_FIXTURE_FILE:-scripts/.loadtest-mixed-fixture.json}"
RESULT_FILE="${LOADTEST_RESULT_FILE:-docs/loadtest/mixed-v33.0.16-5000-$(date +%Y%m%d-%H%M%S).json}"

case "$RUN_SERVICE:$SQL_INSTANCE:$REDIS_INSTANCE" in
  *loadtest*:*loadtest*:*loadtest*) ;;
  *) echo "HATA: güvenlik kontrolü başarısız; tüm kaynak adları loadtest içermeli"; exit 1 ;;
esac

PROXY_PID=""
REDIS_CREATED=0
SQL_STARTED=0

cleanup(){
  set +e
  unset LOADTEST_BYPASS_TOKEN DATABASE_URL DB_SECRET
  if [[ -n "${PROXY_PID:-}" ]]; then kill "$PROXY_PID" >/dev/null 2>&1 || true; fi
  echo
  echo "=== COST GUARD: Cloud Run scale to zero ==="
  gcloud run services update "$RUN_SERVICE" --project="$PROJECT" --region="$REGION" --min=0 --max=0 --quiet >/dev/null 2>&1 || true
  echo "=== COST GUARD: Cloud SQL stop ==="
  gcloud sql instances patch "$SQL_INSTANCE" --project="$PROJECT" --activation-policy=NEVER --quiet >/dev/null 2>&1 || true
  echo "=== COST GUARD: Redis delete ==="
  gcloud redis instances delete "$REDIS_INSTANCE" --project="$PROJECT" --region="$REGION" --quiet >/dev/null 2>&1 || true
  echo "=== COST GUARD COMPLETE ==="
}
trap cleanup EXIT INT TERM

echo "=== 1/7 Cloud SQL start ==="
gcloud sql instances patch "$SQL_INSTANCE" --project="$PROJECT" --activation-policy=ALWAYS --quiet
SQL_STARTED=1

for i in $(seq 1 90); do
  STATE="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT" --format='value(state)' 2>/dev/null || true)"
  [[ "$STATE" == "RUNNABLE" ]] && break
  sleep 4
done
[[ "${STATE:-}" == "RUNNABLE" ]] || { echo "HATA: Cloud SQL RUNNABLE olmadı"; exit 1; }

echo "=== 2/7 Redis recreate ==="
NETWORK="default"
if [[ -f docs/loadtest/redis-loadtest-last-config.yaml ]]; then
  SAVED="$(grep -E '^[[:space:]]*authorizedNetwork:' docs/loadtest/redis-loadtest-last-config.yaml | sed -n '1p' | sed 's/^[^:]*:[[:space:]]*//' || true)"
  [[ -n "$SAVED" ]] && NETWORK="$SAVED"
fi

if ! gcloud redis instances describe "$REDIS_INSTANCE" --project="$PROJECT" --region="$REGION" >/dev/null 2>&1; then
  gcloud redis instances create "$REDIS_INSTANCE" \
    --project="$PROJECT" \
    --region="$REGION" \
    --size=1 \
    --tier=standard \
    --redis-version=redis_7_0 \
    --network="$NETWORK" \
    --connect-mode=PRIVATE_SERVICE_ACCESS \
    --enable-auth \
    --quiet
  REDIS_CREATED=1
fi

REDIS_HOST="$(gcloud redis instances describe "$REDIS_INSTANCE" --project="$PROJECT" --region="$REGION" --format='value(host)')"
REDIS_PORT="$(gcloud redis instances describe "$REDIS_INSTANCE" --project="$PROJECT" --region="$REGION" --format='value(port)')"
REDIS_AUTH="$(gcloud redis instances get-auth-string "$REDIS_INSTANCE" --project="$PROJECT" --region="$REGION" --format='value(authString)')"
[[ -n "$REDIS_HOST" && -n "$REDIS_AUTH" ]] || { echo "HATA: Redis host/auth alınamadı"; exit 1; }

printf 'redis://:%s@%s:%s' "$REDIS_AUTH" "$REDIS_HOST" "${REDIS_PORT:-6379}" \
  | gcloud secrets versions add "$REDIS_SECRET_NAME" --project="$PROJECT" --data-file=- >/dev/null
unset REDIS_AUTH

echo "=== 3/7 Cloud Run enable ==="
gcloud run services update "$RUN_SERVICE" \
  --project="$PROJECT" \
  --region="$REGION" \
  --min=5 \
  --max=5 \
  --concurrency=120 \
  --update-secrets="REDIS_URL=${REDIS_SECRET_NAME}:latest" \
  --update-env-vars="CHECKOUT_STOCK_BATCH_WINDOW_MS=35,CHECKOUT_STOCK_BATCH_MAX=128,CHECKOUT_STOCK_ADMISSION_MODE=redis-atomic,CHECKOUT_STOCK_TX_RETRY_ATTEMPTS=3,CHECKOUT_STOCK_TX_RETRY_BASE_MS=35" \
  --quiet

LOADTEST_URL="$(gcloud run services describe "$RUN_SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.url)')"
for i in $(seq 1 60); do
  if curl -fsS "$LOADTEST_URL/v1/health/ready" >/dev/null 2>&1; then break; fi
  sleep 3
done
curl -fsS "$LOADTEST_URL/v1/health/ready" >/dev/null

echo "=== 4/7 Cloud SQL proxy + fixture ==="
PROXY_BIN="$(command -v cloud-sql-proxy || command -v cloud_sql_proxy || true)"
[[ -n "$PROXY_BIN" ]] || { echo "HATA: cloud-sql-proxy bulunamadı"; exit 1; }

"$PROXY_BIN" --address 127.0.0.1 --port 5433 "${PROJECT}:${REGION}:${SQL_INSTANCE}" >/tmp/ticarti-loadtest-proxy.log 2>&1 &
PROXY_PID=$!

python3 - <<'PY'
import socket,time,sys
for _ in range(60):
    s=socket.socket(); s.settimeout(.5)
    try:
        s.connect(('127.0.0.1',5433)); s.close(); sys.exit(0)
    except Exception:
        time.sleep(1)
raise SystemExit('Cloud SQL proxy port 5433 did not become ready')
PY

DB_SECRET="$(gcloud secrets versions access latest --secret="$DB_SECRET_NAME" --project="$PROJECT")"
export DB_SECRET
export DATABASE_URL="$(python3 - <<'PY'
import os,urllib.parse
u=urllib.parse.urlsplit(os.environ['DB_SECRET'])
q=[(k,v) for k,v in urllib.parse.parse_qsl(u.query,keep_blank_values=True) if k not in ('host','sslmode')]
netloc=''
if u.username:
    netloc+=urllib.parse.quote(urllib.parse.unquote(u.username),safe='')
    if u.password is not None:
        netloc+=':'+urllib.parse.quote(urllib.parse.unquote(u.password),safe='')
    netloc+='@'
netloc+='127.0.0.1:5433'
print(urllib.parse.urlunsplit((u.scheme,netloc,u.path,urllib.parse.urlencode(q),'')).strip())
PY
)"
unset DB_SECRET

export LOADTEST_STORE_SLUG="$STORE_SLUG"
export LOADTEST_BASE_VARIANT_ID="$BASE_VARIANT_ID"
export LOADTEST_FIXTURE_FILE="$FIXTURE_FILE"
node scripts/prepare-loadtest-mixed-fixture.mjs

echo "=== 5/7 Mixed 5,000 checkout ==="
export LOADTEST_CONFIRM=YES
export LOADTEST_API_URL="${LOADTEST_URL}/v1"
export LOADTEST_TOTAL="${LOADTEST_TOTAL:-5000}"
export LOADTEST_CONCURRENCY="${LOADTEST_CONCURRENCY:-200}"
export LOADTEST_PREP_CONCURRENCY="${LOADTEST_PREP_CONCURRENCY:-20}"
export LOADTEST_RESULT_FILE="$RESULT_FILE"
export LOADTEST_BYPASS_TOKEN="$(gcloud secrets versions access latest --secret="$BYPASS_SECRET_NAME" --project="$PROJECT")"

NODE_OPTIONS="--dns-result-order=ipv4first" node scripts/load-test-checkout-mixed-5000.mjs

echo "=== 6/7 Validate multi-warehouse + oversell ==="
node scripts/validate-loadtest-mixed.mjs

echo "=== 7/7 Result ==="
echo "Benchmark: $RESULT_FILE"
echo "Test complete. Cost guard will now stop SQL, scale Cloud Run to zero and delete load-test Redis."
