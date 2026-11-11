'use client';
import {useEffect,useMemo,useState} from 'react';
import {AppCard,MarketplaceShell,useMarketplace} from './marketplace';

export default function AppMarketplace(){
 const market=useMarketplace();
 const[search,setSearch]=useState('');
 const[category,setCategory]=useState('Tümü');
 const[installedOnly,setInstalledOnly]=useState(false);
 const[sort,setSort]=useState('featured');
 useEffect(()=>{const next=new URLSearchParams(window.location.search).get('sort');if(next==='newest'||next==='popular')setSort(next)},[]);
 const categories=useMemo(()=>['Tümü',...Array.from(new Set(market.apps.map(a=>a.category).filter(Boolean))).slice(0,5)],[market.apps]);
 const iconApps=useMemo(()=>market.apps.filter(a=>a.isFeatured).concat(market.apps.filter(a=>!a.isFeatured)).slice(0,9),[market.apps]);
 const filtered=useMemo(()=>{
  const q=search.trim().toLocaleLowerCase('tr-TR');
  const rows=market.apps.filter(a=>(category==='Tümü'||a.category===category)&&(!installedOnly||market.installations[a.slug]?.installed)&&
   (!q||[a.name,a.developer,a.category,a.summary,a.description].join(' ').toLocaleLowerCase('tr-TR').includes(q)));
  return rows.sort((a,b)=>sort==='popular'?(Number(b.downloadCount||0)-Number(a.downloadCount||0)):
    sort==='newest'?(new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime()):
    Number(!!b.isFeatured)-Number(!!a.isFeatured)||Number(b.downloadCount||0)-Number(a.downloadCount||0));
 },[market.apps,market.installations,search,category,installedOnly,sort]);
 const newest=useMemo(()=>[...market.apps].sort((a,b)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime()).slice(0,4),[market.apps]);
 const popular=useMemo(()=>[...market.apps].sort((a,b)=>Number(b.downloadCount||0)-Number(a.downloadCount||0)).slice(0,4),[market.apps]);
 return <MarketplaceShell market={market}>
  <section className="am-hero">
   <div className="am-hero-ornament" aria-hidden="true">
    <div className="am-hero-ornament-line"/>
    <div className="am-hero-icon-rail">
     {iconApps.map(app=><span className="am-hero-icon" key={app.id} title={app.name}>{app.logoUrl&&/^(https:\/\/|\/)/.test(app.logoUrl)?<img src={app.logoUrl} alt=""/>:<span className="am-hero-icon-fallback">{app.name.slice(0,1).toLocaleUpperCase("tr-TR")}</span>}</span>)}
    </div>
   </div>
   <div className="am-hero-copy">
    <h1>Mağazanızı güçlendiren uygulamalar</h1>
    <p>Kargo, pazarlama, ödeme, muhasebe ve daha fazlası. İhtiyacınız olan uygulamaları keşfedin, mağazanıza ekleyin ve tek yerden yönetin.</p>
   </div>
   <label className="am-search am-hero-search"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Uygulama veya kategori ara" aria-label="Uygulama ara"/></label>
   <div className="am-hero-category-row" aria-label="Popüler kategoriler">
    {categories.map(c=><button key={c} type="button" className={category===c?'selected':''} aria-pressed={category===c} onClick={()=>{setCategory(c);document.getElementById('uygulamalar')?.scrollIntoView({behavior:'smooth',block:'start'})}}>{c}</button>)}
    <a href="/kategoriler">Tüm kategoriler →</a>
   </div>
  </section>
  <section className="am-section am-catalog" id="uygulamalar">
   <div className="am-section-title"><div><h2>Öne çıkan uygulamalar</h2><p>Mağazanızın ihtiyaçlarına uygun çözümleri bulun.</p><a className="am-text-link" href="/kategoriler">Tüm kategorileri ve uygulamaları gör →</a></div><div className="am-catalog-controls"><label className="am-sort-label">Sıralama <select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Öne çıkanlar</option><option value="newest">Son eklenenler</option><option value="popular">En çok indirilenler</option></select></label></div></div>
   {market.session?.authenticated?<label className="am-installed-toggle"><input type="checkbox" checked={installedOnly} onChange={e=>setInstalledOnly(e.target.checked)}/> Yalnızca mağazama yüklediklerim</label>:null}
   {market.loading?<div className="am-empty">Uygulamalar yükleniyor…</div>:market.error?<div role="alert" className="am-empty am-error">{market.error}</div>:filtered.length?<div className="am-grid">{filtered.slice(0,6).map(app=><AppCard key={app.id} app={app} market={market}/>)}</div>:<div className="am-empty">Aramanızla eşleşen uygulama bulunamadı. <button type="button" onClick={()=>{setSearch('');setCategory('Tümü');setInstalledOnly(false)}}>Filtreleri temizle</button></div>}
  </section>
  {!search&&!installedOnly&&market.apps.length>4?<><section className="am-section"><div className="am-section-title"><div><h2>En çok indirilenler</h2><p>Mağazaların en çok tercih ettiği uygulamalar.</p></div><a className="am-text-link" href="/kategoriler?sort=popular">Tümünü gör →</a></div><div className="am-grid">{popular.map(a=><AppCard key={a.id} app={a} market={market}/>)}</div></section>
   <section className="am-section"><div className="am-section-title"><div><h2>Son eklenenler</h2><p>Ticarti uygulama mağazasına yeni katılanlar.</p></div><a className="am-text-link" href="/kategoriler?sort=newest">Tümünü gör →</a></div><div className="am-grid">{newest.map(a=><AppCard key={a.id} app={a} market={market}/>)}</div></section></>:null}
 </MarketplaceShell>;
}
