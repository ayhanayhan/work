# Ticarti Marketing – shared layout and CMS ownership

## One shared site shell

`components/site-shell.tsx` is the only page-layout entry point for marketing pages.
It renders `home-snapshot/header.tsx` and `home-snapshot/footer.tsx` **once** around each page.
The homepage, blog list, single article, and ordinary inner pages all use this shell.
Login/register are intentionally standalone. A component must never embed a second header/footer.

`public/assets/css/shared-footer.css` provides the homepage footer styles for other
page classes without maintaining a different footer design. If the footer changes,
change the shared component and the shared stylesheet, not the individual pages.

## Module migration rules

Each homepage module has a stable component with the original, locked JSX appearance.
The module’s `configured` field decides who owns its content:

* **Not configured in Master:** preserve the existing original section and copy for modules still being migrated.
  **Exception:** FAQ is fully CMS-controlled; it stays hidden until saved questions exist.
* **Configured in Master:** render only explicitly saved CMS values for the current
  language through the matching `*-cms.tsx` renderer.
* **Configured, no content for selected language:** render nothing. Do not inject
  Turkish text, demo records, or runtime placeholder data.
* **Disabled:** render nothing, regardless of old static content.

This is a gradual migration bridge. As a module gains full CMS controls, migrate its
remaining visual structure into a single shared view component; do **not** solve
a data problem by deleting the original section layout.

## No post-render content replacement

Marketing CMS data is read server-side in `app/[[...slug]]/page.tsx`.
Section content is passed to React components as props. Avoid client-side scripts that
replace text, inject HTML, duplicate layout, or invent demo records.
Existing original design assets are not a substitute for connected CMS content.

## Before deployment

```bash
npm --workspace @commerce/marketing run test:home
npm --workspace @commerce/marketing run build
```

The homepage test covers the distinction between original, not-yet-configured modules
and configured modules with missing locale values, as well as the shared layout.
