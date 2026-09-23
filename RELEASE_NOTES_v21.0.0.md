# Ticarti v21.0.0

## Tema

- Varsayılan tema artık `Ticarti Core` adıyla çalışır.
- Lisanslı kaynak paketin grid, boşluk, köşe, buton, header, açık arama, mega menü, ürün kartı, slider, kolaj, ürün sekmeleri, lookbook, sepet çekmecesi, servis şeridi, bülten ve footer davranışları Ticarti verisine bağlandı.
- İlk aktivasyonda eski varsayılan tema bölümleri tek seferlik olarak yeni kaynak-faithful preset ile değiştirilir. Sonraki deploylar mağaza düzenlemelerini tekrar sıfırlamaz.
- Kaynak tema, marketplace veya altyapı markaları storefront/theme çıktısında yer almaz.
- Diğer 11 tema korunur; toplam 12 tema katalogda aktif kalır.

## Checkout

- `GET /v1/storefront/carts/:token/checkout` eklendi.
- Kargo ve ödeme seçme uçları eklendi.
- Oturum açmış müşteri checkout ucu ve kayıtlı adres güncelleme ucu eklendi.
- Ödeme hizmet bedeli sepet, vergi, genel toplam ve sipariş kaydına dahil edildi.
- Aynı checkout isteğinin iki kez sipariş üretmesini önleyen idempotency akışı eklendi.

## Admin menü

- Menü genişken mağaza kanalı, mağaza seçici, kullanıcı ve plan alanı tam görünür.
- Kompakt artı ve avatar görünümü yalnızca sidebar daraltıldığında kullanılır.
- Tasarım/POS/Canlı Takip ekranından çıkınca sidebar önceki durumuna geri döner.

## Kurulum ve yayınlama

```bash
cd ~/Downloads
unzip -oq ticarti-v21-0-0-checkout-theme-admin-update.zip
bash ~/Downloads/ticarti-v21-0-0-checkout-theme-admin-update/apply.sh \
  ~/Downloads/ticarti-full-final-v20-0-0

cd ~/Downloads/ticarti-full-final-v20-0-0
bash scripts/build-all.sh
bash scripts/deploy-production-safe.sh
```

Bu güncelleme API değişikliği içerdiği için yalnız App Hosting deploy etmek yeterli değildir; `deploy-production-safe.sh` kullanılmalıdır.
