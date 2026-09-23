# Ticarti v19.0.0 — Görsel Tema Portu

Bu sürüm, kaynak temanın Liquid kodunu taşımadan görsel davranışlarını Ticarti'nin React/Next tema motoruna uyarlayan ilk tam vitrindir. Kaynak marka adı runtime, component, class ve tema şemalarında kullanılmaz.

## 12 ayrı tema

- Nova Commerce
- Atelier
- Noya
- Orbit Market
- Casa Linea
- Aurelia
- Velo
- Pantry
- Tiny & Co.
- Forge
- Mono Studio
- Vertex B2B

Her tema ayrı anasayfa section sırası, sektör metinleri, header/footer presetleri, ürün kartı geometrisi, renk, boşluk ve tipografi davranışı kullanır.

## Yeni storefront kapsamı

- mega menü ve çok seviyeli mobil menü
- öngörülü ürün araması
- sağdan açılan mini sepet ve adet yönetimi
- mobil sabit alt navigasyon
- sekmeli ve dikey sekmeli ürün koleksiyonları
- bannerlı ürün listeleri
- kategori spotlight, görselli kategori ve hover görsel listesi
- medya kolajı, masonry galeri ve video hero
- ürün hotspotlu lookbook / görünümü satın al
- sürüklenebilir önce/sonra görsel karşılaştırması
- canlı kampanya geri sayımı
- etiketler, harita, kargo barı, güven ve ikon blokları
- ürün galeri lightbox'ı, ölçü rehberi, teslim alma bilgisi ve önerilen ürünler

## Doğrulama

- Prisma tema katalog dosyası TypeScript kontrolünden geçti.
- API production build geçti.
- Admin production build geçti.
- Storefront production build ve standalone manifest kontrolü geçti.
- Kaynak tema marka adı proje kaynaklarından temizlendi.

Mevcut güvenli production sırası korunur: build → API no-traffic revision → DB init job → trafik geçişi → App Hosting deploy.
