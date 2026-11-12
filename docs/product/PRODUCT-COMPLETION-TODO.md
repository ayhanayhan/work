# Product Module — Completion TODO

Date: 2026-10-08
Goal: finish Product so controlled merchant/customer migration can begin.

## P0 — Must close before migration
- [ ] Product save/edit flow fully functional; no disabled-save regression
- [ ] Product types stable:
  - [ ] Simple
  - [ ] Variant
  - [ ] Set/Bundle
  - [ ] Digital
- [ ] Type-specific fields only where relevant
- [ ] Digital products do not require shipping fields
- [ ] Bundle inventory policy explicit:
  - [ ] own bundle stock
  - [ ] deduct component stock
- [ ] SKU, barcode, model persist correctly
- [ ] Unified media picker:
  - [ ] dropzone opens media library
  - [ ] click opens media library
  - [ ] upload opens native file picker
  - [ ] same behavior for logo/icon/other pickers
- [ ] Variant creation uses definitions only:
  - [ ] select variant name
  - [ ] choose/autocomplete allowed values
  - [ ] no arbitrary free-text definition
- [ ] Variant expand/collapse works
- [ ] Inventory tracking works
- [ ] Warehouse stock respects permissions
- [ ] Product stock cannot silently diverge from WarehouseStock
- [ ] Category tree works for large catalogs
- [ ] Collections are scrollable/searchable and multilingual
- [ ] VAT/tax comes from Settings > Taxes
- [ ] Compare-at/pre-discount wording and behavior clear
- [ ] Product translations persist
- [ ] SEO fields persist per language
- [ ] Images/variants survive edit-save-reload
- [ ] Delete/archive is safe for historical orders

## P1 — Strongly recommended
- [ ] Bulk import/export
- [ ] CSV mapping + validation report
- [ ] Duplicate SKU/barcode handling
- [ ] Bulk price update
- [ ] Bulk stock update
- [ ] Bulk category/collection assignment
- [ ] Product duplication
- [ ] Draft / Active / Archived workflow
- [ ] Scheduled publish/unpublish
- [ ] Inventory ledger visible from product
- [ ] Warehouse available/reserved/committed breakdown
- [ ] Low-stock threshold and alert
- [ ] SEO preview
- [ ] URL handle editing + redirect creation
- [ ] Product structured data verification
- [ ] Search/filter by SKU, barcode, model, title
- [ ] Saved product views/filters
- [ ] Large-catalog pagination

## UX
- [ ] Preserve completed Product Edit layout/spacing/sidebar/modal behavior
- [ ] Minimal steps for common product creation
- [ ] Advanced controls remain available without cluttering the basic flow
- [ ] Clear inline validation
- [ ] Unsaved changes warning
- [ ] Explicit saving/loading states
- [ ] Actionable error messages
- [ ] No accidental outside-click modal close where data may be lost

## Migration readiness
- [ ] Product/variant/image/category/collection/inventory/SEO/translation mapping
- [ ] Dry-run import report
- [ ] Idempotent import rerun
- [ ] Safe retry/rollback strategy
- [ ] Missing image report + retry
- [ ] Source -> Ticarti ID mapping export
- [ ] Merchant sign-off checklist

## Product acceptance test
1. Create simple product
2. Add media
3. Set category/collection
4. Configure tax/price
5. Enable inventory tracking
6. Assign warehouse stock
7. Add translations
8. Configure SEO
9. Save
10. Reload and verify persistence
11. Create variant product and verify definitions
12. Create digital product and confirm no shipping requirement
13. Create bundle/set and verify inventory policy
14. Place test order and verify stock/order linkage
15. Refund/return and verify inventory ledger behavior

Only after this passes should Product be marked COMPLETE.
