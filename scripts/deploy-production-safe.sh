#!/usr/bin/env bash
set -euo pipefail
echo 'BLOCKED: deprecated deployment script has unsafe promotion semantics.'
echo 'Use scripts/deploy-fast.sh api or scripts/deploy-fast.sh api-migrate with explicit approvals.'
exit 2
