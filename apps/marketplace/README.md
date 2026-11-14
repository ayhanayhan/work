# Ticarti Marketplace (native)

This is an independent Next.js 15 App Router application. No middleware, redirects, rewrites, or basePath.

- Host: apps.ticarti.com
- Firebase App Hosting backend: commerce-marketplace
- Workspace: @commerce/marketplace
- API: server-side GET `API_ORIGIN/v1/platform/apps`

To develop, from repo root run `npm install` then `npm --workspace @commerce/marketplace run dev`.

The Firebase backend and Cloudflare DNS record are **not** created by merging this branch. Create the backend only after the build passes, then attach the custom domain in Firebase.

Do not attach apps.ticarti.com to commerce-storefront; it belongs to commerce-marketplace.
