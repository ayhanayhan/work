#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' 'BLOCKED: a responding hostname does not establish an independent edge CDN.' 'Verify DNS, TLS, hosting backend and caching behavior before configuring CDN env.' 'Run scripts/audit-public-domains.sh for a read-only HTTPS check.'
exit 2
