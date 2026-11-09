# Ticarti — alt alan adına göre logo

Bu özellik site tasarımını değiştirmez. Logo tanımlanmamışsa önceki Ticarti logosu
(Marketing) veya yazı logosu (App) korunur. Yeni logo çizilmez veya varsayılmaz.

| Adres | Firebase backend | Ayar |
| --- | --- | --- |
| ticarti.com | commerce-marketing | `NEXT_PUBLIC_TICARTI_MAIN_LOGO` |
| help.ticarti.com | commerce-marketing | `NEXT_PUBLIC_TICARTI_HELP_LOGO` |
| app.ticarti.com | commerce-storefront | `NEXT_PUBLIC_TICARTI_APP_LOGO` |
| dev.ticarti.com | commerce-storefront | `NEXT_PUBLIC_TICARTI_DEV_LOGO` |

Örnek değerler:
```dotenv
NEXT_PUBLIC_TICARTI_HELP_LOGO=/assets/images/logo-help.svg
NEXT_PUBLIC_TICARTI_APP_LOGO=https://ticarti.com/assets/images/logo-app.svg
```

Marketing için logoyu `apps/marketing/public/assets/images/` içine
koyup `/assets/images/logo-help.svg` yolunu kullanabilirsiniz. App için
`apps/storefront/public/brand/` içine koyup `/brand/logo-app.svg`
yolunu kullanabilirsiniz. Dış bağlantı da `https://` olmalıdır.

Firebase App Hosting'de ilgili backend'in ortam değişkenine adresi ekleyin
ve o backend'i yeniden deploy edin. PUBLIC değişkenler Next.js derlemesinde
çözülür. Kod veya ortam değişkeni eklenmedikçe logo değişmez.

`dev.ticarti.com` şu anda kullanıcıya açık bir web uygulaması/header yerine
API yönlendirmesi için kullanılıyor. DEV logo yapılandırması hazırdır ama
dev alan adına ayrıca bir UI oluşturulmadan görünecek bir logo yoktur.

Help için header, mobil menü ve footer aynı ayarı kullanır.
App için üst ve alt logo aynı ayarı kullanır.

Bu ayarlar mevcut Master medya kütüphanesine bağlı bir yükleme arayüzü değildir;
yeni logo dosyalarını sonradan sağlayabilirsiniz.
