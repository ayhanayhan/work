'use client';

import { useMemo, useState } from 'react';

export type MarketplaceApp = {
  id: string;
  slug?: string;
  name: string;
  category?: string | null;
  summary?: string | null;
  developer?: string | null;
  basePrice?: string | number | null;
  currency?: string | null;
  isFeatured?: boolean;
};

function price(value: MarketplaceApp['basePrice'], currency?: string | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Ücretsiz / pakete göre';
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return amount.toLocaleString('tr-TR') + ' ' + (currency || 'TRY');
  }
}

export default function MarketplaceView({ apps, error }: { apps: MarketplaceApp[]; error: string | null }) {
  const [category, setCategory] = useState('Tümü');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(apps.map(x => x.category).filter((x): x is string => Boolean(x))))], [apps]);
  const visible = useMemo(() => apps.filter(app =>
    (category === 'Tümü' || app.category === category) &&
    [app.name, app.summary, app.developer, app.category].some(s => (s || '').toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')))
  ), [apps, category, query]);

  return <>
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="https://ticarti.com" aria-label="Ticarti">ticarti<span>.</span></a>
        <nav aria-label="Ana menü"><a href="https://ticarti.com">Ana Sayfa</a><span aria-current="page">Uygulamalar</span></nav>
        <a className="header-login" href="https://login.ticarti.com/">Giriş Yap</a>
      </div>
    </header>
    <main>
      <section className="hero">
        <div className="shell hero-inner">
          <p className="eyebrow">TİCARTİ UYGULAMA MAĞAZASI</p>
          <h1>Mağazanız için her şey <span>bir arada.</span></h1>
          <p className="hero-copy">Kargo, ödeme, pazaryeri, muhasebe ve pazarlama entegrasyonlarını keşfedin. Ticarti mağazanızın gücünü uygulamalarla artırın.</p>
          <a className="hero-link" href="https://login.ticarti.com/">Mağazanıza giriş yapın <span aria-hidden>↗</span></a>
        </div>
      </section>
      <section className="catalog shell" aria-labelledby="catalog-heading">
        <div className="catalog-heading"><div><p className="section-label">UYGULAMALAR</p><h2 id="catalog-heading">Uygulama kataloğu</h2></div><p className="catalog-count">{apps.length} uygulama</p></div>
        <div className="catalog-tools">
          <input aria-label="Uygulamalarda ara" type="search" placeholder="Uygulama veya entegrasyon ara..." value={query} onChange={e=>setQuery(e.target.value)}/>
          <div className="chips" aria-label="Kategoriler">{categories.map(name=><button type="button" aria-pressed={category===name} className={category===name?'active':''} key={name} onClick={()=>setCategory(name)}>{name}</button>)}</div>
        </div>
        {error ? <div className="empty" role="alert"><h3>Uygulamalar yüklenemedi</h3><p>{error}</p></div> :
          visible.length ? <div className="app-grid">{visible.map(app=><article className="app-card" key={app.id}><div className="app-top"><div className="app-logo" aria-hidden>{app.name.charAt(0).toLocaleUpperCase('tr')}</div>{app.isFeatured&&<span className="featured">Öne çıkan</span>}</div><div className="app-category">{app.category||'Entegrasyon'}</div><h3>{app.name}</h3><p>{app.summary||'Ticarti mağazanız için uygulama ve entegrasyon.'}</p><div className="app-bottom"><small>{app.developer||'Ticarti'}</small><strong>{price(app.basePrice,app.currency)}</strong></div></article>)}</div> :
          <div className="empty"><h3>{query||category!=='Tümü'?'Eşleşen uygulama bulunamadı':'Henüz yayınlanmış uygulama yok'}</h3><p>{query||category!=='Tümü'?'Farklı bir arama veya kategori deneyin.':'Yeni uygulamalar yayınlandığında burada listelenecek.'}</p></div>}
      </section>
    </main>
    <footer className="footer"><div className="shell foot-inner"><a className="brand" href="https://ticarti.com">ticarti<span>.</span></a><p>Ticaretin yeni hali.</p><div><a href="https://ticarti.com">Ticarti</a><a href="https://dev.ticarti.com">Geliştirici</a><a href="https://help.ticarti.com">Yardım</a></div><small>© {new Date().getFullYear()} Ticarti</small></div></footer>
  </>;
}
