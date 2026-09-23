# Ticarti — Full v21.0.0

Bu arşiv konuşmadaki son kümülatif kaynak ağacıdır. Önceki altyapının tamamına ek olarak kaynak paket tabanlı marka-nötr tema portu, checkout API akışı ve admin menü davranışı düzeltmelerini içerir.

## Dahil edilen kritik düzeltmeler

- Admin: kompakt header, breadcrumb, full-screen Tasarım/POS/Canlı Takip.
- Canlı Takip: ikas benzeri arayüz, `Dünya` ve `Yerel` görünüm, 10 sn canlı yenileme, sipariş sesi, zoom, tam ekran.
- Geo: storefront heartbeat `x-geo-city`, `x-geo-country`, `cf-ipcountry` headerlarını okuyabilir.
- API Docker: Nest çıktısı yalnız `src/**/*.ts`; image build aşamasında `dist/main.js` zorunlu kontrol edilir.
- Firebase App Hosting: admin/storefront/superadmin standalone output monorepo için normalize edilir.
- Production deploy: önce yeni API revision 0% trafik, sonra DB job, DB başarılıysa trafik geçişi, ardından App Hosting.
- Tema kataloğu: 12 tema artık ayrı preset akışları, ayrı tipografi/renk/kart geometrileri ve sektör odaklı section sıraları kullanır.
- Storefront: mega menü, canlı arama, mini sepet, mobil alt navigasyon, lookbook, interaktif görsel karşılaştırma, ürün sekmeleri ve gelişmiş ürün detayı.
- Tasarım editörü: yeni section türlerinin tamamı bölüm kütüphanesinde seçilebilir ve gerçek storefront önizlemesine gönderilir.
- Dashboard: sipariş tutarları tek tek değil, son 12 ayın aylık cirosu ve sipariş adedi olarak gösterilir.
- Menü: daha hafif gruplama; Tasarım altında menü/mega menü, Yönetim altında Pazarlama, Ayarlar grubunda bağımsız SEO ve en altta Destek.
- Pazarlama: popup, promosyon, sadakat, e-posta, SMS, sepet hatırlatma ve başarısız ödeme/sepet kurtarma akışları.
- Promosyonlar: kullanım limitleri, müşteri grupları, birleştirme/öncelik, gelişmiş koşullar ve kapsamlı kampanya aksiyonları.
- İletişim şablonları: dört e-posta tasarımı, zorunlu e-posta/SMS olayları, değişkenler ve mağazada etkin tüm diller.
- Ürün yönetimi: sekmeli form ve seçeneklerden kombinasyon üreten gelişmiş varyant editörü.
- SEO: robots.txt, sitemap/canonical/hreflang, yönlendirmeler, indeks kuralları, schema eşlemeleri ve takip olayları.
- App Hosting: yerel `.next` ve `dist` çıktıları deploy kaynağından çıkarılır; macOS trace yolu kaynaklı rollout hatası önlenir.
- App Hosting runtime: standalone paketleri monorepo kökündeki Next.js üretim bağımlılıklarını içerir; `Cannot find module 'next'` ve `HealthCheckContainerError` giderilir.
- Varsayılan tema: kaynak paketin 1600 px grid, 100/80 px section ritmi, 20 px köşe sistemi, açılır arama, mega menü, ürün kartı hover arayüzü, slider, kolaj, sepet çekmecesi, servis şeridi, koyu bülten ve footer davranışları marka-nötr olarak doğrudan portlandı.
- Tema kimliği: mağaza ve istemci çıktısında kaynak tema/marketplace/platform adları bulunmaz; varsayılan tema `Ticarti Core` adıyla çalışır.
- Checkout: eksik checkout bootstrap, kargo/ödeme seçimi, müşteri checkout ve kayıtlı adres güncelleme uçları eklendi; ödeme hizmet bedeli ve idempotency sipariş hesabına bağlandı.
- Admin menü: mağaza/hesap alanı geniş menüde tekrar tam görünür; yalnızca sidebar gerçekten daraltıldığında kompakt artı/avatar görünümüne geçer.

## Local build

```bash
cd ~/Downloads/ticarti-full-final-v21-0-0
npm install
bash scripts/build-all.sh
```

`LOCAL_PRISMA_URL` verilmezse schema validate/generate için yalnızca biçimsel local URL kullanılır. Bu komut production DB'ye bağlanmaz.

## Production deploy

```bash
cd ~/Downloads/ticarti-full-final-v21-0-0
bash scripts/build-all.sh
bash scripts/deploy-production-safe.sh
```

API ve DB zaten başarıyla deploy edildiyse yalnız arayüzleri yeniden yayınlamak için:

```bash
bash scripts/deploy-apphosting-only.sh
```

## Güvenlik

- `--accept-data-loss` kullanma.
- `npm audit fix --force` kullanma.
- Tenant izolasyonunu `storeId/tenantId` doğrulamalarıyla koru.
- Secretları kaynak arşivine yazma.
- Cloudflare API token, DB URL, JWT secret vb. yalnız secret/env üzerinden verilmeli.
