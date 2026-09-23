# Ticarti v20.0.3 — App Hosting Runtime Düzeltmesi

v20.0.2 ve v20.0.0 özelliklerinin tamamını içerir.

## Düzeltilen hata

- Firebase App Hosting derlemesi başarılı olmasına rağmen Cloud Run açılışında oluşan `Cannot find module 'next'` hatası giderildi.
- Admin, storefront ve superadmin standalone paketleri artık monorepo kökündeki üretim bağımlılıklarını izler.
- Firebase adaptörünün beklediği kök standalone manifest düzeni korunur.

## Doğrulama

- Admin: 72 rota üretim derlemesi başarılı.
- Storefront: 19 rota üretim derlemesi başarılı.
- Superadmin: 5 rota üretim derlemesi başarılı.
- Üç uygulamanın standalone sunucusu da ayrı ayrı `PORT` değeriyle başlatıldı ve `Ready` durumuna ulaştı.

