# Ticarti V2 kaynak yapısı

`assets/css/style.css` mevcut ekranların birebir hesaplanan stilleri taranarak yeniden üretilmiştir. Kaynak doğruluğu için sayfalar `en/` altında bağımsız HTML olarak tutulur. `src/design-system/tokens.css` ortak tipografi ve renk değerlerini tanımlar.

Not: Bu sürümde mevcut HTML bölümlerinin tamamı henüz elle yeniden yazılmış değildir. Görünümü korumak için kullanılan bileşen DOM yapısına sadık kalınmıştır. JS davranışları hâlen mevcut sayfa modülleri üzerine kuruludur; üretim ortamına bağlanacak API'ler ayrı geliştirme gerektirir.
