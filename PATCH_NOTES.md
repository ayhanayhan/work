# Ticarti v33.1 — safe incremental reliability patch

Based on v33.0.23.2.3 handoff archive. This is **not** a comprehensive rewrite of OAuth, payments, warehousing, theme engines, or tenant isolation.

## Implemented
- DB seed defaults OFF (explicit `TEST_DB_SEED=true` still available).
- Admin invalid CSS media query corrected to 1024px (responsive visual QA still necessary).
- Cache-aware Cloud Build API image config; Docker layer cache is best-effort and depends on registry image availability.
- Opt-in, targeted frontend/API/migration deploy tool with a default non-mutating dry-run; candidate live/ready JSON checks and separate traffic-promotion approval.
- Deprecated legacy deployment script blocks execution.
- Previous public-domains helper is disabled to avoid treating HTTPS response as evidence of edge CDN; replaced with a read-only audit.
- Static regression verifier.

## Not claimed / further work
- OAuth PKCE, sandbox/iframe message protocol, module provenance/signing, credential lifecycle, webhook reconciliation, orphan-media GC, DB HA/backups, Stripe smoke and comprehensive E2E/load tests are **NOT implemented** here. They require dedicated design, secrets/configuration or service integration and cannot safely be bundled as speculative replacements.
- App Hosting targets require actual backend configuration. This patch does not deploy anything.
- Candidate tagged URL must be accessible to the deploy machine. If Cloud Run ingress/auth blocks candidate checks, deployment stops without promotion.
- DB migrations need external backup and a reviewed forward/backward compatibility strategy.
- For production, do not skip P0 checks or use seed env switches without reviewing downstream consequences.

## Usage
Apply: `bash apply.sh ~/Downloads/commerce-saas-wedidit-test-runtimefix`
Verify: `node scripts/verify-fast-deploy.mjs` (inside project root)
Plan: `bash scripts/deploy-fast.sh api` or `bash scripts/deploy-fast.sh frontend admin`
The script does NOT execute without `TICARTI_DEPLOY_EXECUTE=YES` and will not promote without `TICARTI_PROMOTE_APPROVED=YES`.
