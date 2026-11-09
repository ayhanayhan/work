# Ticarti Developer

Standalone Next.js 15 application for the Ticarti developer portal.

## Local
`npm install` at the monorepo root, then `npm --workspace @commerce/developer run build`.

## Firebase
Backend: `commerce-developer` (project `wedidit-64fae`).
Create the App Hosting backend before the first deployment; `firebase.json` does not create backends.
Deploy: `firebase deploy --only apphosting:commerce-developer --project wedidit-64fae`.
Bind `dev.ticarti.com` only after the new backend and `/v1/health` proxy both pass smoke tests.

## Safety
The current storefront `dev.ticarti.com` API proxy and Marketing developer landing are deliberately unchanged until domain cutover.
`/v1/*` is proxied from this portal to API_ORIGIN. Do not expose API secrets in client code.
