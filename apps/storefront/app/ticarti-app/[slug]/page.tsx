'use client';
import {useParams} from 'next/navigation';
import {useMemo,useState} from 'react';
import {Action,AppBadge,AppCard,MarketplaceShell,price,date,useMarketplace} from '../marketplace';

export default function AppDetail(){
 const market=useMarketplace();
 const route=useParams<{slug:string}>();
 const slug=decodeURIComponent(String(route?.slug||''));
 const app=market.apps.find(a=>a.slug===slug);
 const[preview,setPreview]=useState('');
 const similar=useMemo(()=>app?market.apps.filter(a=>a.slug!==app.slug&&(a.categoryId&&a.categoryId===app.categoryId||a.category===app.category)).slice(0,4):[],[market.apps,app]);
 if(market.loading)return <MarketplaceShell market={market}><div className="am-empty">Uygulama bilgileri yükleniyor…</div></MarketplaceShell>;
 if(!app)return <MarketplaceShell market={market}><section className="am-detail"><a className="am-back" href="/">← Uygulama mağazası</a><h1>Uygulama bulunamadı</h1><p>Aradığınız uygulama yayınlanmamış veya kaldırılmış olabilir.</p><a className="am-button am-button-primary" href="/">Uygulamaları keşfet</a></section></MarketplaceShell>;
 const screenshots=(Array.isArray(app.screenshots)?app.screenshots:[]).filter(s=>typeof s==='string'&&(s.startsWith('https://')||s.startsWith('/')));
 const languages=(Array.isArray(app.languages)?app.languages:[]).filter(Boolean);
 return <MarketplaceShell market={market}>
  <div className="am-detail"><a className="am-back" href="/">← Uygulamalara dön</a>
   <section className="am-detail-head">
    <div className="am-detail-intro"><AppBadge app={app}/><div><span className="am-detail-category">{app.category}</span><h1>{app.name}</h1><p>{app.summary}</p><span className="am-detail-developer">Geliştirici: <strong>{app.developer||'Ticarti'}</strong></span></div></div>
    <aside className="am-detail-cta"><span>Uygulama ücreti</span><strong>{price(app,market.installations[app.slug])}</strong><Action app={app} market={market} full/><small>{market.installations[app.slug]?.installed?'Uygulama mağazanıza yüklenmiş.':'Yükleme işleminde mağaza yetkileriniz kontrol edilir.'}</small></aside>
   </section>
   <div className="am-facts"><div><strong>{Number(app.downloadCount||0).toLocaleString('tr-TR')}</strong><span>Kurulum</span></div><div><strong>{date(app.createdAt)}</strong><span>Yayın tarihi</span></div><div><strong>{date(app.updatedAt)}</strong><span>Son güncelleme</span></div><div><strong>{app.version||'—'}</strong><span>Sürüm</span></div></div>
   <div className="am-detail-columns"><div className="am-detail-main">
    {screenshots.length?<section className="am-detail-section"><h2>Ekran görüntüleri</h2><div className="am-screenshots">{screenshots.map((src,i)=><button key={src+i} type="button" onClick={()=>setPreview(src)} aria-label={'Ekran görüntüsü '+(i+1)+' büyüt'}><img src={src} alt={app.name+' ekran görüntüsü '+(i+1)} loading="lazy"/></button>)}</div></section>:null}
    <section className="am-detail-section"><h2>Uygulama hakkında</h2><div className="am-description">{String(app.description||app.summary||'Açıklama henüz eklenmedi.').split(/\n+/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div></section>
    {app.usageGuide?<section className="am-detail-section"><h2>Nasıl kullanılır?</h2><div className="am-description">{app.usageGuide.split(/\n+/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div></section>:null}
   </div><aside className="am-detail-aside"><div className="am-side-panel"><h3>Uygulama bilgileri</h3><dl>
    <dt>Kategori</dt><dd>{app.category}</dd>
    <dt>Geliştirici</dt><dd>{app.developer||'Ticarti'}</dd>
    <dt>Desteklenen diller</dt><dd>{languages.length?languages.map(l=><span key={l} className="am-language">{l}</span>):'Belirtilmemiş'}</dd>
    <dt>Ücretlendirme</dt><dd>{price(app,market.installations[app.slug])}</dd>
    <dt>Son güncelleme</dt><dd>{date(app.updatedAt)}</dd>
   </dl></div></aside></div>
   {similar.length?<section className="am-section am-similar"><div className="am-section-title"><div><h2>Benzer uygulamalar</h2><p>{app.category} kategorisinden diğer uygulamalar.</p></div></div><div className="am-grid">{similar.map(item=><AppCard key={item.id} app={item} market={market}/>)}</div></section>:null}
  </div>
  {preview?<div className="am-lightbox" role="dialog" aria-modal="true" aria-label="Ekran görüntüsü" onClick={()=>setPreview('')}><button type="button" aria-label="Kapat" onClick={()=>setPreview('')}>×</button><img src={preview} alt={app.name+' ekran görüntüsü'} onClick={e=>e.stopPropagation()}/></div>:null}
 </MarketplaceShell>;
}
