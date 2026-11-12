Domain Connect v3 candidate — NOT APPROVED / NOT PRODUCTION ENABLED

Changes: standard Base64 signature; DNS label (not FQDN) in key=; sig last; validate public key DNS host; add syncRedirectDomain.

Remaining: validate Cloudflare linter and Online Editor, confirm Firebase dynamic ACME CNAME host support, validate Cloudflare apply URL and canonical signature, test signed URL against DNS key, publish template PR and obtain Cloudflare onboarding approval. Do not set DOMAIN_CONNECT_CLOUDFLARE_APPROVED=true yet.

Apply overlay from project root: unzip -oq ticarti-domain-connect-v3-review.zip
Build API: npm --workspace @commerce/api run build
Build Admin only if Admin changes are subsequently made.
