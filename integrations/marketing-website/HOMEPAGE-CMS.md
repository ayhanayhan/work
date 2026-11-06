# Ticarti.com — Anasayfa CMS, Faz 1

Bu yalnızca Ticarti.com'un kurumsal tanıtım sitesi içindir; mağazaların storefront temaları için değildir.

## Tasarım kilidi
- Kaynak: Ticarti_V2_Iletisim_Formu_API_Entegrasyonlu.zip.
- Eski HTML/CSS/JS/font/carousel/animasyon görünümü ve script sırası değiştirilmez.
- Yeni bağlayıcılar yalnızca harici website-home-cms.js ve website-blog-cms.js dosyalarıdır.
- CMS erişimi yoksa orijinal HTML aynen görüntülenir.
- Kullanıcı açıkça istemeden renk, boşluk, font, buton, görsel ve layout revizyonu yapılmaz.

## API
Public: GET /v1/public/website/home?lang=tr; GET /v1/public/website/blog?lang=tr; GET /v1/public/website/blog/:slug?lang=tr.
Superadmin: GET /v1/superadmin/website/home; PATCH /v1/superadmin/website/home/:id; PATCH /v1/superadmin/website/home-import; GET /v1/superadmin/website/blog; PATCH /v1/superadmin/website/blog.
Persist: Prisma PlatformSetting keys marketing_homepage_v1 and marketing_blog_v1. Database migration gerektirmez. Mağaza tema ve blog kayıtlarına dokunmaz. Optimistic version conflict: 409.

## Master
- /website/home — modül içerikleri, locale sekmeleri, referans ve kart tekrarları, sürükle-bırak sıralama.
- /website/blog — kurumsal blog, kapak, kategori, çoklu dil, SEO ve yayınlama.
- Tek tek alanlar, logo/medya seçici ve sıralama kontrolü; kullanıcıdan JSON dizisi istenmez.

## İlk aktarım
- Site arşivinden assets/i18n/tr.json dosyasını Master Anasayfa sayfasında 'Mevcut Site İçeriğini İçe Aktar' ile seç.
- assets/data/blog-posts.json dosyasını Kurumsal Blog sayfasında 'Mevcut Blogu İçe Aktar' ile seç, sonra Blogu Kaydet.
- Diğer dil dosyaları assets/i18n/en.json, pt.json, ru.json; başlangıçta metinler boş, çeviri için hazır.
- Önce API ve Master build/deploy, sonra içerik aktarımı, en son ayrı statik site hostingine yeni ZIP yükle.
- Ticarti.com statik ZIP'i Master Firebase rollout ile otomatik yayına geçmez.

## Kontrol
- API ve Master build; içe aktarım; site tarayıcı desktop/mobile görsel regresyon; animasyon/FAQ/blog/scroll testi.
- Faz 1 sadece ana sayfa ve kurumsal blog bağıdır; fiyatlandırma, login ve kayıt sonraki fazdır.
