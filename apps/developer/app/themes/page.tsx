export default function ThemesPage(){
  return <main className="wrap">
    <div className="top">
      <div>
        <h1>Tema Geliştirme</h1>
        <p className="muted">Ticarti temaları için format, sınırlar, güvenlik ve dağıtım rehberi.</p>
      </div>
      <div className="row"><a className="ghost" href="/docs/themes">Tema dokümantasyonu</a><a className="ghost" href="/guide">Geliştirici rehberi</a></div>
    </div>

    <section className="card">
      <h2>Tema nasıl dağıtılır?</h2>
      <p>Bir tema geliştiricisi temasını kendi sitesi, ajansı, mağazası veya tercih ettiği herhangi bir satış kanalı üzerinden dağıtabilir. Ticarti geliştirici portalına tema dosyası yüklemek gerekmez.</p>
      <p>Mağaza sahibi satın aldığı veya kendi geliştirdiği tema ZIP dosyasını kendi Ticarti yönetim panelindeki Temalar alanından yükler.</p>
    </section>

    <div className="grid">
      <section className="card">
        <h3>Paket standardı</h3>
        <p>ZIP yapısı, manifest, tema ayarları, bölümler, bloklar, görseller ve performans kurallarını inceleyin.</p>
        <a href="/docs/themes">Tema paket standardını aç</a>
      </section>
      <section className="card">
        <h3>Güvenlik ve kısıtlamalar</h3>
        <p>İzin verilen dosya türleri, boyut limitleri, güvenli Liquid/şablon kullanımı ve performans limitleri burada tanımlanır.</p>
        <a href="/docs/themes">Kısıtlamaları görüntüle</a>
      </section>
      <section className="card">
        <h3>Kurulum</h3>
        <p>Tema dosyasının kurulumu geliştirici portalından değil, mağaza sahibinin kendi yönetim panelinden yapılır.</p>
      </section>
    </div>
  </main>
}
