#!/usr/bin/env bash
set -euo pipefail
for host in dev.ticarti.com help.ticarti.com cdn.ticarti.com; do
  echo "Checking HTTPS: ${host}"
  curl -fsSI --max-time 15 "https://${host}/" >/dev/null || { echo "UNVERIFIED ${host}"; continue; }
  echo "HTTPS reachable: ${host} (does not prove App Hosting mapping or edge CDN)"
done
echo 'Read-only verification. No GCP environment variables were changed.'
