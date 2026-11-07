# Ticarti homepage — design-locked Next.js snapshot

The existing homepage was translated to **native React JSX**, without changing
its page structure, text, class names, graphics or section sequence.

- `index.tsx` preserves the original page and wrapper hierarchy.
- `header.tsx` and `footer.tsx` preserve the original shared design.
- `hero.tsx`, `animated.tsx`, `builder.tsx`, `radar.tsx`,
  `channels.tsx`, `showcase.tsx`, `references.tsx`, `bottomCta.tsx`,
  `blog.tsx`, and `faq.tsx` are separate React section components.
- Styling continues to use `public/assets/css/style.css`, **without** the
  invented `home-native.css` redesign.
- The Marketing homepage route renders these React components directly.
  It does not load a template file, query Master/API, interpolate HTML, or use
  `dangerouslySetInnerHTML` for the homepage.
- `website-home-cms.js` has been removed. Old generated demo-order and
  simulated radar-photo scripts are not executed. Existing purely visual and
  interactive scripts are kept temporarily to avoid losing established
  functionality before a behavior-for-behavior React port.
- The snapshot intentionally retains the text and images already present in
  the supplied HTML. It is **not live database content**. Connecting a section
  to Master requires a separate explicit task and should update only that
  component, without changing the layout or other sections.

**Release gate:** Run `npm --workspace @commerce/marketing run test:home`
and `npm --workspace @commerce/marketing run build`; compare the preview
visually and interactively against the live design before deploying.

**Do not** restore client-side DOM text replacement, add stock placeholder
images, or change the existing design during later CMS wiring.
