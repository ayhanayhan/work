#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="${GCP_PROJECT:-wedidit-64fae}"

if [ ! -f firebase.json ] || [ ! -f apps/storefront/package.json ]; then
  echo "HATA: Gecerli Ticarti proje klasoru bulunamadi: $ROOT"
  exit 1
fi

for APP in admin storefront superadmin developer help; do
  node -e "require('fs').rmSync('apps/$APP/.next',{recursive:true,force:true})"
done

echo "1/5 Storefront App Hosting deploy"
firebase deploy --only apphosting:commerce-storefront --project "$PROJECT"

echo "2/5 Admin App Hosting deploy"
firebase deploy --only apphosting:commerce-admin --project "$PROJECT"

echo "3/5 Superadmin App Hosting deploy"
firebase deploy --only apphosting:commerce-superadmin --project "$PROJECT"

echo "4/5 Developer App Hosting deploy"
firebase deploy --only apphosting:commerce-developer --project "$PROJECT"

echo "5/5 Help App Hosting deploy"
firebase deploy --only apphosting:commerce-help --project "$PROJECT"

echo "APP HOSTING DEPLOY TAMAMLANDI"
