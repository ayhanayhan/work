# Ticarti Checkout Load Test Benchmark

## Baseline

Version: v33.0.16
Date: 2026-10-08

## Test configuration

- Total checkouts: 5,000
- Client concurrency: 200
- Cloud Run instances: 5 fixed
- Cloud Run concurrency: 120
- Stock batch window: 35 ms
- Stock batch max: 128
- Stock admission: redis-atomic
- Stock transaction retry attempts: 3
- Stock transaction retry base: 35 ms
- Environment: isolated load-test
- Production traffic: not used

## Final result

| Metric | Result |
|---|---:|
| Total | 5,000 |
| Succeeded | 5,000 |
| Failed | 0 |
| Success rate | 100% |
| Duration | 72.25 s |
| Throughput | 69.2 RPS |
| p50 | 2,512.8 ms |
| p95 | 5,593.0 ms |
| p99 | 7,744.6 ms |
| Max | 14,753.1 ms |
| Top errors | None |

## Acceptance

- 5,000 / 5,000: PASS
- 0 failed: PASS
- RPS >= 60: PASS
- p95 <= 6 s: PASS
- p99 <= 9 s: PASS

## Performance progression

| Stage | Success | RPS | p95 | p99 |
|---|---:|---:|---:|---:|
| Initial 5,000 | 5,000 / 5,000 | 37.7 | 9.62 s | 10.43 s |
| 6 instances | 4,978 / 5,000 | 61.4 | 7.47 s | 10.08 s |
| 5 instances + tuning | 4,989 / 5,000 | 66.4 | 5.54 s | 8.98 s |
| v33.0.16 | 5,000 / 5,000 | 69.2 | 5.59 s | 7.74 s |

## Status

Single-SKU 5,000 checkout / C200 benchmark passed.

This does not yet constitute the final production capacity certification.

Remaining performance validation:
- multi-SKU carts
- mixed-cart checkout
- multi-warehouse allocation
- split fulfillment
- oversell verification
- Redis failure/recovery
- PostgreSQL failure/recovery
- longer soak test
