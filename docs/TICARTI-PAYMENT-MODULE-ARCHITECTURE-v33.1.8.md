# Ticarti v33.1.8 — Payment providers must be external modules

## Decision
Stripe is NOT core. Payment gateways must be independently installable and removable provider ZIPs. Core owns only provider-independent payment lifecycle and data integrity.

## Core responsibilities
- Create payment/refund intents and immutable attempts; enforce tenant isolation.
- Reserve refund balances transactionally before external requests; idempotency for capture, refund, cancel and webhook deduplication.
- Generic PaymentProvider adapter registry with capabilities; module registration, activation, credentials and tenant scoping.
- Core webhook envelope: verify route ownership, pass raw payload to adapter signature verifier, dedupe event, apply normalized event transactionally.
- Reconciliation scheduler and UNKNOWN/PENDING holds, with provider-specific polling via adapter.
- Stable order and stock transitions in core; no vendor-named DB enum/status fields.

## External provider responsibilities
- Stripe API client, Stripe signing checks, PaymentIntent/refund status normalization, Stripe admin configuration and UI assets, Stripe-specific webhooks and capture/cancel/refund/reconcile.
- Provider module metadata, supported operations, permissions, events, lifecycle and version compatibility.

## Proposed interface (design, NOT runtime code)
- `createPayment(context, intent, idempotencyKey)`
- `getPayment(context, providerReference)`
- `capturePayment(context, payment, amount, idempotencyKey)`
- `cancelPayment(context, payment, idempotencyKey)`
- `createRefund(context, refundIntent, idempotencyKey)`
- `getRefund(context, providerRefundReference)`
- `verifyAndNormalizeWebhook(context, rawBody, headers)`
- capabilities include `authorize`, `capture`, `partialRefund`, `webhook`, `reconcile`.

## Migration order
1. Freeze Stripe-specific additions to core; retain existing core Stripe implementation until replacement proven; no premature removal.
2. Create generic provider contract, registry, core refund reconciliation and no-network test adapter.
3. Implement Stripe as externally installable module matching actual Ticarti installer/manifest spec, not a mock ZIP.
4. Migrate Stripe routes & credentials/UI to module, retaining an explicit short-lived compatibility shim.
5. Run parallel contract, negative authorization, replay/idempotency, real Postgres concurrency and provider sandbox tests.
6. Remove remaining Stripe HTTP/SDK references from core only after replacement is proven, with rollback strategy.

## Release blockers
- Stripe HTTP calls, signature verifier, endpoints and connection secrets still found in core service/controller.
- Provider-specific `UNKNOWN` refund has no full reconciliation protocol.
- Module upload/install/activation/disable/uninstall path has not been verified here.
- No real PostgreSQL concurrent refund/checkout/inventory test for v33.1.6/1.7.

DO NOT DEPLOY TO PRODUCTION based on this planning package. This ZIP is NOT an installable provider module.
