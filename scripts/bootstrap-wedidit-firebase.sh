#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-wedidit-64fae}"
REGION="${REGION:-europe-west1}"
SQL_INSTANCE="${SQL_INSTANCE:-commerce-db}"
DB_NAME="${DB_NAME:-commerce}"
DB_USER="${DB_USER:-commerce}"
API_SERVICE="${API_SERVICE:-commerce-api}"
SA_NAME="${SA_NAME:-commerce-api}"
BUCKET="${BUCKET:-${PROJECT_ID}-commerce-media}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT/.deploy"
SECRETS_FILE="$DEPLOY_DIR/local-secrets.env"
RUNTIME_ENV_FILE="$DEPLOY_DIR/cloudrun-env.yaml"
mkdir -p "$DEPLOY_DIR"
chmod 700 "$DEPLOY_DIR"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' kurulu değil." >&2; exit 1; }; }
need gcloud
need firebase
need openssl
need curl
need node

GCLOUD_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | /usr/bin/sed -n '1p' || true)"
if [[ -z "$GCLOUD_ACCOUNT" ]]; then
  echo "Aktif gcloud oturumu yok. Çalıştır: gcloud auth login"
  exit 1
fi

echo "==> Project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null
firebase use "$PROJECT_ID" >/dev/null

BILLING_ENABLED="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)"
if [[ "$BILLING_ENABLED" != "True" && "$BILLING_ENABLED" != "true" ]]; then
  echo "ERROR: $PROJECT_ID için billing/Blaze aktif görünmüyor. Firebase Console > Usage and billing üzerinden Blaze bağla, sonra scripti tekrar çalıştır."
  exit 1
fi

echo "==> Gerekli API'ler etkinleştiriliyor"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  firebaseapphosting.googleapis.com \
  firebase.googleapis.com >/dev/null

# Re-run safe local secret generation.
if [[ -f "$SECRETS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
else
  DB_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET_VALUE="$(openssl rand -hex 48)"
  INTEGRATION_KEY_VALUE="$(openssl rand -hex 48)"
  SEED_OWNER_PASSWORD_VALUE="$(openssl rand -hex 18)"
  SEED_SUPERADMIN_PASSWORD_VALUE="$(openssl rand -hex 18)"
  cat > "$SECRETS_FILE" <<SECRETS
DB_PASSWORD='$DB_PASSWORD'
JWT_SECRET_VALUE='$JWT_SECRET_VALUE'
INTEGRATION_KEY_VALUE='$INTEGRATION_KEY_VALUE'
SEED_OWNER_PASSWORD_VALUE='$SEED_OWNER_PASSWORD_VALUE'
SEED_SUPERADMIN_PASSWORD_VALUE='$SEED_SUPERADMIN_PASSWORD_VALUE'
SECRETS
  chmod 600 "$SECRETS_FILE"
fi

SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  echo "==> Runtime service account oluşturuluyor: $SA_EMAIL"
  gcloud iam service-accounts create "$SA_NAME" --display-name="Commerce API Runtime" >/dev/null
fi

for ROLE in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" --role="$ROLE" --condition=None >/dev/null
 done

if ! gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "==> Cloud SQL PostgreSQL 15 oluşturuluyor: $SQL_INSTANCE ($REGION)"
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="$REGION" \
    --storage-type=SSD \
    --storage-size=10GB \
    --availability-type=zonal \
    --no-deletion-protection >/dev/null
fi

if ! gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "==> Database oluşturuluyor: $DB_NAME"
  gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" >/dev/null
fi

if ! gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -Fxq "$DB_USER"; then
  echo "==> DB kullanıcısı oluşturuluyor: $DB_USER"
  gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" >/dev/null
else
  echo "==> DB kullanıcısı mevcut; scriptteki local secret ile eşleşmesi için şifre güncelleniyor"
  gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" >/dev/null
fi

CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
DATABASE_URL_VALUE="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}&schema=public&connection_limit=5"

if ! gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
  echo "==> Private media bucket oluşturuluyor: gs://$BUCKET"
  gcloud storage buckets create "gs://$BUCKET" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --default-storage-class=STANDARD \
    --uniform-bucket-level-access >/dev/null
fi
# Keep object access private; API streams media.
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA_EMAIL" --role="roles/storage.objectAdmin" >/dev/null

put_secret(){
  local name="$1" value="$2"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
  else
    printf '%s' "$value" | gcloud secrets create "$name" --replication-policy=automatic --data-file=- >/dev/null
  fi
}

echo "==> Secret Manager güncelleniyor"
put_secret commerce-database-url "$DATABASE_URL_VALUE"
put_secret commerce-jwt-secret "$JWT_SECRET_VALUE"
put_secret commerce-integration-key "$INTEGRATION_KEY_VALUE"
put_secret commerce-seed-owner-password "$SEED_OWNER_PASSWORD_VALUE"
put_secret commerce-seed-superadmin-password "$SEED_SUPERADMIN_PASSWORD_VALUE"

cat > "$RUNTIME_ENV_FILE" <<YAML
NODE_ENV: "production"
AUTH_COOKIE_SAMESITE: "Lax"
AUTH_COOKIE_PATH: "/api/v1/auth"
CUSTOMER_AUTH_COOKIE_PATH: "/api/v1/storefront/customer"
GCS_BUCKET: "$BUCKET"
WEBHOOK_ALLOW_PRIVATE: "false"
CORS_ORIGINS: "http://localhost:3000,http://localhost:3001,http://localhost:3002"
PUBLIC_API_URL: "https://placeholder.invalid"
YAML

echo "==> API Cloud Run'a deploy ediliyor"
gcloud run deploy "$API_SERVICE" \
  --source "$ROOT/apps/api" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --min 0 \
  --max 2 \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 40 \
  --timeout 300 \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$CONNECTION_NAME" \
  --env-vars-file "$RUNTIME_ENV_FILE" \
  --set-secrets="DATABASE_URL=commerce-database-url:latest,JWT_SECRET=commerce-jwt-secret:latest,INTEGRATION_ENCRYPTION_KEY=commerce-integration-key:latest,SEED_OWNER_PASSWORD=commerce-seed-owner-password:latest,SEED_SUPERADMIN_PASSWORD=commerce-seed-superadmin-password:latest" \
  --quiet

API_URL="$(gcloud run services describe "$API_SERVICE" --region "$REGION" --format='value(status.url)')"
echo "==> API URL: $API_URL"

gcloud run services update "$API_SERVICE" --region "$REGION" \
  --update-env-vars="PUBLIC_API_URL=$API_URL" --quiet >/dev/null

# Database bootstrap/seed is intentionally a Cloud Run Job, not service startup.
# The reference-data seed is large and must never block PORT=8080 readiness.
IMAGE_URL="$(gcloud run services describe "$API_SERVICE" --region "$REGION" --format='value(spec.template.spec.containers[0].image)')"
DB_INIT_JOB="commerce-db-init"
echo "==> DB init job deploy/execute: $DB_INIT_JOB"
gcloud run jobs deploy "$DB_INIT_JOB" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE_URL" \
  --service-account "$SA_EMAIL" \
  --set-cloudsql-instances "$CONNECTION_NAME" \
  --set-env-vars="NODE_ENV=production,TEST_DB_SEED=true" \
  --set-secrets="DATABASE_URL=commerce-database-url:latest,SEED_OWNER_PASSWORD=commerce-seed-owner-password:latest,SEED_SUPERADMIN_PASSWORD=commerce-seed-superadmin-password:latest" \
  --command="./db-init.sh" \
  --task-timeout=30m \
  --max-retries=0 \
  --memory=512Mi \
  --cpu=1 \
  --execute-now \
  --wait \
  --quiet

echo "==> Health kontrolü"
for i in {1..30}; do
  if curl -fsS "$API_URL/v1/health" >/dev/null; then
    echo "API HEALTH: OK"
    break
  fi
  if [[ "$i" == "30" ]]; then
    echo "ERROR: API health başarısız. Log: gcloud run services logs read $API_SERVICE --region $REGION --limit 100" >&2
    exit 1
  fi
  sleep 4
done

# Patch App Hosting API origin automatically.
node - "$ROOT" "$API_URL" <<'NODE'
const fs = require('fs');
const path = require('path');
const [root, api] = process.argv.slice(2);
for (const app of ['storefront','admin','superadmin']) {
  const f = path.join(root,'apps',app,'apphosting.yaml');
  let s = fs.readFileSync(f,'utf8');
  s = s.replace(/value:\s*"https:\/\/REPLACE_WITH_CLOUD_RUN_API_URL"/g, `value: "${api}"`);
  fs.writeFileSync(f,s);
}
NODE

cat > "$DEPLOY_DIR/result.env" <<RESULT
PROJECT_ID=$PROJECT_ID
REGION=$REGION
API_URL=$API_URL
CLOUD_SQL_CONNECTION=$CONNECTION_NAME
GCS_BUCKET=$BUCKET
MERCHANT_EMAIL=owner@example.com
MERCHANT_PASSWORD=$SEED_OWNER_PASSWORD_VALUE
SUPERADMIN_EMAIL=superadmin@example.com
SUPERADMIN_PASSWORD=$SEED_SUPERADMIN_PASSWORD_VALUE
RESULT
chmod 600 "$DEPLOY_DIR/result.env"

cat <<DONE

============================================================
ALTYAPI + API HAZIR
============================================================
API: $API_URL
Health: $API_URL/v1/health

Test giriş bilgileri sadece bu makinede:
$DEPLOY_DIR/result.env

Şimdi Firebase App Hosting local-source backendlerini tanımla:
  firebase init apphosting

Bu komutu 3 kez çalıştır ve backend adlarını sırasıyla seç:
  commerce-storefront   root: apps/storefront
  commerce-admin        root: apps/admin
  commerce-superadmin   root: apps/superadmin

Backendler oluşunca repo kökünde:
  firebase deploy --only apphosting:commerce-storefront
  firebase deploy --only apphosting:commerce-admin
  firebase deploy --only apphosting:commerce-superadmin

Liste/URL kontrolü:
  firebase apphosting:backends:list --project $PROJECT_ID

Detaylar: TERMINAL_SETUP.md
============================================================
DONE
