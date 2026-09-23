# YENİ CHAT İÇİN GENEL PROJE PROMPTU

Aşağıdaki proje üzerinde benimle kaldığın yerden devam et. Bu prompttaki kararları ve çalışma yöntemini proje sözleşmesi gibi kabul et.

## Proje

Ben Türkiye pazarı için kapalı kaynak multi-tenant bir e-ticaret SaaS geliştiriyorum. Projenin çalışma adı Commerce / WE DID IT. Her tenant ayrı e-ticaret mağazasıdır. Tenant izolasyonu kritik: bir mağazanın verisi başka mağazaya asla görünmemeli veya değiştirilememeli.

Teknoloji:
- Next.js 15 / React 19 / TypeScript
- NestJS API
- Prisma 6.19.3 / PostgreSQL
- Node 22
- npm workspaces
- Uygulamalar: `apps/admin`, `apps/storefront`, `apps/superadmin`, `apps/api`
- Ortak paket: `packages/shared`

GCP/Firebase:
- Project: `wedidit-64fae`
- Project number: `612520357246`
- Cloud Run / Cloud SQL region: `europe-west1`
- Firebase App Hosting region: `europe-west4`
- API service: `commerce-api`
- Cloud SQL: `commerce-db`, DB `commerce`, user `commerce`
- DB init job: `commerce-db-init`
- DB job service account: `commerce-api@wedidit-64fae.iam.gserviceaccount.com`

Canlı URL'ler:
- Admin internal App Hosting origin: `https://commerce-admin--wedidit-64fae.europe-west4.hosted.app` (kullaniciya gosterilmez; tenant `/admin` proxy icin)
- Storefront internal App Hosting origin: `https://commerce-storefront--wedidit-64fae.europe-west4.hosted.app` (public giris degil; dogrudan acilirsa `ticarti.com`a yonlenir)
- Superadmin internal App Hosting origin: `https://commerce-superadmin--wedidit-64fae.europe-west4.hosted.app` (kullaniciya gosterilmez)

## Çalışma şeklimiz

Ben uzun teşhis istemiyorum. Bir hata gönderirsem doğrudan gerçek hatayı bul, mümkünse küçük patch ZIP hazırla ve bana tek terminal bloğu ver. Her güncellemede patch + build + production publish komutunu birlikte ver. Terminal komutlarında gereksiz yorum satırları kullanma. `set -e`'yi benim interaktif shell'imde tek başına çalıştırma; gerekiyorsa script içinde kullan.

Benim proje klasörüm genellikle:
`~/Downloads/commerce-saas-wedidit-test-runtimefix`

Yeni full kaynak arşivi:
`commerce-saas-wedidit-full-v18-1.zip`

## Kesin güvenlik / deploy kuralları

- `npm audit fix --force` kullanma.
- Prisma'da `--accept-data-loss` kullanma.
- Production schema'da mevcut alanları düşürme.
- Özellikle şu eski production alanları korunmalı:
  - `Cart.paymentMethodId String?`
  - `CheckoutConfig.customerAccessMode CheckoutAccessMode @default(GUEST)`
  - `Order.paymentFee Decimal @default(0) @db.Decimal(12,2)`
  - `Order.idempotencyKey String?`
  - `@@unique([storeId, idempotencyKey])`
- Production deploy sırası:
  1. tüm buildler geçsin,
  2. API exact image oluştur,
  3. yeni Cloud Run revision'ı `--no-traffic` ile oluştur,
  4. revision Ready olsun,
  5. `commerce-db-init` job aynı exact image ile çalışsın,
  6. DB job başarılıysa API trafik %100 yeni revision'a geçsin,
  7. Admin / Storefront / Superadmin App Hosting deploy edilsin.
- DB job başarısızsa trafik değiştirme.

API runtime için önemli düzeltme: Nest production build yalnız `src/**/*.ts` derlemeli ve Docker build `test -f dist/main.js` kontrolü yapmalı. Eski hata `/app/dist/main.js` bulunamamasıydı.

Firebase App Hosting için önemli düzeltme: monorepo standalone output problemi vardı. Admin/storefront/superadmin `next.config.mjs` içinde `output: 'standalone'` ve `outputFileTracingRoot: process.cwd()` kullanıyor; postbuild script standalone çıktıyı doğrulayıp normalize ediyor.

## Admin tasarım dili

Admin gerçek Rizz theme asset/SCSS yapısını kullanıyor. Rastgele başka dashboard tasarımı uydurma. Light modda card/panel/box yüzeyleri beyaz olmalı. Content geniş/full-width. Header sabit ve kompakt. Menü kendi içinde scroll olabilir; Satış Kanalları + kullanıcı + paket bilgisi sidebar'ın sabit footer'ıdır.

Müşteriler menüsü:
- Müşteriler
- KVKK Talepleri
- Müşteri Grupları

Ekip:
- Ekip
- Yetki Grupları

Paketler Ayarlar'ın içinde değildir; ayrı tek `/plans` sayfasıdır. Satış Kanalları `+` butonu yeni mağaza ekler.

Header'da POS ve Canlı Takip ikonları bulunur.

## Full-screen özel ekranlar

`/design-content`, `/pos`, `/live` admin sidebar/header/footer olmadan immersive/full-width açılmalı ve kendi geri butonunu göstermeli.

Tasarım ekranı:
- mağaza tasarım editörü,
- tek kolon çalışma mantığı,
- canlı iframe preview,
- sayfa seçici,
- desktop/tablet/mobile,
- Header/Footer/tema ayarları,
- homepage bölüm kütüphanesi ve sürükle-bırak.

## Ayarlar

Ayarlar ana ekranı gruplu kart yapısında. Detay sayfasında çirkin ayrı “Geri” butonu kullanma; linkli breadcrumb kullan.

Alan Adları:
- platform subdomain + çakışma kontrolü,
- custom domain,
- A/CNAME talimatı,
- Cloudflare Zone ID/API Token verilirse DNS oluşturma/güncelleme,
- DNS değişti diye SSL/custom-domain tamamen doğrulandı sayma.

Diller ve Para Birimleri:
- dil teknik kod yazarak değil isimden/listeden eklenir,
- aktif/pasif + varsayılan,
- para birimi kur, sembol, sembol sağ/sol, aktiflik, varsayılan,
- TCMB / ECB-Frankfurter / Yahoo seçenekleri ve manuel/otomatik kur güncellemesi.

Vergiler ayrı sayfadır:
- ülke bazlı birden fazla vergi bölgesi,
- kategori bazlı override,
- vergi dahil/hariç davranışı.

Kargo:
- standart ücret, ücretsiz eşik,
- otomatik sevkiyat,
- kargo firması CRUD,
- kargo etiketi tasarımı,
- stok lokasyonları tam adres bilgileriyle.

Bildirimler:
- sipariş/ödeme/hazır/kargo/teslim e-postaları,
- yeni sipariş/düşük stok/müşteri mesajı/günlük özet yönetici bildirimleri.

Oturum çok sık şifre istememeli. Access token kısa tutulabilir ama güvenli refresh session uzun süreli ve rotation'lı olmalı. Login ekranı Rizz uyumlu.

## Ürün / Sipariş yapısı

Sipariş listesi Trendyol benzeri okunaklı yapı:
- ürün içeriği,
- müşteri,
- fatura,
- kargo,
- ödeme,
- toplam,
- en sağda görüntüle/düzenle.

Ürün:
- SIMPLE ve SET ürün,
- SET ürün component variant + quantity içerir,
- stok modu SELF veya COMPONENTS,
- component stok modunda seçili varyantların stokları düşer,
- nested component-stock set ve self-reference engellenir.

Ürün Tanımlamaları tek organize ekran:
- Kategoriler
- Markalar
- Özel Alanlar
- Varyant Türleri
- Ürün Grupları
- Tedarikçiler
- Ürün Kişiselleştirmeleri
- Etiketler
- Ürün Birimleri
- Sepet Linki

## Eklenti pazaryeri

Ana menüde AI Asistan/Integrations ayrı menü değildir. `Eklentiler` altında:
- Eklenti Mağazası
- Uygulamalarım

Kargo, muhasebe, fatura, pazaryeri, AI vb. marketplace uygulamasıdır. Superadmin katalog/fiyat/mağazaya atama yönetir. AI Assistant bir uygulamadır ve alt yetenekleri tab olarak açılır.

## Canlı Takip v18 — şu anki son özellik

Canlı Takip ekranı ikas benzeri full-screen yapıdadır. İki görünüm bulunur:
1. `Dünya` — ülke bazında canlı ziyaretçi ve sipariş hareketleri.
2. `Yerel` — Türkiye şehir bazında canlı ziyaretçi ve sipariş hareketleri.

Ekranda:
- anlık ziyaretçi,
- bugünkü satış,
- bugünkü ziyaretçi,
- bugünkü sipariş,
- son 30 dk ziyaretçi grafiği,
- sepette / ödeme adımında / sipariş verenler,
- son siparişler,
- çok satanlar,
- zoom,
- fullscreen,
- yeni sipariş sesi,
- 10 saniyede canlı yenileme bulunur.

Storefront heartbeat şu geo headerları okuyabilir:
- `x-geo-city`
- `x-geo-country`
- `cf-ipcountry`

Checkout adresi girildiyse şehir/ülke zaten kullanılabilir. Anonim ziyaretçide şehir görmek için proxy/Cloudflare Worker üzerinden geo bilgisi gerekir. Tarayıcıda `navigator.geolocation` popup'ı açma. Cloudflare Worker kullanacaksak `request.cf.city` ve `request.cf.country` değerlerini header olarak forward etmek tercih edilir. Şehir için Cloudflare planı/Worker verisi yeterli değilse MaxMind GeoLite2 veya IPinfo alternatif olabilir.

## Son durum / dikkat

API Cloud Run recovery sırasında çalışan eski revision korunarak yeni revision oluşturuldu ve yeni API revision'ın Ready olduğu doğrulandı; DB job başarılı oldu ve trafik yeni revision'a geçirildi. Önceki problemli revision `commerce-api-00018-xrr` artık hedef alınmamalı.

Frontend App Hosting tarafında Next build başarılı olmasına rağmen standalone `routes-manifest.json` path problemi yaşandı. Bu full kaynakta v17.6 monorepo standalone fix dahil. Yeni deploy öncesi local build al ve `.next/standalone/.next/routes-manifest.json` kontrolünün postbuild ile geçtiğini doğrula.

## Benden beklenen cevap biçimi

- Türkçe konuş.
- Gereksiz uzun açıklama yerine direkt çözüm ver.
- Kod değişikliği gerekiyorsa mümkünse ZIP patch üret.
- Ardından tek terminal bloğunda uygulama + build + production deploy komutunu ver.
- Build hatası gönderirsem önce gerçek hata satırını hedefle; tüm projeyi gereksiz yere değiştirme.
- Production veriyi riske atacak öneri verme.

# 2026-09-21 SON DURUM — TICARTI DOMAIN / SESSION / THEME ENGINE / STOREFRONT

Bu bölüm önceki tüm proje notlarının devamıdır ve en güncel referanstır.

## Domain mimarisi

Public domain yapısı:
- `ticarti.com` → landing
- `ticarti.com/paketler` → paketler
- `login.ticarti.com` → merkezi merchant login
- `app.ticarti.com` → Ticarti uygulama pazaryeri; merchant admin değildir
- `superadmin.ticarti.com` → Superadmin
- `dev.ticarti.com` → API
- `academy.ticarti.com` → sistem subdomainidir, tenant slug olamaz; Academy hazır olana kadar `ticarti.com`a yönlenir
- tenant storefront → `<publicSlug>.ticarti.com`
- tenant admin → `<publicSlug>.ticarti.com/admin`
- custom domain tenant admin → `customdomain.com/admin`

Reserved system subdomainler en az: `www`, `login`, `superadmin`, `dev`, `api`, `admin`, `app`, `academy`.

`.hosted.app` adresleri kullanıcıya public link olarak gösterilmez. Storefront hosted.app doğrudan açılırsa `ticarti.com`a yönlenir. Admin ve Superadmin hosted.app originleri reverse proxy upstream olarak kullanılabilir.

## Tenant admin proxy

Tenant `/admin/*` istekleri storefront üzerinden internal Admin App Hosting originine proxy edilir. Infrastructure `Authorization`, `X-Goog-*`, Firebase forwarding gibi host altyapı headerlarını upstream'e tekrar gönderme; yalnız browser/application headerlarını allowlist ile geçir. Tenant host `x-ticarti-tenant-host` ile taşınabilir. Upstream `Location` tenant domainine rewrite edilmelidir.

## Ticarti genel oturum

Merchant oturumu Ticarti genelinde tanınmalıdır:
- `login.ticarti.com` açıldığında session kontrol edilir.
- Kullanıcı daha önce giriş yaptıysa tek mağazada doğrudan ilgili tenant `/admin` alanına handoff edilir.
- Birden fazla mağaza varsa mağaza seçimi gösterilir.
- `ticarti.com` ve `app.ticarti.com` üst menüsünde aktif session varsa `Giriş Yap` yerine mağaza logosu / profil / mağaza adı gösterilir.
- Refresh token plaintext olarak browser UI'a dönmemeli; session güvenli, uzun ömürlü ve rotation'lı olmalıdır.

## Mağaza Tasarım Editörü

Tasarım editörünün hedef mimarisi:
- normal admin sidebar/header/footer yok; immersive ekran,
- sol panel + gerçek tenant storefront iframe preview,
- sahte/mock preview veya `srcDoc` kullanılmaz,
- browser origin tenant/custom domain olduğu için canlı preview gerçek mağaza URL'sini kullanır,
- sol panelden section seçildiğinde iframe içindeki section scroll edilir ve belirgin accent border/outline ile seçili görünür,
- iframe içinden section tıklanınca soldaki aynı section seçilir,
- çift yönlü iletişim `postMessage` ile yapılır,
- draft state anlık preview'a gönderilir; her tuşta DB'ye yazılmaz,
- `Kaydet` ile permanent theme state'e geçer,
- `Geri Al` desteklenmelidir,
- geniş ekranlarda panel açık, yaklaşık 1400 px ve altında preview'ı ezmemek için rail/overlay davranışı; panel açılır-kapanır ve hover/focus ile kullanılabilir,
- ana sayfa sectionları drag-drop; ürün/kategori/arama vb. iç sayfalarda sınırsız drag-drop yok, layout/preset ve feature seçimleri vardır,
- Header/Footer preset kütüphanesi seçilebilir, blokları yönetilebilir.

Loading ekranı yalnız admin içindir: tam viewport ortasında yalnız 3 büyük yeşil nokta sırayla yanıp söner. `T` harfi ve görünür yükleniyor metni yoktur.

## Tema motoru v18.7.x

Tema motoru artık Superadmin ve Admin tarafından yönetilir.

12 isimlendirilmiş tema:
- Nova Commerce (default)
- Atelier
- Noya
- Orbit Market
- Casa Linea
- Aurelia
- Velo
- Pantry
- Tiny & Co.
- Forge
- Mono Studio
- Vertex B2B

`Tema 1`, `Tema 2` gibi adlar kullanılmaz. Runtime/client kodunda kaynak tema, marketplace veya altyapı markası görünmemelidir.

Şimdilik tüm temalar ücretsizdir. Superadmin daha sonra:
- tema aktif/pasif,
- default/featured,
- paket dahil,
- paket bazlı ücretsiz,
- düşük pakette ayrıca ücretli satın alınabilir,
- mağazaya lisans grant,
- modül bazlı aktif/pasif
ayarlarını yönetebilmelidir.

Tema değişiminde checkbox vardır:
`Tema modüllerini ve örnek içeriği yükle`
- işaretliyse seçilen temanın preset section sırası ve demo/preset content ayarları yüklenir,
- işaretli değilse kullanıcının mevcut sectionları korunur; denk gelen section tiplerine tema stil/layout ayarları uygulanır, içerik/görsel/link seçimi korunur; eşleşmeyen sectionlar kaybolmaz.

Tema tasarım geçmişi tutulur:
- tema değişmeden önce snapshot,
- Tasarım Editörü Kaydet öncesi/sonrası version snapshot,
- son yaklaşık 30 sürüm,
- tarih/tema/sebep bilgisi,
- tek tık restore,
- restore öncesi mevcut durum ayrıca snapshot edilerek restore işlemi de geri alınabilir.

## Lisanslı kaynak tema görsel portu

Kullanıcı lisanslı kaynak tema paketini verdi. Hedef: görsel karakter ve gerçek layout davranışlarını mümkün olduğunca koruyarak Ticarti React/Next tema motoruna port etmek; kaynak template kodunu veya class adlarını körlemesine kopyalamamak.

Kaynak temanın adı runtime'da hiçbir yerde görünmemeli. Component/class/schema adları Ticarti'ye ait olmalı. Görsel tasarım ilk aşamada fazla bozulmamalı; küçük özgünleştirmeler daha sonra yapılacak.

Kaynak tema auditinde yaklaşık:
- 102 section,
- 35 template,
- 110 snippet,
- 220 asset,
- 16 theme block,
- 408 image-picker slot
bulundu.

Ana hedef section/component grupları:
- slider / hero / video hero,
- banner / collage / masonry / promo,
- featured collection / product grid / product slider / tabs,
- product list + banner,
- category/collection grid/list/spotlight,
- gallery / masonry / lightbox,
- ticker/marquee,
- accordion/FAQ,
- image comparison,
- lookbook / hotspot / shop-the-look / shoppable feed,
- counter/statistics,
- icon columns/features,
- newsletter,
- promotion popup,
- testimonials,
- brand/logo list,
- blog,
- map/store location,
- trust/payment/shipping areas.

Core storefront surfaces:
- gerçek Header presetleri,
- gerçek Footer presetleri,
- Product Card presetleri,
- Collection/category layouts,
- Product Detail layouts,
- Search/predictive search,
- Cart drawer/mini-cart,
- sticky mobile nav,
- recently viewed,
- recommendations,
- size chart,
- pickup availability,
- mega menu.

Son dalga hedefi artık 'uyarlama' değil gerçek görsel porttur. Ancak kod mimarisi yine Ticarti component + preset + schema olmalıdır.

## v18.7.3 canlı / preview parity

Son çalışma ağacı `ticarti_v1873_work` ve son patch `commerce-v18-7-3-visual-port-live-parity-r1.zip`.

v18.7.3 hedefleri:
- canlı storefront ve Tasarım Editörü preview aynı layout geometrisini kullanmalı,
- section wrapper 12 kolon grid içinde tam genişlik kaplamalı; live'da sectionların sola sıkışması olmamalı,
- `html/body` yatay overflow kaynaklı layout shift azaltılmalı,
- slider gerçek carousel davranışı: aktif slide, ok, dot, autoplay,
- header/footer/product-card/collage presetlerinin görsel karakteri güçlendirildi,
- AI launcher footer'ın altında düz `AI` / `Al` metni gibi görünmemeli; AI eklentisi açıksa sabit launcher ikon olarak görünmeli, kapalıysa hiç görünmemeli.

Kullanıcının son bildirdiği görsel bug:
- canlı sitede içerik sola kayıp dar kolonlar halinde görünüyordu, preview'da yoktu,
- footer altında `Al` benzeri düz metin çıkıyordu.
Bu v18.7.3 patchinin çözmesi gereken ana parity buglarıdır.

## SEO / marketing / conversion tracking

Bu alanlar çok önemlidir ve tema portu sırasında kırılmamalıdır.

SEO Studio ayrıntılı olmalı ve frontend'e gerçekten uygulanmalı:
- title/meta description,
- canonical,
- robots/noindex/nofollow,
- sitemap,
- OpenGraph/Twitter,
- structured data/schema.org,
- site verification,
- custom head input,
- mümkün olduğunca server-side Next metadata.

Tracking/integration:
- Google Tag Manager,
- GA4,
- Meta/Facebook Pixel,
- Google Ads conversion,
- ecommerce eventleri en az: `view_item`, `select_item`, `add_to_cart`, `begin_checkout`, `purchase`,
- consent-aware çalışmalı; zorunlu olmayan analytics/reklam kullanıcı izin vermeden devreye girmemeli.

Tema değişimi tracking ve SEO altyapısını kaybettirmemeli; bunlar tema katmanından bağımsız platform servisleri olmalıdır.

## Medya / performans

Performans kritik gereksinimdir.
- upload sırasında uygun WebP ve AVIF türevleri,
- farklı kullanım alanlarına göre thumb/card/category/detail/hero boyutları,
- ürün kartında dev 1800px orijinali zorla yükleme,
- responsive `srcset/sizes`, lazy loading, async decode,
- uzun cache immutable assetlerde,
- tema ayarında görsel oranı/layout seçilebilir ama platformdaki gerçek image rendition ölçüleri Ayarlar > Görsel Boyutları tarafından yönetilir,
- theme başına kopya dev JS bundle üretme; ortak component + token/preset yaklaşımı,
- `content-visibility` gibi optimizasyonlar uygun yerde,
- `prefers-reduced-motion` desteklenir.

## Default legal documents

Yeni mağazalarda default yasal belge seti bulunmalı; mevcut aktif/TRIAL mağazalarda bir kerelik backfill gerekmiştir.
Ana metinler:
1. Çerez Politikası
2. Gizlilik ve Güvenlik
3. Tüketici Hakları – Cayma – İptal / İade Koşulları
4. Kullanım Koşulları / Telif / Lisans / Geçerli Hukuk
5. KVKK – Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni
6. Mesafeli Satış Sözleşmesi
7. Üyelik Sözleşmesi

Diller: TR, EN, DE, RU, AR. Arapçada RTL. Store-specific placeholderlar korunur (`{store_name}`, `{store_domain}`, `{store_owner}`, `{store_address}`, `{store_email}`, `{store_mail}`, `{store_telephone}` vb.). Sipariş anında kabul edilen sözleşmeler version/snapshot olarak order ile saklanmalı; sonradan içerik değişse eski siparişin kabul ettiği metin değişmemeli.

## Blog

- kategori ekleme alttan açılan inline form değil modal,
- yeni blog yazısı ayrı sayfada açılır,
- yazıda dil seçilir,
- tek makalenin tüm dillerde ortak olması zorunlu değildir; dil bazlı ayrı içerik desteklenir.

## Mağaza silme

Ayarlar'da `Mağazamı Sil` akışı:
- admin/superadmin'e silme talebi,
- e-posta onayı,
- yaklaşık 15 gün bekleme,
- sonrasında mağaza tüm tenant verileriyle kontrollü silinir,
- scheduler/job akışı audit edilebilir olmalıdır.

## Billing / iyzico

Admin paket satın alma/yükseltme için iyzico entegrasyonu bulunur. Gerçek ödeme için production secret/env gerekir (`IYZICO_API_KEY`, `IYZICO_SECRET_KEY`). Secretlar repoya gömülmez.

Tema satışları da aynı payment altyapısını kullanabilir; ancak şimdilik tüm tema fiyatları 0/FREE olarak tutulmalıdır.

## Gelecekte patch hazırlama standardı

Yeni bir chat bu full kaynak ZIP'ini açıp çalışacaksa en güncel snapshotı baz al. Eski patchleri sırayla tekrar uygulama; full snapshot zaten önceki patchleri içerir.

Patch ZIP yapısı tercihen:
- `apply.sh`
- `deploy-production.sh` veya yalnız frontend ise `deploy-frontends.sh`/`deploy-storefront.sh`
- gerekli overlay/diff dosyaları
- kısa `README.txt`

Deploy scripti build başarısızsa hiçbir production mutation yapmamalıdır.

## Terminal — yeni full kaynakla devam

Yeni full snapshot indirildiyse:

```bash
cd ~/Downloads
rm -rf commerce-saas-wedidit-test-runtimefix
unzip -oq ~/Downloads/ticarti-full-final-v18-7-3.zip -d ~/Downloads/commerce-saas-wedidit-test-runtimefix
cd ~/Downloads/commerce-saas-wedidit-test-runtimefix
npm install
```

Bir sonraki patch geldiğinde standart uygulama biçimi:

```bash
cd ~/Downloads/commerce-saas-wedidit-test-runtimefix
unzip -oq ~/Downloads/<PATCH>.zip -d ~/Downloads
bash ~/Downloads/<PATCH>/apply.sh ~/Downloads/commerce-saas-wedidit-test-runtimefix
bash ~/Downloads/<PATCH>/deploy-production.sh ~/Downloads/commerce-saas-wedidit-test-runtimefix
```

Yalnız storefront/frontend patchinde patchin verdiği `deploy-storefront.sh` veya `deploy-frontends.sh` kullanılmalıdır; script adını uydurma.

## Terminal — bu promptu proje içine güncelle ve Git'e push et

Yeni chat prompt dosyası Downloads klasöründeyse:

```bash
cd ~/Downloads/commerce-saas-wedidit-test-runtimefix
cp ~/Downloads/TICARTI_NEXT_CHAT_PROMPT.md ./GENERAL_PROMPT_NEW_CHAT.md
git add GENERAL_PROMPT_NEW_CHAT.md
git commit -m "docs: update Ticarti project handoff prompt" || true
BRANCH="$(git branch --show-current)"
git push origin "$BRANCH"
```

Git remote/branch yoksa `git push` çalıştırma; önce mevcut repo remote bilgisini kontrol et:

```bash
cd ~/Downloads/commerce-saas-wedidit-test-runtimefix
git remote -v
git branch --show-current
```
