# Domain Connect v4 candidate — REVIEW ONLY

- Firebase App Hosting commonly uses `_acme-challenge_<random>` CNAME labels. v3 regex rejected these labels. v4 restricts the variable to the suffix, and rejects unsupported label forms instead of generating incorrect DNS.
- Template uses `multiInstance: true` to avoid cross-application record cleanup when different ACME tokens are used. This is a candidate design, not proof that Cloudflare accepts it.
- TXT matching explicitly set to `None` so unrelated TXT records are preserved.
- Do NOT deploy/enable without official dc-template-linter and Online Editor tests, canonical signature interoperability verification, and Cloudflare provider approval.

Test on Mac from project root:
`unzip -oq ~/Downloads/ticarti-domain-connect-v4-candidate.zip`
`npm --workspace @commerce/api run build`
`go install github.com/Domain-Connect/dc-template-linter@latest`
`"$(go env GOPATH)/bin/dc-template-linter" -merge-or-fail domain-connect/ticarti.com.firebase-storefront.json`
`"$(go env GOPATH)/bin/dc-template-linter" -tolerate warn domain-connect/ticarti.com.firebase-storefront.json`

Online Editor: https://domainconnect.paulonet.eu/dc/free/templateedit
Official rules: https://github.com/Domain-Connect/Templates
