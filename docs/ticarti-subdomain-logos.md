# Ticarti — alt alan adına göre logo

Bu özellik site tasarımını değiştirmez. Logo tanımlanmamışsa önceki Ticarti logosu
(Marketing) veya yazı logosu (App) korunur. Yeni logo çizilmez veya varsayılmaz.

| Adres | Firebase backend | Ayar |
| --- | --- | --- |
| ticarti.com | commerce-marketing | `NEXT_PUBLIC_TICARTI_MAIN_LOGO` |
| help.ticarti.com | commerce-marketing | `NEXT_PUBLIC_TICARTI_HELP_LOGO` |
| app.ticarti.com | commerce-storefront | Henüz yapılandırılmadı (Storefront logo değişikliği geri alındı) |
| dev.ticarti.com | commerce-storefront | `NEXT_PUBLIC_TICARTI_DEV_LOGO` |

Örnek değerler:
```dotenv
NEXT_PUBLIC_TICARTI_HELP_LOGO=/assets/images/logo-help.svg
```

Marketing için logoyu `apps/marketing/public/assets/images/` içine
koyup `/assets/images/logo-help.svg` yolunu kullanabilirsiniz. App logosu için önceden eklenen Storefront ortam değişkeni desteği geri alındı.
Bunu ileride Master'dan yönetilecek merkezi marka ayarlarına bağlayacağız.
Dış bağlantı da `https://` olmalıdır.

Firebase App Hosting'de ilgili backend'in ortam değişkenine adresi ekleyin
ve o backend'i yeniden deploy edin. PUBLIC değişkenler Next.js derlemesinde
çözülür. Kod veya ortam değişkeni eklenmedikçe logo değişmez.

`dev.ticarti.com` şu anda kullanıcıya açık bir web uygulaması/header yerine
API yönlendirmesi için kullanılıyor. DEV logo yapılandırması hazırdır ama
dev alan adına ayrıca bir UI oluşturulmadan görünecek bir logo yoktur.

Help için header, mobil menü ve footer aynı ayarı kullanır.
App Marketplace geçici logo değişikliği geri alındığı için şu anda özgün yazı logosunu kullanır.

Bu ayarlar mevcut Master medya kütüphanesine bağlı bir yükleme arayüzü değildir;
yeni logo dosyalarını sonradan sağlayabilirsiniz.
