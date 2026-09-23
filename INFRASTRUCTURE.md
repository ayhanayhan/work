# Önerilen Production Altyapısı ve Maliyet Modeli

Tarih: 2026-09-19. Fiyatlar sağlayıcıların güncel liste fiyatlarına göre yaklaşık olup vergi, IPv4, kur değişimi ve kullanım aşımı hariç olabilir.

## Önerilen başlangıç mimarisi

```text
Cloudflare DNS / CDN / WAF / SaaS custom hostnames
                  │
          Reverse Proxy (Nginx)
                  │
        App/API Node Cluster
  Next.js + NestJS + workers
                  │
       ┌──────────┴──────────┐
       │                     │
 PostgreSQL 16          Managed Redis
       │                     │
       └──────────┬──────────┘
                  │
       Cloudflare R2 media
                  │
        Resend transactional mail
```

## Teknoloji seçimi
- Backend: NestJS + TypeScript
- Merchant / Storefront / Super Admin: Next.js + React
- Database: PostgreSQL 16
- ORM: Prisma
- Cache / rate-limit / queue state: Redis
- Queue: BullMQ
- Media: Cloudflare R2 (S3-compatible)
- Edge/DNS/CDN/WAF: Cloudflare
- Runtime: Docker on Ubuntu LTS
- Reverse proxy: Nginx
- Transactional mail: Resend
- Monitoring: OpenTelemetry/Grafana + optional Sentry
- CI/CD: GitHub Actions veya GitLab CI

## Tavsiye edilen ilk production kapasitesi
- App/API: Hetzner CPX22 — 1 adet
- PostgreSQL: Hetzner CPX22 — 1 adet, yalnız private network
- Her iki server için Hetzner Backup
- Redis: Upstash Fixed 250 MB (başlangıçta)
- R2: kullanım bazlı
- Cloudflare: Free/Pro ihtiyaca göre; Cloudflare for SaaS custom hostname yaklaşımı
- Resend: Pro, platform e-posta hacmi gerektiriyorsa

## Maliyet mantığı
Bu sistemde her mağazaya ayrı server verilmez. Sabit altyapı bütün tenantlar arasında paylaşılır. Bu nedenle mağaza başı maliyet tenant sayısı arttıkça düşer. AI, SMS, WhatsApp, ödeme komisyonu, e-fatura ve yüksek trafik gibi kalemler değişken kullanım maliyetidir.

## Production topolojisi notu
Pilot/dev için PostgreSQL+Redis tek serverda çalıştırılabilir; gerçek ödeme alan production sisteminde app ve DB'yi ayrı tutmak önerilir. Redis'in managed olması operasyon yükünü azaltır. Trafik büyüyünce app node yatay ölçeklenir, PostgreSQL için replica/PITR ve Redis HA seviyesi yükseltilir.

## 2026-09-19 yaklaşık sabit aylık maliyet

Hesapta kullanılan yaklaşık kur: 1 EUR = 55.9706 TRY, 1 USD = 48.767 TRY.

| Kalem | Liste fiyatı | Yaklaşık TRY |
|---|---:|---:|
| App/API server — Hetzner CPX22 | €19.49 | ₺1,091 |
| PostgreSQL server — Hetzner CPX22 | €19.49 | ₺1,091 |
| Hetzner Backup (iki server toplam, +%20) | €7.80 | ₺436 |
| Upstash Redis Fixed 250MB | $10 | ₺488 |
| Resend Pro 50K email | $20 | ₺975 |
| Cloudflare R2 düşük kullanım | çoğunlukla free tier | ~₺0 başlangıç |
| Cloudflare Free / SaaS hostname | başlangıçta Free mümkün | ~₺0 |

**Lean production sabit taban:** yaklaşık **₺4,100/ay** + vergi/IPv4/değişken kullanım.

Cloudflare Pro aylık ödeme ile eklenirse yaklaşık $25 / ₺1,219 daha eklenir ve sabit taban yaklaşık **₺5,300/ay** olur.

## Tenant başına sabit maliyet payı örneği

Lean production tabanı (~₺4,100/ay) üzerinden, değişken kullanım hariç:

| Aktif tenant | Sabit altyapı payı / tenant |
|---:|---:|
| 1 | ~₺4,100 |
| 10 | ~₺410 |
| 25 | ~₺164 |
| 50 | ~₺82 |
| 100 | ~₺41 |

Bunlar muhasebe amaçlı kesin birim maliyet değildir. Trafik, DB boyutu, e-posta, medya, Redis command sayısı, AI, SMS/WhatsApp, ödeme gateway komisyonları ve e-fatura gibi değişkenler ayrıca eklenir.

## Mağaza başı pratik bütçe

25–50 normal trafikli tenant sonrasında, sabit altyapı payı + makul medya/cache/e-posta payı için **~₺150–₺350 / mağaza / ay** iç teknik altyapı bütçesi ayırmak mantıklıdır. Çok yüksek trafik, çok büyük medya kataloğu veya yoğun AI/mesajlaşma bu rakamı ayrı ölçeklendirir.
