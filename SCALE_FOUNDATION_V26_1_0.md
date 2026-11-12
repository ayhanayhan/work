# Ticarti v26.1.0 — Scale Foundation

Bu sürümün amacı bugünkü tek-DB yapıyı kırmadan 40.000 tenant ve aralarında çok yüksek hacimli mağazalar için bölünebilir bir control-plane temeli oluşturmaktır.

## Eklenenler

- `InfrastructureCell`: bölge, DB pool anahtarı, Redis namespace, queue shard kapasitesi ve tenant kapasitesi.
- `TenantPlacement`: tenant → cell, workload class, isolation level, queue shard, concurrency ve webhook rate politikası.
- Workload sınıfları: `STANDARD`, `BUSY`, `HIGH_VOLUME`, `DEDICATED`.
- Yeni mağazalar otomatik `primary` cell / `STANDARD` placement ile açılır.
- Mevcut mağazalar migration sırasında `primary` cell'e backfill edilir.
- BullMQ üreticisi cell + workload lane bazlı queue seçer.
- Worker deployment'ları `BACKGROUND_WORKER_CELL_CODES` ve `BACKGROUND_WORKER_LANES` ile belirli cell/lane'lere sabitlenebilir.
- Aynı worker batch'inde tenant-fair scheduling uygulanır; bir tenant tüm delivery slotlarını tüketemez.
- Tenant bazlı `maxConcurrentJobs` ve Redis tabanlı `webhookRatePerSecond` backpressure uygulanır.
- Kargo takip ve zamanlanmış SMS worker batch'leri tenant-fair seçilir; tek mağaza batch'i monopolize edemez.
- İstenirse fiziksel queue shard'ları `TENANT_QUEUE_PHYSICAL_SHARDS=true` ile etkinleştirilebilir.
- Multi-cell dönemde `CELL_ROUTING_ENFORCE=true` + `TICARTI_CELL_CODE=<cell>` yanlış cell'e gelen admin tenant request'lerini engeller.
- Superadmin `/infrastructure` ekranından cell ve workload placement görünür; mağaza workload sınıfı değiştirilebilir.
- `npm run verify:scale` kaynak/mimari regresyon kontrolü eklenmiştir.
- `npm run loadtest:scale` dağıtılmış tenant HTTP yük testi eklenmiştir.

## Önemli sınır

Bu sürüm **otomatik cross-database data migration yapmaz**. `databasePoolKey` placement metadata'sı ve cell enforcement, ileride tenant'ın fiziksel DB'ye taşınması için control-plane sözleşmesini hazırlar. Gerçek multi-DB açıldığında gateway/domain routing ve data-move job'ı bu sözleşmenin üstüne eklenecek; commerce domain kodunun yeniden tasarlanması gerekmeyecek.

## Önerilen production başlangıç ayarları

```env
PRISMA_CONNECTION_LIMIT=5
PRISMA_POOL_TIMEOUT=10
TICARTI_CELL_CODE=primary
CELL_ROUTING_ENFORCE=false
TENANT_QUEUE_PHYSICAL_SHARDS=false
BACKGROUND_WORKER_ENABLED=true
BACKGROUND_WORKER_CELL_CODES=primary
BACKGROUND_WORKER_LANES=standard,busy,high-volume,dedicated
BACKGROUND_WORKER_CONCURRENCY=10
WEBHOOK_WORKER_BATCH=50
WEBHOOK_WORKER_CONCURRENCY=12
SHIPPING_WORKER_CONCURRENCY=8
```

İkinci cell devreye alınırken ayrı API/worker deployment için `TICARTI_CELL_CODE=cell-2`, cell'e ait `DATABASE_URL` ve worker filtreleri kullanılır; gateway tenant/domain placement'a göre doğru deployment'a yönlendirir.
