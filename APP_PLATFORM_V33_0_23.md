# Ticarti v33.0.23 — App Platform / CDN / Help

- Sahte/demo entegrasyon katalog kayıtları kaldırılır; gerçek çalışan legacy yönetilen modüller kırılmadan korunur.
- Yeni Ticarti sistem modülleri Super Admin'e ZIP olarak yüklenir.
- ZIP içinde keyfi sunucu kodu çalıştırılmaz; sistem modülleri DECLARATIVE veya güvenli REMOTE/IFRAME extension kullanır.
- Üçüncü taraf uygulamalar `trust=THIRD_PARTY`, `runtime=HOSTED` olarak dev.ticarti.com Developer Portal üzerinden yüklenir, incelemeye gönderilir ve Super Admin onayından sonra yayınlanır.
- OAuth, zorunlu/opsiyonel scope consent, access/refresh token, webhook/outbox/retry ve app billing altyapısı kullanılır.
- Hosted extension'lara yalnız manifestte izin verilen context anahtarları query parametresi olarak aktarılır; erişim tokenı iframe URL'sine yazılmaz.
- Modül ve tema paketleri icon + preview + screenshots taşıyabilir; Super Admin'deki manuel görsel ayarları da korunur.
- Platform medyası ve tema asset URL'leri `cdn.ticarti.com` üzerinden üretilebilir.
- `help.ticarti.com` çok dilli Help Center backend/frontend'i ile gelir.
- `dev.ticarti.com` üçüncü taraf uygulama paketleme ve review akışının geliştirici portalıdır.

## Güvenlik
Üçüncü taraf ZIP'in içindeki Node/PHP/server code Ticarti API prosesine import edilmez. Hosted app geliştiricinin kendi origin'inde çalışır. Ticarti tarafında OAuth/scopes/webhook ve sandboxed extension host kullanılır.
