# Ticarti — Full v19.0.0

Bu arşiv konuşmadaki son kümülatif kaynak ağacıdır. v18 altyapısının tamamına ek olarak 12 ayrı Ticarti tema kimliği, genişletilmiş storefront bileşenleri ve kaynak markadan arındırılmış görsel portu içerir.

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

## Local build

```bash
cd ~/Downloads/ticarti-full-final-v19-0-0
npm install
bash scripts/build-all.sh
```

`LOCAL_PRISMA_URL` verilmezse schema validate/generate için yalnızca biçimsel local URL kullanılır. Bu komut production DB'ye bağlanmaz.

## Production deploy

```bash
cd ~/Downloads/ticarti-full-final-v19-0-0
bash scripts/build-all.sh
bash scripts/deploy-production-safe.sh
```

## Güvenlik

- `--accept-data-loss` kullanma.
- `npm audit fix --force` kullanma.
- Tenant izolasyonunu `storeId/tenantId` doğrulamalarıyla koru.
- Secretları kaynak arşivine yazma.
- Cloudflare API token, DB URL, JWT secret vb. yalnız secret/env üzerinden verilmeli.
