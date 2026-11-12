# Ticarti v26.0.8 — Stabilization & Platform Billing

This update is based on `v26.0.7-module-platform-final-v2` and intentionally leaves the Theme Import workflow for the next phase.

## Implemented

- Live tracking no longer joins product, order-item or customer data. Recent orders are bounded and return order number, total, currency, city/country, source and timestamp only; detail remains on the order detail route.
- Admin live tracking, superadmin live orders, AI notifications and storefront visitor heartbeat poll every 60 seconds and pause while the tab is hidden.
- Visitor cleanup was removed from the live read endpoint and moved into the authenticated operations worker.
- Durable event outbox no longer starts processing with `setImmediate` inside the API process. DB outbox remains the durable source; BullMQ/Redis only signals a separate worker process, with the authenticated scheduler endpoint retained as fallback.
- Event delivery completion refresh uses aggregate status counts instead of reloading every delivery row.
- Cloud Run / Cloud SQL Prisma pool is capped per instance through `PRISMA_CONNECTION_LIMIT` (default 5), `PRISMA_POOL_TIMEOUT` and `PRISMA_CONNECT_TIMEOUT`.
- Added scale indexes for order/order-item/webhook access paths.
- Yahoo exchange-rate source removed from merchant currency settings.
- TCMB parser now rejects oversized, unsafe, duplicate and partial feeds. Rate refresh is all-or-nothing; a failed feed records the error but preserves previous rates.
- Forwarded-IP parsing was removed from RateLimitGuard; Express only trusts a bounded proxy hop count when `TRUST_PROXY_HEADERS=true`.
- Merchant+tenant controllers audited for `PermissionGuard`; support, webhooks, integrations and customer-social-auth permission coverage was completed.
- Added generic JSON body safety guard for prototype keys, excessive depth/field/array/string sizes while legacy DTO migration continues.
- Critical billing/AI/integration request paths use DTO/type validation instead of unbounded `any` payloads.
- Added shared Ticarti billing checkout for plans, themes, paid apps/modules, AI credits and email-marketing credits.
- Added billing coupons with global/per-tenant limits, validity dates, min amount, max discount and target restrictions; coupon consumption is transactionally locked.
- Iyzico callbacks validate conversation id, basket id, amount, currency, token and payment id before fulfillment.
- Added global `ProviderPaymentReceipt` to reject cross-product provider payment replay.
- Virtual purchases use billing information only in Ticarti UI. The same billing address is supplied to Iyzico's technical billing/shipping fields for virtual items.
- Payment redirects return to `MERCHANT_ADMIN_URL` (default `https://app.ticarti.com`), not the storefront host.
- Added merchant `Faturalandırma` area and superadmin `Ürünler` area for plans/themes/apps/AI credits/email credits/coupons.
- AI credit purchase no longer relies on external `AI_CREDIT_CHECKOUT_URL`; paid app/module install no longer relies on external marketplace checkout URL.
- Email credit wallets support reservation: concurrent campaigns cannot spend the same purchased credits twice; cancellation/final pre-send failure releases reservations.
- Added bounded reads to high-growth merchant product/customer/page paths and limited customer detail order history.
- Root source backup trees were removed from the release.
- Legacy admin wrapper selector renamed to a single compatibility wrapper.
- Duplicate QuickStoreForm implementation reduced to one source of truth via re-export.
- Added stabilization regression checker plus TCMB/safe-JSON tests.

## New migrations

- `20260928013000_scale_indexes`
- `20260928014500_platform_billing`
- `20260928021500_payment_receipts`

Run Prisma generation and migrations before deployment.

## Suggested deploy sequence

```bash
npm install
npm --workspace @commerce/api run prisma:generate
npm --workspace @commerce/api run prisma:migrate
npm --workspace @commerce/api run build
npm --workspace @commerce/admin run build
npm --workspace @commerce/storefront run build
npm --workspace @commerce/superadmin run build
npm run verify:stabilization
```

Production environment should set at least:

- `DATABASE_URL`
- `PRISMA_CONNECTION_LIMIT` (start at 5 per Cloud Run API instance; tune against Cloud SQL capacity)
- `IYZICO_API_KEY`
- `IYZICO_SECRET_KEY`
- `IYZICO_URI`
- `PUBLIC_API_URL`
- `MERCHANT_ADMIN_URL=https://app.ticarti.com` (or the actual merchant-admin host)
- `TRUST_PROXY_HEADERS=true` only when the API is behind the intended trusted proxy/load balancer; configure `TRUST_PROXY_HOPS` accordingly.
- `REDIS_URL` for BullMQ signaling.
- `BACKGROUND_WORKER_ENABLED=true` on the dedicated worker service, not the API service.
- `BACKGROUND_WORKER_CONCURRENCY` (start around 10 and tune from queue/DB metrics).

## Verification performed in this workspace

- `node scripts/stabilization-check.mjs` → OK
- TypeScript transpile/syntax pass over changed TS/TSX files → 69 checked, 0 syntax failures
- Prisma structural sanity pass → 188 models, no duplicate model names / brace mismatch

A full Nest/Next build could not be executed in this environment because the provided/partial `node_modules` does not contain the `nest` binary and registry access failed while trying to restore dependencies. Run the deploy sequence above in the normal project environment before production release.

## Intentionally deferred

- Theme Import redesign/changes (requested for the next phase).
- Long-term tenant-cell / placement architecture for ~40,000 tenants and dedicated high-volume tenant isolation; this is the next scalability phase after this stabilization patch.
- Full project-wide removal of every historical TypeScript `any` is not represented as complete here. Critical security/payment/integration paths were tightened and request bodies now have a global safety layer; remaining legacy domain typing should be migrated incrementally with domain DTOs rather than mass-casting values and pretending they are typed.
