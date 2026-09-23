# Commerce SaaS — Final Foundation

Kapalı kaynak dağıtılabilecek, multi-tenant SaaS e-ticaret platformu temeli. Her SaaS müşterisi (`tenant`) tam olarak **tek e-ticaret sitesi** kullanır. Çoklu mağaza yoktur; tek site içinde birden fazla depo/stok lokasyonu desteklenir.

> Bu paket entegrasyonları sonradan bağlanabilir tutar; ödeme, kargo, fatura ve pazaryeri provider'ları Commerce Core'u değiştirmeden adapter olarak eklenir.

## Uygulamalar

- `apps/api` — NestJS + TypeScript API
- `apps/admin` — Merchant yönetim paneli (Next.js / React)
- `apps/storefront` — Müşteri storefront'u + tek sayfa checkout + üye dashboard'u
- `apps/superadmin` — SaaS platform yönetimi

## Ana yönetim navigasyonu

Ana Sayfa · Siparişler · Katalog · Müşteriler · Yorumlar · Sorular · Promosyonlar · Pazarlama · Sadakat · Tasarım & İçerik · SEO · Entegrasyonlar · Pazaryerleri (rezerve) · Raporlar · Ekip · Destek · Ayarlar

Sayfa sayısı bilinçli olarak düşük tutulur. Durum/tip ayrımları mümkün olduğunca filtre, sekme, drawer ve modal ile çözülür.

## Final kapsam

### Commerce
- ürün / kategori / marka / varyant / medya
- çoklu depo ve stok
- müşteri / adres / favori
- sepet / kupon / promosyon
- modern tek sayfa checkout
- ödeme tipi ve teslimat tipi yönetimi
- sipariş / iade
- yorumlar ve ürün/sipariş soruları

### Dil / bölge / para
- çoklu dil
- locale bazlı içerik çevirileri
- çoklu para birimi
- ülke → il/eyalet → ilçe → semt → mahalle lokasyon hiyerarşisi
- tenant'a özel lokasyon override/custom data

### Müşteri hesabı
- profil
- adresler
- siparişler
- favoriler
- iadeler
- yorumlar
- sorular
- sadakat
- KVKK/GDPR veri talepleri ve izin geçmişi

### Tasarım & İçerik
- site tasarımı / section altyapısı
- menüler
- sayfalar
- bannerlar
- versiyonlu sözleşmeler

### SEO
- rule/template sistemi
- toplu SEO için veri altyapısı
- URL çeviri / hreflang
- redirect
- canonical
- dahili link
- sitemap / robots / schema için genişletilebilir model
- audit/history

### Entegrasyonlar
- AI + kredi paketi/cüzdan/ledger
- kargo
- ödeme
- fatura
- WhatsApp / messaging
- sosyal medya
- Meta Pixel / analytics
- e-posta / SMS
- CRM
- webhook / log altyapısı
- pazaryeri adapter alanı (UI rezerve)

### SaaS / Super Admin
- tenant yönetimi
- tek site profili yönetimi
- paket / abonelik
- kullanıcılar
- destek talepleri
- feature entitlement / limitler

## Güvenlik özeti

- tenant isolation + RBAC + custom role/permission
- kısa ömürlü access token + rotating HttpOnly refresh session
- merchant/superadmin/customer access token'ları browser persistent storage'a yazılmaz
- server-side session revocation
- Redis destekli dağıtık rate limit + Redis yoksa local fail-safe limiter
- credential encryption (AES-256-GCM)
- audit log
- upload kontrolleri ve SVG engeli
- webhook SSRF koruması
- CORS allowlist + security headers
- checkout/session/customer verisi public cache dışında
- tenant-safe cache key standardı

Detay: `SECURITY_BASELINE.md`

## Cache / performans

- Redis application/data cache
- tenant-safe key: `tenant:<tenantId>:<scope>:<id>`
- storefront/page/fragment cache için altyapı
- tenant purge
- TTL config + warming alanları
- fiyat/stok için kısa TTL veya event invalidation
- checkout, session ve kullanıcıya özel içerik public cache'e girmez

## İlk yerel kurulum

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Uygulamaları ayrı terminallerde başlatın:

```bash
npm run dev:api
npm run dev:admin
npm run dev:storefront
npm run dev:superadmin
```

Smoke test:

```bash
npm run smoke
```

## Demo kullanıcıları

Seed sonrası e-posta adresleri:
- Merchant: `owner@example.com`
- Super Admin: `superadmin@example.com`

Local geliştirmede fallback şifreleri kullanılabilir. `NODE_ENV=production` olan cloud testte `SEED_OWNER_PASSWORD` ve `SEED_SUPERADMIN_PASSWORD` zorunludur; paket sabit production şifresiyle deploy olmaz.

## Production

Önerilen altyapı ve yaklaşık maliyet için `INFRASTRUCTURE.md`; güvenlik çıkış kriterleri için `SECURITY_BASELINE.md`; gerçek kurulum test durumu için `INSTALL_TEST.md` dosyasına bakın.

## Firebase hızlı test paketi

Bu dağıtım sürümünde Next.js storefront/admin/superadmin Firebase App Hosting'e, NestJS API Cloud Run'a, PostgreSQL Cloud SQL'a ve medya Firebase Storage/GCS'e kurulabilir. Browser istekleri `/api/v1` same-origin proxy üzerinden API'ye gider; refresh cookie'leri HttpOnly tutulur.

Detaylı kurulum: `FIREBASE_TEST_DEPLOY.md`  
Doğrulama durumu: `FIREBASE_TEST_STATUS.md`

## wedidit-64fae hızlı terminal kurulumu

Bu test paketi `wedidit-64fae` projesine özelleştirilmiştir. Önce `TERMINAL_SETUP.md` dosyasını takip edin; altyapı ve API için ana komut:

```bash
./scripts/bootstrap-wedidit-firebase.sh
```
