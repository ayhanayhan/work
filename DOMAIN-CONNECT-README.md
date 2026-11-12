# Ticarti Domain Connect — signed synchronous apply integration

This package contains real API/Admin changes: per-tenant authorization, live Firebase record extraction, strict record validation, signed Cloudflare apply URL, and an enabled button **only after provider approval and server configuration**.

**Not ready for production activation:** Cloudflare must accept/onboard the template. Validate `domain-connect/ticarti.com.firebase-storefront.json` with the official Domain Connect linter (`-cloudflare`), publish via the official templates repository, and obtain Cloudflare approval. The dynamic ACME host variable must be confirmed supported by the linter. The template is a candidate, not approved.

Configure these Cloud Run secrets/environment settings ONLY after onboarding:
- `DOMAIN_CONNECT_CLOUDFLARE_APPROVED=true` (set only after actual Cloudflare confirmation)
- `DOMAIN_CONNECT_PRIVATE_KEY` (PEM RSA private key, from Secret Manager; never commit)
- `DOMAIN_CONNECT_PUBLIC_KEY_HOST` (TXT public-key hostname under ticarti.com, published in DNS per specification)
- `DOMAIN_CONNECT_REDIRECT_URI` (HTTPS URL on a Ticarti-owned domain, to return to domain settings)

Cloudflare providerId/serviceId must match the onboarded template. Never hardcode Firebase records. Do not turn on approval flag to bypass onboarding.

**Security:** the endpoint checks tenant/store permission, refuses incomplete DNS data and non-Cloudflare zones, and never modifies MX/SPF/other unrelated DNS via a Cloudflare API token. On return, refresh Firebase DNS status; a redirect alone is not proof of successful DNS configuration.

Build: `npm --workspace @commerce/api run build && npm --workspace @commerce/admin run build`. No Prisma migration or new npm dependencies. Do not deploy to production until Cloudflare template and DNS key are verified.
