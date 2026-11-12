#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PLUGIN="apps/api/src/installed-modules/payment-stripe"
BACKUP="$(mktemp -d)"
restore(){ if [ -d "$BACKUP/payment-stripe" ] && [ ! -d "$PLUGIN" ]; then mkdir -p "$(dirname "$PLUGIN")"; mv "$BACKUP/payment-stripe" "$PLUGIN"; fi; rm -rf "$BACKUP"; }
trap restore EXIT
[ -d "$PLUGIN" ] || { echo 'FAIL Stripe plugin missing'; exit 1; }
echo 'Checking plugin-installed API build'
npm --workspace @commerce/api run build
mv "$PLUGIN" "$BACKUP/payment-stripe"
echo 'Checking plugin-absent API build (core must compile without Stripe)'
npm --workspace @commerce/api run build
restore
trap - EXIT
echo 'PASS plugin installed and absent builds'
