TICARTI - CLOUDFLARE MERKEZI HESAP BAGLANTISI

Bu paket OAuth ile müşterinin bağımsız Cloudflare hesabını bağlamaz. Ticarti merkezi Cloudflare hesabında aktif zone bulunan domainleri tek tıkla bulup bağlar.

Cloud Run commerce-api servisine Secret Manager üzerinden CLOUDFLARE_PLATFORM_API_TOKEN env secret bağlanmalıdır. Token için Zone:Read ve DNS:Edit izinleri yalnızca ilgili zone'larla sınırlandırılmalıdır. Token hiçbir zaman Admin'e gönderilmez.

GET /v1/superadmin/cloudflare-status yalnızca yapılandırma durumunu döndürür.

Mağaza: /settings/domains > Cloudflare ile bağlan > DNS kayıtlarını eşitle.

Bağımsız müşteri Cloudflare hesabı yetkilendirmesi bu paketin kapsamı dışındadır.

API ve Admin değişmiştir. Super Admin API durumu eklenmiştir, Super Admin görsel paneli eklenmemiştir.
