#!/usr/bin/env bash
set -euo pipefail

PROJECT="${GCP_PROJECT:-wedidit-64fae}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="${API_SERVICE:-commerce-api}"
SQL_INSTANCE="${SQL_INSTANCE:-commerce-db}"
JOB="commerce-superadmin-reset"
PASSWORD_SECRET="commerce-seed-superadmin-password"

command -v gcloud >/dev/null 2>&1 || { echo "HATA: gcloud kurulu degil." >&2; exit 1; }
ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | sed -n '1p')"
[[ -n "$ACCOUNT" ]] || { echo "HATA: once gcloud auth login calistirin." >&2; exit 1; }

read -r -p "Super Admin e-posta [superadmin@example.com]: " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-superadmin@example.com}"
read -r -s -p "Yeni sifre (en az 12, buyuk/kucuk harf, rakam, sembol): " ADMIN_PASSWORD
echo
read -r -s -p "Yeni sifre tekrar: " ADMIN_PASSWORD_CONFIRM
echo
[[ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]] || { echo "HATA: sifreler ayni degil." >&2; exit 1; }
[[ "$ADMIN_PASSWORD" =~ [a-z] && "$ADMIN_PASSWORD" =~ [A-Z] && "$ADMIN_PASSWORD" =~ [0-9] && "$ADMIN_PASSWORD" =~ [^A-Za-z0-9] && ${#ADMIN_PASSWORD} -ge 12 && ${#ADMIN_PASSWORD} -le 128 ]] || { echo "HATA: sifre guvenlik kurallarini karsilamiyor." >&2; exit 1; }

IMAGE="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(spec.template.spec.containers[0].image)')"
SERVICE_ACCOUNT="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(spec.template.spec.serviceAccountName)')"
CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT" --format='value(connectionName)')"
[[ -n "$IMAGE" && -n "$SERVICE_ACCOUNT" && -n "$CONNECTION_NAME" ]] || { echo "HATA: API image, servis hesabi veya Cloud SQL baglantisi bulunamadi." >&2; exit 1; }

printf '%s' "$ADMIN_PASSWORD" | gcloud secrets versions add "$PASSWORD_SECRET" --project "$PROJECT" --data-file=- >/dev/null
unset ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM

gcloud run jobs deploy "$JOB" \
  --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --service-account "$SERVICE_ACCOUNT" --set-cloudsql-instances "$CONNECTION_NAME" \
  --set-env-vars "NODE_ENV=production,RESET_SUPERADMIN_EMAIL=$ADMIN_EMAIL" \
  --set-secrets "DATABASE_URL=commerce-database-url:latest,RESET_SUPERADMIN_PASSWORD=$PASSWORD_SECRET:latest" \
  --command "npm" --args "run,superadmin:reset-password" \
  --task-timeout 10m --max-retries 0 --memory 512Mi --cpu 1 \
  --execute-now --wait --quiet

echo "Super Admin erisimi hazir: $ADMIN_EMAIL"
echo "Tum eski Super Admin oturumlari kapatildi."
