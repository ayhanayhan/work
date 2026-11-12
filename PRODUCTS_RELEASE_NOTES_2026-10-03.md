# Ticarti Products Release — 2026-10-03

Bu paket ürün yönetimi alanının gerçek API/tenant verisiyle çalışması için güncellenmiştir.

## Ürün yönetimi
- Kategoriler: ağaç yapı, ekle/düzenle/sil, üst kategori, sıralama ve SEO alanları.
- Markalar: gerçek CRUD.
- Koleksiyonlar: gerçek CRUD, manuel ürün seçimi ve temel otomatik kurallar.
- Ürün özellikleri / varyant şablonları / etiketler / birimler / ürün grupları: gerçek katalog tanımı CRUD akışı.
- Stok: varyant bazlı gerçek stok düzenleme.
- Demo/hardcoded aktif ürün yönetimi verileri kaldırıldı.

## Ürün ekle / düzenle
- Mevcut görsel dil korunarak form davranışı yenilendi.
- Kaydet akışı aktif ve validasyonlu.
- Kategori seçimi ağaç görünümünde.
- Birlikte Al: ürün adı/SKU ile autocomplete arama ve gerçek ürün ilişkisi.
- Benzer Ürün kaldırıldı.
- Paket Fiyatı kaldırıldı.
- Satış Kanalları kaldırıldı.
- Modal dışına tıklama ve ESC ile istemsiz kapanma engellendi; kapanışta kaydet/kaydetmeden kapat/vazgeç seçenekleri var.
- Ürün özellikleri/metafield değerleri bağlandı.
- Birim seçimi bağlandı.

## Varyantlar
- En fazla 3 seçenek grubu ve değerlerinden kombinasyon üretimi.
- Mevcut varyantların korunarak yeniden kombinasyon üretimi.
- SKU, barkod, fiyat, karşılaştırma fiyatı, stok, kritik stok, aktiflik düzenleme.
- Varyant ekle/sil/düzenle/kaydet akışı.
- Sipariş/sepet/iade geçmişi olan varyant fiziksel silinmek yerine pasife alınır.
- Eksik InventoryItem kaydı stok güncellemesinde otomatik oluşturulur.

## Ek düzeltmeler
- Storefront theme boundary ihlalleri giderildi.
- ContentPage veri alma işi tema katmanından route/runtime katmanına taşındı.

## Doğrulamalar
- `bash verify-full-source.sh` → OK
- `node scripts/stabilization-check.mjs` → OK
- `node scripts/core-freeze-check.mjs` → OK
- `node scripts/verify-metronic-admin.mjs` → OK (72 route, 6 dil)
- Değiştirilen ürün/API/storefront TypeScript/TSX kaynaklarında transpile syntax kontrolü → OK

Not: Bu çalışma ortamında npm paket cache'i eksik olduğu için gerçek Next/Nest production build bağımlılık kurulumu tamamlanamadı. Kaynak ve proje doğrulama scriptleri yukarıdaki gibi geçmektedir; kendi proje ortamında `npm ci` sonrası workspace buildleri ayrıca çalıştırılmalıdır.
