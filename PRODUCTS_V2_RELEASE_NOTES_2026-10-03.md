# Ticarti Products V2 — 2026-10-03

- Product text/SEO fields are locale-tabbed and persisted through ContentTranslation.
- Variant options now come only from reusable OptionPreset definitions; no comma/manual value entry in product editor.
- OptionPreset editor supports locale tabs, one-by-one values, display mode (button/color/select), and color swatches.
- Variant rows expose Model using existing Variant.mpn alongside SKU and barcode.
- Collections and category selectors are compact scroll areas.
- Tax category is loaded from Settings/Taxes source (`TaxCategory`); VAT-inclusive/exclusive prices calculate bidirectionally.
- Removed compare/old-price field from product editor.
- Added customer-group/date-ranged discounted price editor persisted in product metadata pricing.discountPrices.
- Product images can be assigned to values of a selected variant option; API persists mapping through VariantMedia.
- Product list now has variant accordion rows.
- Existing product option matrices are matched back to reusable presets by name for backward compatibility.
- No Prisma schema change in this release.
