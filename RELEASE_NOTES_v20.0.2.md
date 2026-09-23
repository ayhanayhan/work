# Ticarti v20.0.2 — App Hosting Lock File Düzeltmesi

v20.0.1 ve v20.0.0 özelliklerinin tamamını içerir.

Firebase App Hosting her `rootDir` uygulaması için kendi bağımlılık lock dosyasını zorunlu tutar. Aşağıdaki bağımsız ve doğrulanmış lock dosyaları eklendi:

- `apps/admin/package-lock.json`
- `apps/storefront/package-lock.json`
- `apps/superadmin/package-lock.json`

Admin uygulaması monorepodan ayrılmış temiz bir klasörde `npm ci` ve production build ile doğrulandı. 72 admin rotasının tamamı başarıyla üretildi ve standalone App Hosting manifesti oluşturuldu.
