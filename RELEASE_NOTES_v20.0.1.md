# Ticarti v20.0.1 — Firebase App Hosting Düzeltmesi

v20.0.0 özelliklerinin tamamını içerir.

## Düzeltilen hata

Firebase App Hosting her uygulamayı kendi `rootDir` klasöründen derler. v20.0.0 içindeki `prebuild` komutu monorepo kökündeki bir yardımcı dosyaya başvurduğu için uzak admin derlemesinde bu dosya bulunamıyordu. Aynı sorun sonraki storefront ve superadmin rolloutlarında da oluşacaktı.

Temizleme yardımcıları artık şu uygulamaların kendi kaynak klasörlerindedir:

- `apps/admin/scripts/clean-next-trace-stubs.mjs`
- `apps/storefront/scripts/clean-next-trace-stubs.mjs`
- `apps/superadmin/scripts/clean-next-trace-stubs.mjs`

Böylece hem yerel tekrarlı build hem de Firebase'in izole App Hosting build ortamı aynı komutla çalışır.
