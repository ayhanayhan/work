# Ticarti plan comparison & platform catalog — review package

## Source baseline
`ticarti-current-source-20261022-1129.zip` + `ticarti-billing-localization-review-v1.zip` overlay.

## Scope
- Merchant Admin plan page: feature comparison table, monthly/yearly switch, active-plan emphasis, real API plan data and checkout integration retained.
- Super Admin plan editor: custom comparison feature key/value entries, existing boolean feature checkboxes preserved and corrected to default unchecked.
- Super Admin platform settings: active switches, default rows cannot be disabled/deleted in UI; selecting a default activates it.
- API: requires active default locale/currency, rejects duplicate catalog codes, blocks deletion of locale/currency currently used as a tenant's primary value.

## Important limitations / pre-deploy checks
- This is a **review build**, not verified against the currently running Cloud Run image. Do not deploy the API without checking source parity with live revision.
- No full `next build`, Nest build, DB integration tests or authenticated end-to-end tests were run (dependencies unavailable in this environment). TypeScript transpilation syntax checks passed.
- Tenant primary locale/currency is checked for deletion; references in nested regional settings, price lists, orders, and historic documents are NOT exhaustively checked. Before allowing deletion in production, extend reference checks or use soft deletion.
- Plan feature labels are currently JSON keys; Super Admin can edit these. Stable feature IDs, translations and feature entitlement enforcement are NOT implemented.
- No database migration is included.

## Suggested local verification (macOS zsh)
From the verified full source checkout, unzip the package into the root and run:

```bash
npm --workspace @commerce/admin run build
npm --workspace @commerce/superadmin run build
npm --workspace @commerce/api run build
```

Do not deploy until builds and integration tests pass. Targeted deploy only the affected API, Admin and Super Admin services, after checking source parity with the live image.
