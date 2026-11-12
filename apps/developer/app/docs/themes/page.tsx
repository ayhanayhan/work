export default function ThemeDocs(){
  return <main className="wrap"><div className="card">
    <h1>Ticarti Theme Platform</h1>
    <p>Ticarti Developer sitesi tema dosyası toplamaz ve tema satışı yapmak zorunda değildir. Bu bölüm yalnızca tema geliştiricilerinin uyumlu paket üretmesi için teknik dokümantasyondur.</p>

    <h2>Dağıtım modeli</h2>
    <p>Geliştirici temayı dilediği kanaldan satabilir veya paylaşabilir. Mağaza sahibi tema ZIP dosyasını kendi Ticarti yönetim panelindeki Temalar ekranından yükler. Ticarti Theme Store benzeri merkezi bir pazar yeri açılırsa, mağaza başvurusu ve inceleme akışı ayrıca etkinleştirilebilir.</p>

    <h2>Paket görselleri</h2>
    <pre>{`assets/icon.svg
assets/preview.webp
assets/screenshots/home.webp
assets/screenshots/product.webp`}</pre>

    <h2>Temel paket kuralları</h2>
    <ul>
      <li>Tema tek bir ZIP paketi olmalıdır.</li>
      <li>Manifest ve tema sürümü açıkça tanımlanmalıdır.</li>
      <li>Önizleme görseli ve tema ikonu eklenmelidir.</li>
      <li>Dosya yolları paket kökü dışına çıkamaz.</li>
      <li>İzin verilmeyen çalıştırılabilir dosyalar kabul edilmez.</li>
      <li>Tema performans bütçelerini aşmamalıdır.</li>
      <li>Mağaza verileri veya gizli anahtarlar tema paketine gömülmemelidir.</li>
    </ul>

    <h2>Geliştirme ve test</h2>
    <p>Temayı kendi geliştirme ortamınızda hazırlayın ve test mağazanızda, mağaza yönetim panelindeki tema yükleme akışı üzerinden kurun. Developer sitesine ZIP gönderilmez.</p>

    <h2>Yayın ve satış</h2>
    <p>Ticarti şu aşamada üçüncü taraf tema dosyalarını Developer sitesi üzerinden toplamaz. Geliştirici temasını kendi satış kanalından dağıtır; lisanslama ve ticari koşullar geliştirici ile müşteri arasındadır.</p>
  </div></main>
}
