# TICARTI v33.1 combined patch — implementation and boundaries

Base: source ZIP v33.0.23.2.3. Contains previous Fast Deploy patch plus security changes below.

## Implemented in files
- Diff-selected Fast Deploy CLI and cached Cloud Build configuration from earlier patch, gated promotion and health checks.
- Production DB-init seed safe default and CSS media query fix from earlier patch.
- OAuth Authorization Code + mandatory S256 PKCE on newly issued authorizations and token exchange. Nullable DB column added for safe additive schema migration; legacy unredeemed codes will be refused after deployment (five-minute lifespan).
- Third-party Admin and Storefront iframe sandbox no longer grants allow-same-origin alongside allow-scripts. Warning: third-party apps relying on same-origin/cookie behavior must be tested before release.
- Extension endpoint URL rejects credential-bearing and fragment-bearing URLs.
- Added fail-fast regression assertions and hooked them into API Fast Deploy.

## NOT implemented/verified
- Production backup / HA / Cloud SQL upgrades: require live infrastructure access and operator approval.
- Module signing/provenance and webhook manifest lifecycle complete implementation: requires trusted keys, backward-compatibility rollout and runtime integration testing.
- Tenant-level queue and pool isolation, performance optimization, true edge CDN and multiwarehouse mixed-load behavior: require staging, profiling and load-test evidence.
- Stripe live payment/refund/webhook smoke: requires non-production test account and test data; no production calls made.
- Product, marketing, SEO UX redesign: not performed to preserve approved screen layouts pending functional acceptance criteria.
- Full TypeScript builds and live deployment: not claimed. Existing commerce tests are available but not run here without node_modules/database.

## Migration and rollout
1. Apply patch on exactly matching v33.0.23.2.3 full source and review diffs.
2. Run `node scripts/verify-v33-1-security.mjs`, `node scripts/verify-v33-1-commerce.mjs`, `npm run verify:p0`, and API/admin/storefront builds in development/staging.
3. Run integration tests of OAuth PKCE, iframe third-party login and payment flows.
4. Verify Cloud SQL backup/restore and compatible migration; deploy with api-migrate workflow using an approved operator, candidate health checks and controlled traffic shift.
5. No `db push` or `--accept-data-loss` in production.

## OAuth client migration
Authorization requests now require `code_challenge` and `code_challenge_method=S256` (or camelCase equivalents). Token requests require matching `code_verifier` with RFC7636 length/charset. Existing third-party clients must update before API promotion. This is a breaking integration behavior and should use staged migration/testing.
