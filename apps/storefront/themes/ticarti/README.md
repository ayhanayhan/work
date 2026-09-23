# Ticarti theme

Theme id: `ticarti`
Default display name: `Ticarti`
Original preset retained for comparison: `Demo 1` in source preset files.

The storefront core no longer imports a global Header or Footer. `StorefrontGate` resolves the active theme and renders `themes/ticarti/ThemeShell.tsx`. Head settings, Header, body shell and Footer therefore belong to the theme.

`styles/style-grid.css` is copied from the source theme's `snippets/style-grid.liquid` CSS without changing its flex/grid rules. `config/theme-settings.ts` implements the source head settings as CSS custom properties. Original source files are kept under `source-reference/` for side-by-side review only and are not executed.

If a future store has no supported theme id, `themes/default/ThemeShell.tsx` supplies a deliberately basic fallback.
