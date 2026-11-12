# Checkout / Load-Test Status

Date: 2026-10-08

## Accepted baseline — PASS
Version: v33.0.16

- Total: 5,000
- Succeeded: 5,000
- Failed: 0
- Duration: 72.25 s
- Throughput: 69.2 RPS
- p50: 2,512.8 ms
- p95: 5,593.0 ms
- p99: 7,744.6 ms
- Max: 14,753.1 ms

Acceptance:
- 5,000 / 5,000: PASS
- 0 failed: PASS
- RPS >= 60: PASS
- p95 <= 6 s: PASS
- p99 <= 9 s: PASS

## Progression

| Stage | Success | RPS | p95 | p99 |
|---|---:|---:|---:|---:|
| Initial 5,000 | 5,000/5,000 | 37.7 | 9.62 s | 10.43 s |
| 6 instances | 4,978/5,000 | 61.4 | 7.47 s | 10.08 s |
| 5 instances + tuning | 4,989/5,000 | 66.4 | 5.54 s | 8.98 s |
| v33.0.16 | 5,000/5,000 | 69.2 | 5.59 s | 7.74 s |

## Mixed multi-SKU / multi-warehouse
Status: NOT COMPLETED / NOT FAILED.

Fixture creation succeeded:
- 20 fresh variants
- warehouse A: main
- warehouse B: LOADTEST-B

The run stopped during cart preparation with HTTP 429 before the 5,000 checkout phase.
This is therefore a test-harness/rate-limit interruption, not a checkout capacity failure.

Decision:
- Do not spend more load-test budget now.
- Preserve the scenario as planned performance work.
- Revisit after Product completion or before onboarding a high-volume merchant.

## Planned tests
P1 before high-volume guarantees:
- mixed 1-5 SKU carts
- 10-20 variants
- 2+ warehouses
- split fulfillment
- zero oversell
- 5,000/C200 mixed checkout

P2:
- 30-60 minute soak
- Redis restart/unavailability
- PostgreSQL restart/connection pressure
- webhook burst
- payment callback burst
- concurrent admin + checkout
- concurrent order/fulfillment/refund traffic
