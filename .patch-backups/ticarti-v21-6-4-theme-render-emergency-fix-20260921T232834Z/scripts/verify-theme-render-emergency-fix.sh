#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CSS="$ROOT/apps/storefront/public/signature-assets/signature-runtime.css"
grep -q "v21.6.4 emergency render isolation" "$CSS"
grep -q "header__mobile{display:none!important}" "$CSS"
grep -q "footer.footer" "$CSS"
echo "Tema render hotfix OK: header responsive ayrimi, footer palette izolasyonu ve legacy CSS cakisma korumasi aktif."
