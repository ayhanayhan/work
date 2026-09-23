'use client';

import {useEffect,useMemo,useState} from 'react';
import PlatformAccount from '../components/PlatformAccount';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

type AppItem={id:string;slug:string;name:string;category:string;summary?:string|null;developer?:string|null;basePrice?:string|number|null;currency?:string|null;billingType?:string|null;isFeatured?:boolean};

function money(value:any,currency='TRY'){
  const n=Number(value||0);
  if(!n)return 'Ücretsiz / pakete göre';
  return new Intl.NumberFormat('tr-TR',{style:'currency',currency,maximumFractionDigits:0}).format(n);
}

export default function TicartiAppMarketplace(){
  const[items,setItems]=useState<AppItem[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[category,setCategory]=useState('Tümü');
  useEffect(()=>{void(async()=>{try{const r=await fetch(API+'/platform/apps',{cache:'no-store'});const j=await r.json().catch(()=>[]);if(!r.ok)throw new Error(j?.message||'Uygulamalar yüklenemedi.');setItems(Array.isArray(j)?j:[])}catch(e:any){setError(e?.message||'Uygulamalar yüklenemedi.')}finally{setLoading(false)}})()},[]);
  const categories=useMemo(()=>['Tümü',...Array.from(new Set(items.map(x=>x.category).filter(Boolean)))],[items]);
  const visible=category==='Tümü'?items:items.filter(x=>x.category===category);
  return <div className="ticarti-app-site">
    <header className="ticarti-nav"><a className="ticarti-logo" href="https://ticarti.com">ticarti<span>.</span></a><nav><a href="https://ticarti.com">Ana Sayfa</a><a href="https://ticarti.com/paketler">Paketler</a><b>Uygulamalar</b></nav><div className="ticarti-nav-actions"><PlatformAccount label="Mağaza Girişi"/><a className="ticarti-btn primary" href="https://ticarti.com/ucretsiz-dene">Ücretsiz Dene</a></div></header>
    <main>
      <section className="ticarti-app-hero"><div><span>APP.TICARTI.COM</span><h1>Ticarti Uygulama Mağazası</h1><p>Pazaryeri, kargo, ödeme, muhasebe, pazarlama ve AI uygulamalarıyla mağazanızın yeteneklerini genişletin.</p></div><a className="ticarti-btn primary large" href="https://login.ticarti.com/">Mağazanıza giriş yapın</a></section>
      <section className="ticarti-app-market">
        <div className="ticarti-app-categories">{categories.map(x=><button key={x} className={category===x?'active':''} onClick={()=>setCategory(x)}>{x}</button>)}</div>
        {loading?<div className="ticarti-app-state">Uygulamalar yükleniyor…</div>:error?<div className="ticarti-app-state error">{error}</div>:<div className="ticarti-app-grid">{visible.map(app=><article key={app.id} className={app.isFeatured?'featured':''}><div className="ticarti-app-icon">{app.name.slice(0,1).toUpperCase()}</div><div className="ticarti-app-card-head"><span>{app.category}</span>{app.isFeatured&&<em>Öne çıkan</em>}</div><h2>{app.name}</h2><p>{app.summary||'Ticarti mağazanız için uygulama ve entegrasyon.'}</p><div className="ticarti-app-card-foot"><small>{app.developer||'Ticarti'}</small><b>{money(app.basePrice,app.currency||'TRY')}</b></div></article>)}</div>}
      </section>
    </main>
    <footer className="ticarti-footer"><a className="ticarti-logo" href="https://ticarti.com">ticarti<span>.</span></a><p>Mağazanız için uygulamalar ve entegrasyonlar.</p><div><a href="https://ticarti.com">ticarti.com</a><a href="https://login.ticarti.com/">Giriş</a></div><small>© {new Date().getFullYear()} Ticarti. Tüm hakları saklıdır.</small></footer>
  </div>
}
