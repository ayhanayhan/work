# Ticarti alt alan adı logoları — merkezi yönetim

Logo seçimleri **Master → Ayarlar → Genel Ayarlar → Alt Alan Adı Logoları**
bölümünde saklanır. Bu alanlar müşteri mağazalarının logo/tema
ayarlarından bağımsızdır.

| Alan adı | Master alanı | Görüntüleme |
| --- | --- | --- |
| ticarti.com | Ana site | commerce-marketing, ortak header/footer |
| help.ticarti.com | Yardım Merkezi | commerce-marketing, ortak header/footer |
| app.ticarti.com | Uygulama Mağazası | Veri kaydedilir, mevcut Storefront App arayüzü henüz bu ayarı kullanmaz |
| dev.ticarti.com | Geliştirici/API | Developer ana sayfası Marketing ortak header/footer; logo Master'dan gelir |

## Teknik akış

- Master, mevcut `superadmin/platform-settings` endpoint'ine `branding`
  alanını ekler ve kurumsal `superadmin/media` kütüphanesinden görüntü seçer.
- API bu ayarı `GET /v1/public/website/branding` üzerinden yalnızca
  halka açık güvenli logo URL'leriyle sunar. Kullanıcı bilgileri ve diğer
  platform ayarları dışarı verilmez.
- Marketing sunucusu `API_ORIGIN` üzerinden merkezi logoyu okur.
  Marketing'e ait ana site, Help ve Developer logolarını doğrudan gösterir.
- Bir görsel atanmazsa mevcut Ticarti logosu görünür. API erişilemezse
  varsayılan logo korunur.
- App Marketplace sayfası henüz Storefront içindedir. Bu sayfaya
  yeni logo kodu eklenmedi; bağımsız App uygulamasına taşınırken merkezi
  branding endpoint'i kullanılmalıdır.
- Dev ana sayfası ve statik dosyaları Storefront üzerinden Marketing'e proxy edilir;
  tüm API adresleri mevcut API proxy'sinde kalır. Developer görünümü aynı
  header/footer bileşenini kullanır, logo Master'daki Dev alanından okunur.

## Yayınlama

Developer portalının yönlendirme ve tasarım değişiklikleri için **Marketing** ve **Storefront** deploy edilir.
Master'dan Dev logosu seçildiğinde ayrıca deploy gerekmez.

Yeni logo seçmek için daha sonra kod/deploy gerekmez. Master'da medya
seçip kaydettikten sonra Marketing yeni URL'yi sunucuda okuyabilir.

Önceki `NEXT_PUBLIC_TICARTI_*_LOGO` ortam değişkenleri, Marketing için
yalnızca eski/varsayılan fallback olarak korunmuştur. Yeni logo seçimi
için bu değişkenleri ayarlamak gerekmez.
