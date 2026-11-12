# Ticarti v26.4.0 — GCP Cell Provisioning Orchestration

- Capacity planner creates managed cells as `DRAINING`, not `ACTIVE`.
- `POST /v1/superadmin/infrastructure/cells/:code/provision/preview` is always safe/dry-run.
- Real apply requires both `GCP_CELL_PROVISIONING_ENABLED=true` and `{ "apply": true, "confirm": "PROVISION_CELL" }`.
- Reconciliation creates/checks Cloud SQL PostgreSQL, `commerce` database/user, Secret Manager DB URL, Memorystore Redis, Secret Manager Redis URL, a cell API Cloud Run service, and a cell worker Cloud Run service.
- The control API service is patched with the cell-specific DB/Redis secret refs and Cloud SQL mount so tenant migration can reach the target database.
- Cell API inherits the control API image/runtime settings, overrides DATABASE_URL/REDIS_URL and enforces its own cell.
- Worker runs `dist/worker.js`; worker.ts now exposes a minimal `/health` listener for Cloud Run service readiness.
- Provisioning state is persisted under `InfrastructureCell.metadata.provisioning` and can be resumed by the operations worker.
- A cell becomes `ACTIVE` only after API/worker readiness and API `/health` succeeds.
- The cell API copies the control API invoker IAM policy because current proxy routing uses HTTP forwarding without a separate OIDC exchange.

## Required IAM/API prerequisites
The runtime service account needs permissions for Cloud SQL Admin, Memorystore Admin, Cloud Run Admin, Secret Manager Admin/version access, and Service Account User for the runtime service account. Required Google APIs must already be enabled.

## Safety
Provisioning is disabled by default. `GCP_CELL_PROVISIONING_ENABLED` must be explicitly enabled in production. Capacity planning alone never creates paid GCP resources.
