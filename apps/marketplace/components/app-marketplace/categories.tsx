'use client';
import {useEffect,useMemo,useState} from 'react';
import {AppCard,MarketplaceShell,useMarketplace} from './marketplace';

export default function AppCategories({initialCategory='Tümü'}:{initialCategory?:string}){
 const market=useMarketplace();
 const[category,setCategory]=useState(initialCategory);
 const[sort,setSort]=useState('featured');
 const[search,setSearch]=useState('');
 const[freeOnly,setFreeOnly]=useState(false);
 useEffect(()=>{
  const qs=new URLSearchParams(window.location.search);
  const s=qs.get('sort');if(s==='newest'||s==='popular')setSort(s);
  const c=qs.get('category');if(c)setCategory(c);
  setFreeOnly(qs.get('free')==='1');
 },[]);
 const categories=useMemo(()=>['Tümü',...Array.from(new Set(market.apps.map(x=>x.category).filter(Boolean)))],[market.apps]);
 const filtered=useMemo(()=>{
  const q=search.trim().toLocaleLowerCase('tr-TR');
  const rows=market.apps.filter(app=>(category==='Tümü'||app.category===category)&&(!freeOnly||app.billingType==='FREE'||(app.basePrice!=null&&Number(app.basePrice)===0))&&
    (!q||[app.name,app.summary,app.developer,app.category].join(' ').toLocaleLowerCase('tr-TR').includes(q)));
  return rows.sort((a,b)=>sort==='popular'?Number(b.downloadCount||0)-Number(a.downloadCount||0):
    sort==='newest'?new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime():
    Number(!!b.isFeatured)-Number(!!a.isFeatured)||Number(b.downloadCount||0)-Number(a.downloadCount||0));
 },[market.apps,category,search,sort,freeOnly]);
 return <MarketplaceShell market={market}>
  <section className="am-category-page">
   <a href="/" className="am-back">← Uygulama mağazası</a>
   <h1>{category!=='Tümü'?category:freeOnly?'Ücretsiz uygulamalar':'Uygulama kategorileri'}</h1>
   <p className="am-category-description">Tüm uygulamaları kategorilerine göre inceleyin ve mağazanıza uygun olanları keşfedin.</p>
   <div className="am-category-toolbar">
    <label className="am-search"><input type="search" aria-label="Uygulama ara" placeholder="Uygulama ara..." value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <label className="am-sort-label">Sırala <select value={sort} onChange={e=>setSort(e.target.value)}>
     <option value="featured">Öne çıkanlar</option><option value="popular">En çok indirilenler</option><option value="newest">Son eklenenler</option>
    </select></label>
   </div>
   <div className="am-categories" role="group" aria-label="Uygulama kategorileri">
    {categories.map(name=><a key={name} aria-current={category===name?'page':undefined} className={category===name?'selected':''} href={name==='Tümü'?'/kategoriler':'/kategoriler/'+encodeURIComponent(name)}>
     {name} <span className="am-category-count">{name==='Tümü'?market.apps.length:market.apps.filter(app=>app.category===name).length}</span>
    </a>)}
   </div>
   <div className="am-category-result">{filtered.length} uygulama</div>
   {market.loading?<div className="am-empty">Uygulamalar yükleniyor…</div>:
     market.error?<div role="alert" className="am-empty am-error">{market.error}</div>:
     filtered.length?<div className="am-grid">{filtered.map(a=><AppCard key={a.id} app={a} market={market}/>)}</div>:
     <div className="am-empty">Bu kategoride uygulama bulunamadı.</div>}
  </section>
 </MarketplaceShell>;
}
