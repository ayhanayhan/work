# Ticarti Domain Connect v6 — mağaza bazlı dönüş adresi

API: `apps/api/src/merchant/merchant.service.ts`
Admin: `apps/admin/app/(protected)/settings/domains/page.tsx`

- Redirect API tarafında veritabanından doğrulanmış `store.publicSlug` ile `https://<slug>.ticarti.com/admin/settings/domains?dc_return=1` şeklinde üretilir. İstemciden redirect kabul edilmez.
- `DOMAIN_CONNECT_REDIRECT_URI` artık kullanılmaz.
- Test yalnızca `DOMAIN_CONNECT_TEST_MODE=true` **ve** `DOMAIN_CONNECT_TEST_STORE_SLUG=main` olduğunda `main` mağazasında etkinleşir. Başka mağazalarda resmî onay olmadan açılmaz.
- `DOMAIN_CONNECT_CLOUDFLARE_APPROVED=true` yalnızca gerçek sağlayıcı onayından sonra kullanılmalıdır.
- `DOMAIN_CONNECT_PUBLIC_KEY_HOST=_dcpubkeyv1.ticarti.com` gereklidir. Cloud Run özel anahtarının DNS public key ile eşleştiğini ve Domain Connect imza doğrulamasını kontrol edin.
- Admin dönüş sayfası callback sorgusunu alır ve mevcut domain durumunu yeniden sorgular. Callback tek başına DNS başarı kanıtı değildir.
- Cloudflare şablon onayı/sağlayıcı kabulü tamamlanmadan canlı DNS otomasyonunun çalışacağı garanti edilemez.

Mac (proje kökünde):

```bash
unzip -oq ~/Downloads/ticarti-domain-connect-activation-v6.zip
npm --workspace @commerce/api run build
```

Admin build komutu projedeki mevcut script'e göre çalıştırılmalıdır. Build başarılı olmadan deploy etmeyin.

Kod deployundan sonra Cloud Run ortam değişkenlerini (özel anahtarı yazdırmadan) hedefli olarak güncelleyin:

```bash
gcloud run services update commerce-api --project=wedidit-64fae --region=europe-west1 --update-env-vars=DOMAIN_CONNECT_TEST_MODE=true,DOMAIN_CONNECT_TEST_STORE_SLUG=main,DOMAIN_CONNECT_PUBLIC_KEY_HOST=_dcpubkeyv1.ticarti.com --remove-env-vars=DOMAIN_CONNECT_REDIRECT_URI
```

Bu komut servis revision'ı oluşturur; önce API kodunun deploy edildiğini doğrulayın. Admin kodu da ayrı deploy edilmelidir.

Not: `syncRedirectDomain` ve Cloudflare'ın alt alan adı redirect kabul kuralları gerçek sağlayıcıyla doğrulanmalıdır.
