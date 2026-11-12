#!/usr/bin/env bash
set -euo pipefail
PROJECT="${GCP_PROJECT:-wedidit-64fae}"
REGION="${GCP_REGION:-europe-west1}"
INSTANCE="${TICARTI_DB_INSTANCE:-commerce-db}"
[ "${TICARTI_MIGRATION_APPROVED:-NO}" = YES ] || { echo 'BLOCKED: migration approval required'; exit 1; }
command -v gcloud >/dev/null || { echo 'BLOCKED: gcloud missing'; exit 1; }
INSTANCE_JSON="$(gcloud sql instances describe "$INSTANCE" --project "$PROJECT" --format=json)"
BACKUPS_JSON="$(gcloud sql backups list --instance "$INSTANCE" --project "$PROJECT" --limit=20 --format=json)"
INSTANCE_JSON="$INSTANCE_JSON" BACKUPS_JSON="$BACKUPS_JSON" python3 -c '
import json,sys,datetime,os
instance=json.loads(os.environ["INSTANCE_JSON"]); backups=json.loads(os.environ["BACKUPS_JSON"])
cfg=instance.get("settings",{}).get("backupConfiguration",{})
if not cfg.get("enabled"):
    sys.exit("BLOCKED: automated backups disabled")
if instance.get("state")!="RUNNABLE":
    sys.exit("BLOCKED: SQL instance not RUNNABLE")
now=datetime.datetime.now(datetime.timezone.utc)
valid=[]
for b in backups:
    if b.get("status")!="SUCCESSFUL": continue
    v=b.get("endTime") or b.get("startTime") or b.get("windowStartTime")
    if not v: continue
    try: dt=datetime.datetime.fromisoformat(v.replace("Z","+00:00"))
    except ValueError: continue
    if datetime.timedelta(0) <= now-dt <= datetime.timedelta(hours=24): valid.append(b)
if not valid: sys.exit("BLOCKED: no successful backup within 24 hours")
print("OK: automated backups enabled; recent successful backup exists")
'
JOB_JSON="$(gcloud run jobs describe commerce-db-init --region "$REGION" --project "$PROJECT" --format=json)"
printf '%s' "$JOB_JSON" | python3 -c '
import json,sys
j=json.load(sys.stdin)
cs=j.get("spec",{}).get("template",{}).get("spec",{}).get("template",{}).get("spec",{}).get("containers",[])
if not cs: sys.exit("BLOCKED: migration job container missing")
c=cs[0]
if c.get("command")!=["./db-init.sh"]: sys.exit("BLOCKED: unexpected migration command")
env={x.get("name"):x.get("value") for x in c.get("env",[])}
if env.get("TEST_DB_SEED")!="false": sys.exit("BLOCKED: TEST_DB_SEED must be false")
if "DATABASE_URL" not in env: sys.exit("BLOCKED: DATABASE_URL unset")
print("OK: migration job command and seed setting checked")
'
