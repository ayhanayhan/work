# Ticarti ana site iletişim entegrasyonu

Bu klasör ana Ticarti tanıtım sitesinin (ayrı HTML/Next.js proje) dosyalarını otomatik değiştirmez. Ana sitenin kaynakları bu GitHub deposunda bulunmuyor. Burada mevcut tasarımı koruyarak bir bağlantı için harici JavaScript hazırlanmıştır.

## Akış
- Ziyaretçi iletişim formunu doldurur ve KVKK/aydınlatma onayını işaretler.
- POST /v1/public/contact kayıt oluşturur.
- Master panelde /contact sayfasında listelenir.
- Panelde durum, iç not ve yanıt taslağı düzenlenir. **Yanıt e-postası otomatik gönderilmez.** E-postada Aç, e-posta istemcisini açar.
- Kayıtlar ContactInquiry tablosundadır. API, tabloyu ilk açılışında idempotent biçimde oluşturur; Prisma şeması da modele sahiptir. Mevcut veriler silinmez.
- 3 başvuru / 10 dakika / IP, honeypot ve içerik doğrulama mevcuttur. Redis yoksa limit uygulama instance'ı kapsamındadır.

## Form HTML gereksinimleri

Mevcut form etiketine data-ticarti-contact özelliğini ekleyin; mevcut sınıfları, stili ve düzeni koruyun. Alan name değerleri:

- fullName (veya name), zorunlu
- email, zorunlu
- phone, isteğe bağlı
- subject, zorunlu
- message, zorunlu
- consent, checkbox ve zorunlu
- website, gizli honeypot
- data-ticarti-contact-status özelliğine sahip canlı durum açıklama elemanı

İstek biçimi: fullName, email, phone, subject, message, consent:true, website:"".

Ana HTML site mevcut tasarımına dokunmadan harici script olarak assets/js/ticarti-contact.js eklenmeli; bu klasördeki ticarti-contact.js dosyasını o konuma kopyalayın.

Script URL: https://commerce-api-612520357246.europe-west1.run.app/v1/public/contact

Kaynak form dosyaları olmadan ana siteye bağlantı tamamlanmış sayılamaz. Sitenin gerçek kaynak HTML/JS dosyalarında form işaretlemesini ve script bağlantısını yapıp canlıda test edin.

## Yayın sırası
1. Master ve API build.
2. Cloud Run API deploy. Yeni tablo otomatik ve silmeden oluşturulur.
3. Master Firebase rollout.
4. Gönderim, listeleme ve izinli erişim testleri.
