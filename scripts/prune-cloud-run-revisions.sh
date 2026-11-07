#!/usr/bin/env bash
# Keep the 10 newest revisions of the standalone Commerce API, irrespective of age.
# Firebase App Hosting managed services are deliberately excluded.
set -euo pipefail
PROJECT="${PROJECT:-wedidit-64fae}"
SERVICE="commerce-api"
REGION="${API_REGION:-europe-west1}"
KEEP="${KEEP_REVISIONS:-10}"
APPLY=0
if [ "${1:-}" = "--apply" ]; then APPLY=1
elif [ -n "${1:-}" ] && [ "${1:-}" != "--dry-run" ]; then
  echo "Usage: bash scripts/prune-cloud-run-revisions.sh [--dry-run|--apply]" >&2; exit 2
fi
if ! [[ "$KEEP" =~ ^[0-9]+$ ]] || [ "$KEEP" -lt 10 ]; then
  echo "KEEP_REVISIONS must be at least 10." >&2; exit 2
fi
echo "=== Cloud Run retention: $SERVICE / newest $KEEP, without any day limit ==="
SERVICE_JSON="$(mktemp)"
REVISIONS_JSON="$(mktemp)"
PLAN="$(mktemp)"
trap 'rm -f "$SERVICE_JSON" "$REVISIONS_JSON" "$PLAN"' EXIT
gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format=json > "$SERVICE_JSON"
gcloud run revisions list --service="$SERVICE" --project="$PROJECT" --region="$REGION" --format=json > "$REVISIONS_JSON"
node - "$SERVICE_JSON" "$REVISIONS_JSON" "$KEEP" > "$PLAN" <<'JS'
const fs=require('node:fs');
const service=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const revisions=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const limit=Number(process.argv[4]);
const status=service.status||{};
// Cloud Run status.traffic can retain many historical zero-percent revisions.
// Protect only actively serving traffic, tagged URLs, and the latest ready/created
// revisions. Do not accidentally protect all historical 0% traffic entries.
const protectedNames=new Set([
  status.latestReadyRevisionName,
  status.latestCreatedRevisionName,
].filter(Boolean));
const isProtectedTraffic=(entry)=>{
  if(!entry?.revisionName)return false;
  // Explicit tags remain reachable even when they receive 0% of the main URL.
  if(typeof entry.tag==='string'&&entry.tag.trim())return true;
  // Explicit positive traffic only; no default assumption for absent percents.
  return typeof entry.percent==='number'&&entry.percent>0;
};
for(const entry of [...(status.traffic||[]),...(service.spec?.traffic||[])])
  if(isProtectedTraffic(entry))protectedNames.add(entry.revisionName);
const rows=revisions.map(r=>({
 name:r.metadata?.name||r.name?.split('/').pop()||'',
 date:r.metadata?.creationTimestamp||r.createTime||r.createdTime||'',
 })).filter(x=>x.name.startsWith('commerce-api-'))
 .sort((a,b)=>b.date.localeCompare(a.date)||b.name.localeCompare(a.name));
const keep=new Set(rows.slice(0,limit).map(x=>x.name));
for(const name of protectedNames)keep.add(name);
if(!rows.length)throw Error('No commerce-api revisions detected; cleanup aborted');
for(const row of rows){
 if(keep.has(row.name))console.error('KEEP',row.name,protectedNames.has(row.name)?'(traffic/latest protected)':'');
 else console.log(row.name);
}
console.error('Total:',rows.length,'Kept:',rows.filter(x=>keep.has(x.name)).length,'Candidates:',rows.filter(x=>!keep.has(x.name)).length);
JS
if [ "$APPLY" -ne 1 ]; then
  echo "Dry run only. To delete the above unprotected revisions: --apply"
  exit 0
fi
if [ ! -s "$PLAN" ]; then echo "No old revisions to delete."; exit 0; fi
echo "=== Removing only obsolete, unprotected API revisions ==="
while IFS= read -r revision; do
  [ -n "$revision" ] || continue
  # Cloud Run rejects deletion of latest or traffic-serving revisions as an additional protection.
  gcloud run revisions delete "$revision" --project="$PROJECT" --region="$REGION" --quiet
done < "$PLAN"
echo "API revision cleanup complete. Docker image cleanup is separate."
