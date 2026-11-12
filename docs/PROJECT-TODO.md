# Ticarti — Project Status / TODO

Date: 2026-10-08

## Decision
The checkout/load-test phase is accepted as a current engineering baseline.
Do not continue repetitive tuning before product/customer migration work.

- Single-SKU checkout baseline: ACCEPTED
- 5,000 checkout / C200: ACCEPTED for current stage
- Mixed multi-SKU / multi-warehouse: PLANNED, not blocking controlled migration
- Production HA / backup / resilience hardening: REQUIRED before high-volume guarantees
- Product module completion: NEXT PRIORITY

## Accepted checkout baseline
v33.0.16 final result:
- 5,000 total
- 5,000 succeeded
- 0 failed
- 69.2 RPS
- p50 2,512.8 ms
- p95 5,593.0 ms
- p99 7,744.6 ms
- max 14,753.1 ms

## Remaining validation
See `docs/loadtest/STATUS.md`.

## Product completion
See `docs/product/PRODUCT-COMPLETION-TODO.md`.

## Before broad customer migration
Required:
- Product completion checklist closed
- Product/customer/order migration dry-run
- Storefront smoke tests
- Checkout smoke test
- Order -> fulfillment -> refund/return smoke test
- Production DB backups enabled
- Production DB capacity reviewed/upgraded
- Monitoring/alerts enabled for checkout/API/DB

Not blocking first controlled pilot:
- 5,000 mixed-SKU multi-warehouse benchmark
- Long soak test
- Redis failure/recovery benchmark
- PostgreSQL failure/recovery benchmark
- Multi-region DR exercise

## Release posture
1. Internal/demo store
2. First pilot merchants with moderate traffic
3. Observe 1-2 weeks
4. Close operational gaps
5. Increase migration volume
