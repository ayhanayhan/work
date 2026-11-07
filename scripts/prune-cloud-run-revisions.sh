#!/usr/bin/env bash
# Retain the newest 10 standalone commerce-api revisions (no age cutoff).
# Never delete traffic-serving or latest revisions. Tagged old revisions require
# explicit --prune-tags because their public tag URLs may still be in use.
set -euo pipefail
PROJECT="${PROJECT:-wedidit-64fae}"
SERVICE="commerce-api"
REGION="${API_REGION:-europe-west1}"
KEEP="${KEEP_REVISIONS:-10}"
APPLY=0
PRUNE_TAGS=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --dry-run) ;;
    --prune-tags) PRUNE_TAGS=1 ;;
    *) echo "Usage: bash scripts/prune-cloud-run-revisions.sh [--dry-run|--apply] [--prune-tags]" >&2; exit 2 ;;
  esac
done
if ! [[ "$KEEP" =~ ^[0-9]+$ ]] || [ "$KEEP" -lt 10 ]; then
  echo "KEEP_REVISIONS must be at least 10." >&2; exit 2
fi

SERVICE_JSON="$(mktemp)"
REVISIONS_JSON="$(mktemp)"
PLAN_JSON="$(mktemp)"
trap 'rm -f "$SERVICE_JSON" "$REVISIONS_JSON" "$PLAN_JSON"' EXIT

echo "=== Cloud Run: $SERVICE, newest $KEEP revisions, no day-based cutoff ==="
gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format=json > "$SERVICE_JSON"
gcloud run revisions list --service="$SERVICE" --project="$PROJECT" --region="$REGION" --format=json > "$REVISIONS_JSON"

node - "$SERVICE_JSON" "$REVISIONS_JSON" "$KEEP" "$PRUNE_TAGS" > "$PLAN_JSON" <<'JS'
const fs=require('node:fs');
const service=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const revisions=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const keepCount=Number(process.argv[4]);
const pruneTags=process.argv[5]==='1';
const status=service.status||{};
const rows=revisions.map(r=>({
  name:r.metadata?.name||r.name?.split('/').pop()||'',
  date:r.metadata?.creationTimestamp||r.createTime||r.createdTime||''
})).filter(r=>r.name.startsWith('commerce-api-'))
  .sort((a,b)=>b.date.localeCompare(a.date)||b.name.localeCompare(a.name));
if(!rows.length)throw Error('No API revisions returned: refusing cleanup');
const recent=new Set(rows.slice(0,keepCount).map(r=>r.name));
const protectedNames=new Set([
  status.latestReadyRevisionName,status.latestCreatedRevisionName
].filter(Boolean));
const tags=new Map();
for(const entry of [...(service.spec?.traffic||[]),...(status.traffic||[])]){
  if(!entry?.revisionName)continue;
  const name=entry.revisionName;
  // Never delete even 1%-serving revisions; zero-percent tags are NOT serving
  // the main URL, but they can be accessed via separate tag URLs.
  if(Number(entry.percent||0)>0)protectedNames.add(name);
  if(entry.tag){
    const set=tags.get(name)||new Set();
    set.add(String(entry.tag));tags.set(name,set);
  }
}
const deleteItems=[],skipItems=[];
for(const row of rows){
  const attached=[...(tags.get(row.name)||[])];
  const reason=protectedNames.has(row.name)?'live-or-latest':
    recent.has(row.name)?'newest-10':
    attached.length&&!pruneTags?'tagged-url':'';
  if(reason){skipItems.push({...row,reason,tags:attached});console.error('KEEP',row.name,reason,attached.join(','));}
  else {
    deleteItems.push({...row,tags:attached});
    console.error('DELETE',row.name,attached.length?'tags='+attached.join(','):'');
  }
}
console.error('Total:',rows.length,'Keep:',skipItems.length,'Delete:',deleteItems.length,
  'Tagged old revisions protected:',skipItems.filter(x=>x.reason==='tagged-url').length);
if(!pruneTags&&skipItems.some(x=>x.reason==='tagged-url'))
  console.error('To remove old tagged revisions too, first review tag URLs and rerun with --prune-tags. Their tag URLs will stop working.');
process.stdout.write(JSON.stringify({deleteItems,skipItems},null,2));
JS

if [ "$APPLY" -ne 1 ]; then
  echo "Dry run. No Cloud Run resources were changed."
  exit 0
fi

node - "$PLAN_JSON" <<'JS'
const plan=require(process.argv[2]);
console.log('Deletion candidates:',plan.deleteItems.length,'Remaining:',plan.skipItems.length);
JS

# Use the current plan and let Cloud Run reject any revision which becomes
# traffic-serving in the meantime (no --clear-tags, --to-latest or traffic edits).
node - "$PLAN_JSON" <<'JS' | while IFS= read -r revision; do
const plan=require(process.argv[2]);
for(const row of plan.deleteItems)console.log(row.name);
JS
  [ -n "$revision" ] || continue
  echo "Deleting old revision: $revision"
  gcloud run revisions delete "$revision" --project="$PROJECT" --region="$REGION" --quiet
done

echo "Done. Container images in Artifact Registry are managed separately."
