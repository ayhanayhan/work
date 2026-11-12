#!/usr/bin/env bash
set -euo pipefail
PROJECT="${PROJECT:-wedidit-64fae}"
BACKEND="${BACKEND:-commerce-master}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "== Ticarti Master deploy =="
echo "Project: $PROJECT"
echo "Backend: $BACKEND"

if ! command -v firebase >/dev/null 2>&1; then
  echo "Firebase CLI bulunamadı. Önce: npm i -g firebase-tools"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Bağımlılıklar kuruluyor..."
  npm ci
fi

echo "Master build kontrolü..."
npm --workspace @commerce/master run build

echo "App Hosting deploy..."
firebase deploy --only "apphosting:${BACKEND}" --project "$PROJECT"

echo "Deploy tamamlandı. Custom domain: master.ticarti.com"
