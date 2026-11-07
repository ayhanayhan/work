# Ticarti homepage — design-locked Next.js snapshot

The existing homepage was translated to **native React JSX**, without changing
its page structure, text, class names, graphics or section sequence.

- `index.tsx` preserves the original page and wrapper hierarchy.
- `header.tsx` and `footer.tsx` preserve the original shared design.
- `hero.tsx`, `animated.tsx`, `builder.tsx`, `radar.tsx`,
  `channels.tsx`, `showcase.tsx`, `references.tsx`, `bottomCta.tsx`,
  `blog.tsx`, and `faq.tsx` are separate React section components.
- Styling continues to use the byte-for-byte design-locked `public/assets/css/style.css`.
  The small `home-react-effects.css` file only reproduces three existing
  behaviors (desktop hero clones, sample-order entry and radar sweep), not a
  redesign.
- The Marketing homepage route renders these React components directly.
  The four selected CMS sections (hero/references/FAQ/blog) now receive
  server props loaded through `getHomeContent()` and `getBlogPosts()`; there
  is no browser-side CMS request or HTML patching. The other sections retain
  their original fixed JSX content.
- `website-home-cms.js` was removed. The homepage **does not load old
  JavaScript files**. `interactions.tsx` owns carousel, FAQ, header, topbar,
  reveal, rotating heading, touch swipe and video behavior via React lifecycle
  and React events. `hero-cards.tsx` renders the original slider repeat sets
  as JSX rather than cloning DOM elements.
- `orders-preview.tsx` renders the original four visible order examples and
  the existing rotating example orders from a fixed typed array, managed by
  React state. `radar-display.tsx` renders the original nine radar targets
  from fixed typed data and updates their visual position/image through React
  state; no `document.createElement`, DOM cloning or external data feed.
- The hero and footer callback forms are controlled React components
  (`hero-callback.tsx`, `bottomCta-callback.tsx`) with shared
  `phone-validators.ts`; they do not pretend to send data to a backend.
  The hero form reads its localized labels, errors, toggle and mapped
  KVKK legal link from Master, opening the document in a new tab.
- Mobile drawer and mega menus are ordinary JSX. No DOM-injected HTML, legacy
  script loader or mock order feed runs on the homepage.
- Unconfigured sections keep the original HTML text and images as **server JSX
  fallback**, not fake CMS data. Saving one section does not silently replace
  other sections' content.
- Hero reference cards, press references and the existing hero logo row use
  typed repeatable records, with store binding intentionally disabled.
- FAQ questions/answers and FAQPage schema share the same localized records.
- Blog card data comes from published website blog posts, optionally filtered
  using selected category IDs; "Tüm yazılar" links to the blog index.
- New fields are persisted through the existing WebsiteService module API into
  Prisma platformSetting JSON, without a schema migration or seeded content.

**Release gate:** Run `npm --workspace @commerce/marketing run test:home`
and `npm --workspace @commerce/marketing run build`; compare the preview
visually and interactively against the live design before deploying.

**Do not** restore client-side DOM text replacement, add stock placeholder
images, or change the existing design during later CMS wiring.

**Current milestone:** CMS wiring is limited to hero, references, FAQ, blog and the hero logo list. Other sections are still fixed React JSX. Deploy API, Master and Marketing only after all three builds/tests pass. No store association is enabled.
