# Ticarti v20.0.0 — Yönetim ve Büyüme Paketi

Bu sürüm, v19 tema altyapısının üzerine yönetim panelini ve mağaza büyüme araçlarını tamamlayan kümülatif tam sürümdür.

## Dashboard ve navigasyon

- Sipariş tutarı grafiği son 12 ayı aylık ciro ve sipariş adedi olarak toplar.
- Mağaza menüsü sadeleştirildi; yorumlar ve sorular Mağaza grubunun en altına taşındı.
- Tasarım altında Menü & Mega Menü eklendi.
- Yönetim altında Pazarlama grubu açıldı.
- SEO, Ayarlar grubunda bağımsız üst seviye menüdür.
- Ekip ve Destek Ayarlar grubuna taşındı; Destek en son sıradadır.

## Menü ve mega menü

- Ana, kategori, mobil ve footer menü konumları.
- Çok seviyeli öğe ağacı, kolonlar, görsel, rozet, açıklama ve promosyon öğeleri.
- Öğeleri ekleme, sıralama, alt öğe oluşturma, silme ve API üzerinden kaydetme.

## Pazarlama

- Popup, promosyon, sadakat, e-posta pazarlama, SMS pazarlama, sepet hatırlatma ve sepet/ödeme kurtarma ekranları.
- Toplam ve müşteri başına kullanım limiti, müşteri grubu, kampanya birleştirme, seçili kampanyalar, öncelik ve işlem durdurma.
- Giriş, sepet tutarı/adedi, marka, kategori, ürün, zaman, sipariş sayısı, doğum günü, müşteri adı, etiket, ilk sipariş, ülke ve para birimi koşulları.
- Yüzde/sabit indirim, hediye ürün, tüm/seçili ürün ve kategoriler, en pahalı/en ucuz ürün, X al Y öde, paket ve ücretsiz kargo aksiyonları.

## E-posta ve SMS

- Minimal, Marka, Editoryal ve Fiş/Sipariş olmak üzere dört sabit e-posta görünümü.
- Sipariş, hesap, şifre, ödeme, hazırlık, kargo, teslim, iptal, iade, fatura, sepet ve başarısız ödeme olayları.
- Mağazada etkin tüm diller için ayrı içerik ve ortak değişken sistemi.
- SMS için zorunlu olayların hazır metinleri ve karakter sayacı.

## Ürün ve varyantlar

- Ürün formu Bilgi, Görseller, Varyant & Stok, Çeviri & SEO sekmelerine ayrıldı.
- En fazla üç seçenek, değer girişi ve tüm varyant kombinasyonlarını otomatik üretme.
- Her varyant için ayrı başlık, SKU, fiyat ve stok yönetimi.

## Gelişmiş SEO

- robots.txt, sitemap, image sitemap, canonical, hreflang, arama/sepet/hesap noindex ve temiz URL kuralları.
- 301, 302, 307 ve 308 yönlendirmeleri.
- Organization, WebSite, Product, CollectionPage, BlogPosting, Blog, WebPage, BreadcrumbList, FAQPage ve LocalBusiness schema eşlemeleri.
- Sayfa tipi bazında SEO kuralları ile analitik ve e-ticaret olayları.

## 12 tema

Nova Commerce, Atelier, Noya, Orbit Market, Casa Linea, Aurelia, Velo, Pantry, Tiny & Co., Forge, Mono Studio ve Vertex B2B ayrı ana sayfa akışları, header/footer, ürün kartları ve sektör kimlikleriyle korunmuştur.

## Dağıtım düzeltmesi

Firebase App Hosting kaynaklarına yerel `.next` ve `dist` klasörleri dahil edilmez. Güvenli deploy komutu App Hosting adımından önce eski yerel Next çıktılarını temizler. Böylece macOS mutlak trace yollarının uzak rollout'u bozması engellenir.

## Doğrulama

- Prisma schema format, validate ve client generate başarılı.
- API NestJS production build başarılı.
- Admin Next.js production build ve 72 rota başarılı.
- Storefront Next.js production build ve 19 rota başarılı.
- Superadmin Next.js production build başarılı.
