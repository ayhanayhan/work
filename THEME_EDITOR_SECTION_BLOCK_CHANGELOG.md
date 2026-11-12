# TICARTI Theme Editor — Section/Block controls

Changes (Admin only)
- Template section duplicate action with new section ID and independent IDs for nested blocks.
- Block duplicate action with independent block ID and deep-cloned settings.
- Block move up/down controls, bounded within containing section.
- Global header/footer section behavior and existing save/preview protocol unchanged.
- No API, database, storefront, schema migration, or deployment changes.

Verification:
- TypeScript/TSX syntax transpilation: four updated modules passed.
- Pure-model assertions for independent block duplication, placement and reorder: passed.
- Full Next.js build and live integration test not performed; node_modules absent in supplied ZIP.

Caveat: The current editor's Save sends /activate (publishes); independent draft persistence is NOT implemented in this change.
