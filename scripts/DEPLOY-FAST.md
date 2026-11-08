# Ticarti faster API deployments

The deployment entry point remains `bash scripts/deploy-changed.sh api` (or `api master`).

## What changed

* `apps/api/cloudbuild.cached.yaml` pulls the last successful API build's
  `commerce-api:buildcache` image and uses its Docker layers as a build cache.
* `apps/api/.gcloudignore` excludes local generated files from uploads.
* `scripts/deploy-changed.sh` passes both the immutable revision tag and
  the mutable cache tag to Cloud Build.
* API revision pruning no longer runs after every successful deploy. Run
  `bash scripts/prune-cloud-run-revisions.sh --apply` separately, or set
  `PRUNE_API_REVISIONS=1` for a particular deployment.

## Commands

```bash
git pull --ff-only
bash scripts/deploy-changed.sh api
bash scripts/deploy-changed.sh master
bash scripts/deploy-changed.sh api master

# Optional, infrequent cleanup:
bash scripts/prune-cloud-run-revisions.sh --apply
```

The first cached build needs to create its remote cache. Subsequent builds
with unchanged `package.json`, `prisma/`, and image setup can reuse those
layers. Changes to those files invalidate relevant layers, as intended.

Do not skip API unit tests, compiled-module smoke tests, Cloud Run readiness,
health endpoint checks, or automatic rollback to improve speed.

## Failure handling

If the API image build fails, traffic does not change. If health checks fail
after switching traffic, the script restores the previous 100% revision.

## Measure before claiming speed gains

Compare the `npm install` step duration and Cloud Build duration across two
consecutive deployments with the same dependencies. Cache hits are visible
as `Using cache` or `CACHED` in the Docker build output.

Other Firebase App Hosting builds are still managed by Firebase; this change
primarily optimizes the Cloud Run API image. 
