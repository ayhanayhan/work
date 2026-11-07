#!/usr/bin/env bash
# Compatibility entrypoint. Never redeploy every service implicitly.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -eq 0 ]; then
  echo "A blanket CMS deploy is disabled. Choose changed services:" >&2
  echo "  bash scripts/deploy-changed.sh master" >&2
  echo "  bash scripts/deploy-changed.sh marketing" >&2
  echo "  bash scripts/deploy-changed.sh api master marketing" >&2
  exit 2
fi
exec bash scripts/deploy-changed.sh "$@"
