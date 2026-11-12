# Ticarti v26.5.0 Core Freeze / Theme Contract

The infrastructure/core baseline is frozen before external theme porting.

## Frozen core surfaces
- tenant resolution and isolation
- cell routing / dedicated DB routing
- auth and permissions
- checkout/payment orchestration
- billing
- background jobs / queues
- migration / provisioning control plane
- storefront boot contract

Themes must not directly depend on those internals.

## Theme boundary
- Contract: `apps/storefront/themes/contracts/theme-contract.ts`
- Public SDK: `apps/storefront/themes/sdk/*`
- Registry: `apps/storefront/themes/registry.ts`
- Existing native theme: `apps/storefront/themes/ticarti`
- External ports: `apps/storefront/themes/imported/<theme-id>`

## External theme integration
External themes are registered under `themes/imported/<theme-id>` through the theme registry. Theme-specific CSS, JavaScript behavior, templates and assets remain isolated from platform/core code. Core routes and APIs are not rewritten merely to match theme markup.

Run `npm run verify:core-freeze` after theme changes.
