# Ticarti alt alan adı logoları — merkezi yönetim

Logo seçimleri **Master → Ayarlar → Genel Ayarlar → Alt Alan Adı Logoları**
bölümünde saklanır. Bu alanlar müşteri mağazalarının logo/tema
ayarlarından bağımsızdır.

| Alan adı | Master alanı | Görüntüleme |
| --- | --- | --- |
| ticarti.com | Ana site | commerce-marketing, ortak header/footer |
| help.ticarti.com | Yardım Merkezi | commerce-marketing, ortak header/footer |
| app.ticarti.com | Uygulama Mağazası | Veri kaydedilir, mevcut Storefront App arayüzü henüz bu ayarı kullanmaz |
| dev.ticarti.com | Geliştirici/API | Veri kaydedilir, mevcut alan adında görsel arayüz yok |

## Teknik akış

- Master, mevcut `superadmin/platform-settings` endpoint'ine `branding`
  alanını ekler ve kurumsal `superadmin/media` kütüphanesinden görüntü seçer.
- API bu ayarı `GET /v1/public/website/branding` üzerinden yalnızca
  halka açık güvenli logo URL'leriyle sunar. Kullanıcı bilgileri ve diğer
  platform ayarları dışarı verilmez.
- Marketing sunucusu `API_ORIGIN` üzerinden merkezi logoyu okur.
  Yalnızca Marketing'e ait ana site ve Help logosunu doğrudan gösterir.
- Bir görsel atanmazsa mevcut Ticarti logosu görünür. API erişilemezse
  varsayılan logo korunur.
- App Marketplace sayfası henüz Storefront içindedir. Bu sayfaya
  yeni logo kodu eklenmedi; bağımsız App uygulamasına taşınırken merkezi
  branding endpoint'i kullanılmalıdır.
- Dev adresi API yönlendirmesidir, gösterilecek bir header yoktur.

## Yayınlama

Kod değişiklikleri için **API**, **Master** ve **Marketing** deploy edilir;
Storefront deploy edilmez.

Yeni logo seçmek için daha sonra kod/deploy gerekmez. Master'da medya
seçip kaydettikten sonra Marketing yeni URL'yi sunucuda okuyabilir.

Önceki `NEXT_PUBLIC_TICARTI_*_LOGO` ortam değişkenleri, Marketing için
yalnızca eski/varsayılan fallback olarak korunmuştur. Yeni logo seçimi
için bu değişkenleri ayarlamak gerekmez.
