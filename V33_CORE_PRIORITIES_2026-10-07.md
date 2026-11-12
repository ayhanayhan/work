# Ticarti v33 — Core Commerce Priorities

Bu sürüm app marketplace, ödeme sağlayıcı çeşitliliği ve kargo entegrasyon çeşitliliğini kapsam dışında tutarak core commerce güvenilirliği ve merchant operasyonlarını güçlendirir.

## P0 — Veri doğruluğu ve güvenilirlik
- Immutable InventoryLedgerEntry modeli + WarehouseStock DB trigger ile stok hareket defteri.
- Stok hareketleri admin ekranı: filtre, arama, delta ve işlem sonrası bakiye.
- Merkezi order/payment/payment-attempt/fulfillment/refund/return state-machine kuralları.
- Terminal payment attempt durumlarının yanlışlıkla tekrar SUCCEEDED yapılmasını engelleyen guard.
- Gerçek PostgreSQL üzerinde rollback-safe ledger integration harness.
- 5.000 checkout + hot-SKU load-test harness; production'a karşı koruma için LOADTEST_CONFIRM=YES zorunlu.

## P1 — Commerce karar motorları ve operasyon
- Market Resolution Engine: ülke, para birimi, dil ve varsayılan market skorlaması; B2B/company price-list önceliği.
- Checkout Fulfillment Routing Engine: tek-depo önceliği, priority, nearest, cost-optimized, split ve transfer-to-primary.
- Operations Center güvenli aksiyonları: expired reservation release, webhook retry, ledger tabanlı payment reconcile.
- Queue backlog, en yaşlı job, automation failure, DB active/long-running transaction göstergeleri.
- AsyncLocalStorage trace-context; event outbox'a traceId propagasyonu.

## P2 — Merchant UX ve performance guardrails
- Gerçek global admin search: order, product/SKU/barcode, customer, page; permission-aware.
- Saved views: Orders, Products, Customers için kullanıcı bazlı kayıtlı filtreler.
- Commerce/Markets ekranında market çözümleme önizlemesi.
- Theme publish performance budget.
- Storefront build performance budget.
- Cloud Build v33 core-priority quality gate.

## Production notları
- Prisma değişikliği vardır. Production deploy öncesinde migration deploy zorunludur.
- Yeni migrationlar:
  - `20261007170000_core_inventory_ledger`
  - `20261007171000_admin_views_trace`
- 5.000 checkout testi production mağazasında çalıştırılmamalıdır; izole staging/load-test mağazası kullanılmalıdır.
