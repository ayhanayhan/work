# Ticarti v26.2.0 — Multi-cell routing + dedicated DB layer

Bu sürüm v26.1.0 placement/cell temelini gerçek data-plane routing ile bağlar.

## Çalışma modeli

- `DATABASE_URL`: primary/shared tenant data DB.
- `CONTROL_DATABASE_URL` (opsiyonel): placement, membership ve control-plane metadata için ayrı DB. Tanımsızsa `DATABASE_URL` kullanılır.
- Cell `databasePoolKey=enterprise-1` ise runtime `DATABASE_URL_ENTERPRISE_1` arar.
- Cell `redisPoolKey=enterprise-1` ise runtime `REDIS_URL_ENTERPRISE_1` arar.
- `TICARTI_CELL_CODE`: bu API/worker deployment'ının cell kodu.
- `CELL_ROUTING_MODE=direct`: tek API deployment doğru Prisma pool'a request-context bazında bağlanır.
- `CELL_ROUTING_MODE=proxy`: başka cell'e ait request `InfrastructureCell.apiBaseUrl` üzerinden ilgili API cell'ine forward edilir.
- `CELL_ROUTING_ENFORCE=true`: yanlış cell'de local execution engellenir.

## Tenant request routing

`x-tenant-id` taşıyan merchant request'leri placement üzerinden çözülür. Storefront browser istekleri `x-ticarti-store-key` taşır; public `/v1/storefront/:storeSlug/...` route'ları path üzerinden de resolve edilir.

Prisma request context, tenant'ın `databasePoolKey` değerine göre doğru PrismaClient'ı seçer. Control-plane sorguları `prisma.control()` üzerinden her zaman control DB'ye gider.

## Redis / worker isolation

Cache ve BullMQ artık `redisPoolKey` üzerinden ayrı Redis'e yönlenebilir. Background worker queue consumer'ları cell'in DB + Redis pool'u içinde çalışır.

## Dedicated cell migration güvenliği

Dedicated cell'e doğrudan placement PATCH yasaktır. Akış:

1. migration planla,
2. hedef DB'ye tenant verisini operasyonel migration job/tool ile kopyala,
3. `/verify` ile kritik tenant tablolarının source/target count doğrulamasını çalıştır,
4. yalnız `READY_FOR_CUTOVER` durumunda atomik placement cutover yap.

Bu sürüm **DB provisioning veya bütün tenant verisini otomatik kopyalayan bulk copier içermez**. Bunun nedeni tenant şemasındaki geniş relation graph'ının eksik/kısmi kopyalanmasını engellemektir. Kopyalama fiziksel DB migration aracı/işi tarafından yapılır; Ticarti bu sürümde routing, verification ve güvenli cutover katmanını sağlar.

## Yeni Superadmin API'leri

- `GET /v1/superadmin/infrastructure/readiness`
- `GET /v1/superadmin/infrastructure/migrations`
- `POST /v1/superadmin/infrastructure/migrations/:tenantId`
- `POST /v1/superadmin/infrastructure/migrations/:id/copying`
- `POST /v1/superadmin/infrastructure/migrations/:id/verify`
- `POST /v1/superadmin/infrastructure/migrations/:id/cutover`
- `POST /v1/superadmin/infrastructure/migrations/:id/fail`
- `POST /v1/superadmin/infrastructure/migrations/:id/cancel`

## Örnek dedicated cell env

```bash
TICARTI_CELL_CODE=enterprise-1
CELL_ROUTING_MODE=direct
CELL_ROUTING_ENFORCE=false
DATABASE_URL_ENTERPRISE_1=postgresql://...
REDIS_URL_ENTERPRISE_1=redis://...
CELL_PRISMA_CONNECTION_LIMIT=8
MAX_CELL_DB_CLIENTS=32
```

Ayrı API deployment ile:

```bash
CELL_ROUTING_MODE=proxy
CELL_ROUTING_ENFORCE=true
```

ve Superadmin cell kaydında `apiBaseUrl=https://...` tanımlanır.
