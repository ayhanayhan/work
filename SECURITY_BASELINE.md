# Security Baseline

Bu doküman production çıkışında minimum kabul kriteridir.

## Kimlik / oturum
- Access token kısa ömürlü (15 dk).
- Refresh token rastgele, hash'li DB session kaydı ile rotate edilir.
- Refresh token browser'da HttpOnly cookie ile taşınır.
- Access token merchant, superadmin ve customer tarafında persistent browser storage'a yazılmaz.
- Logout/revoke server-side session'ı iptal eder.
- Production'da `Secure` cookie zorunlu.
- Custom storefront domainlerinde API çağrıları mümkünse aynı-origin reverse proxy/BFF üzerinden geçirilmelidir.

## Tenant isolation
- Her yönetim isteği auth + tenant membership kontrolünden geçer.
- Entity erişimlerinde tenant/site ownership backend'de doğrulanır; client id güvenilir kabul edilmez.
- Cache anahtarları tenant prefix'i taşır.
- Security testinde IDOR / tenant escape özellikle denenir.

## Yetki
- RBAC + custom permission.
- Son OWNER'ın silinmesi/düşürülmesi engellenir.
- Super Admin ayrı guard kullanır.
- Kritik işlemler audit log'a yazılır.

## Ağ / API
- CORS allowlist.
- Security headers.
- Redis tabanlı dağıtık rate limit; Redis down ise process-local fail-safe.
- Webhook URL'lerinde private-network SSRF engeli.
- Provider secrets AES-256-GCM ile encrypted-at-rest uygulama katmanında saklanır.

## Checkout / ödeme
- Kart verisi uygulama DB'sinde tutulmaz; PCI kapsamını azaltmak için provider tokenization/hosted fields tercih edilir.
- Tutar, indirim, vergi, kargo ve stok server-side yeniden hesaplanır.
- Idempotency key ödeme/sipariş provider entegrasyonunda zorunludur.
- Checkout/customer/session response'ları shared public cache'e girmez.

## Upload
- Extension değil gerçek MIME/signature kontrolü.
- Boyut ve adet limiti.
- SVG default reddedilir.
- Object storage'a rastgele key ile yazılır.
- Production'da malware scan / image re-encode önerilir.

## KVKK / GDPR
- Versioned legal documents.
- Consent history immutable/auditable olmalıdır.
- Marketing consent, zorunlu sözleşme/aydınlatmadan ayrı tutulur.
- ACCESS/RECTIFY/PORTABILITY/RESTRICT/OBJECT/DELETE süreçleri.
- Retention/deletion job'ları production'da ayrıca uygulanıp test edilmelidir.

## Secrets / production
- JWT_SECRET >= 48 random chars.
- Integration encryption key JWT secret'tan farklı olmalı.
- DB/Redis public Internet'e açık olmamalı.
- Secrets repo/.env artifact içine konmamalı; secret manager veya protected env kullanılmalı.
- PostgreSQL point-in-time/backup stratejisi + bağımsız offsite logical backup.

## Çıkış öncesi test
- OWASP ASVS odaklı uygulama testi
- dependency/SCA scan
- secret scan
- SAST
- DAST
- tenant isolation test suite
- backup restore drill
- load/rate-limit testi
