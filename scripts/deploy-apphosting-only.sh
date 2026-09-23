#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:-wedidit-64fae}"

if [ ! -f firebase.json ] || [ ! -f apps/admin/package.json ]; then
  echo "HATA: Geçerli Ticarti proje klasörü bulunamadı: $ROOT"
  exit 1
fi

for APP in admin storefront superadmin; do
  node -e "require('fs').rmSync('apps/$APP/.next',{recursive:true,force:true})"
done

echo "1/3 Admin App Hosting deploy"
firebase deploy --only apphosting:commerce-admin --project "$PROJECT"

echo "2/3 Storefront App Hosting deploy"
firebase deploy --only apphosting:commerce-storefront --project "$PROJECT"

echo "3/3 Superadmin App Hosting deploy"
firebase deploy --only apphosting:commerce-superadmin --project "$PROJECT"

echo "APP HOSTING DEPLOY TAMAMLANDI"
