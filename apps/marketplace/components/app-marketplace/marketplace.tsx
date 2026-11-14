'use client';
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';

export const API='https://commerce-api-ynhobkprgq-ew.a.run.app/v1';
const SSO='https://login.ticarti.com/api/v1/merchant-auth';
const AppDetailContext=createContext<((app:AppItem)=>void)|null>(null);
export type AppItem={
 id:string;slug:string;name:string;category:string;categoryId?:string;summary?:string|null;description?:string|null;
 developer?:string|null;logoUrl?:string|null;icon?:string|null;basePrice?:number|string|null;
 currency?:string|null;billingType?:string|null;isFeatured?:boolean;downloadCount?:number;
 createdAt?:string;updatedAt?:string;screenshots?:string[];languages?:string[];usageGuide?:string;version?:string;
};
type Store={tenantId:string;tenantName?:string;site?:{name?:string;publicSlug?:string;domain?:string|null}};
type Session={authenticated?:boolean;memberships?:Store[];user?:{name?:string;email?:string}};
type InstallInfo={slug:string;installed:boolean;installStatus?:string;enabled?:boolean;included?:boolean;price?:number;currency?:string;billingType?:string};
const date=(v?:string)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('tr-TR',{year:'numeric',month:'long',day:'numeric'}).format(d)};
export {date};
export function price(app:AppItem,install?:InstallInfo){
 const value=Number(install?.price??app.basePrice??0),currency=install?.currency||app.currency||'TRY';
 if(install?.included)return 'Pakete dahil';
 if(!value)return 'Ücretsiz';
 try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency,maximumFractionDigits:2}).format(value)+(String(install?.billingType||app.billingType)==='MONTHLY'?'/ay':String(install?.billingType||app.billingType)==='YEARLY'?'/yıl':'')}catch{return value+' '+currency}
}
function storeUrl(store?:Store,path='/admin/plugins/store'){
 const slug=String(store?.site?.publicSlug||'');
 return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)?'https://'+slug+'.ticarti.com'+path:'https://login.ticarti.com/';
}
export function useMarketplace(){
 const[apps,setApps]=useState<AppItem[]>([]);
 const[session,setSession]=useState<Session|null>(null);
 const[tenant,setTenant]=useState('');
 const[installations,setInstallations]=useState<Record<string,InstallInfo>>({});
 const[installationsReady,setInstallationsReady]=useState(false);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState('');
 const[actionError,setActionError]=useState('');
 const[notice,setNotice]=useState('');
 const fetchSession=useCallback(async()=>{
   try{
     const r=await fetch(SSO+'/session',{credentials:'include',cache:'no-store',headers:{'x-auth-client':'merchant-landing'}});
     if(!r.ok){setSession(null);return}
     const j=await r.json() as Session;
     setSession(j.authenticated?j:null);
     if(j.authenticated&&Array.isArray(j.memberships))setTenant(old=>{const requested=new URLSearchParams(window.location.search).get('tenantId');return old&&j.memberships!.some(x=>x.tenantId===old)?old:requested&&j.memberships!.some(x=>x.tenantId===requested)?requested:j.memberships![0]?.tenantId||''});
   }catch{setSession(null)}
 },[]);
 useEffect(()=>{let alive=true;(async()=>{try{
  const r=await fetch(API+'/platform/apps',{cache:'no-store'});if(!r.ok)throw new Error('Uygulamalar yüklenemedi');
  const data=await r.json();if(alive)setApps(Array.isArray(data)?data:[]);
 }catch(e:any){if(alive)setError(e.message||'Uygulamalar yüklenemedi')}finally{if(alive)setLoading(false)}})();
 void fetchSession();return()=>{alive=false}},[fetchSession]);
 const refresh=useCallback(async()=>{
  if(!session?.authenticated||!tenant){setInstallations({});setInstallationsReady(false);return}
  setInstallationsReady(false);
  try{
   const r=await fetch(SSO+'/marketplace/store?tenantId='+encodeURIComponent(tenant),{credentials:'include',cache:'no-store',headers:{'x-auth-client':'merchant-landing'}});
   if(!r.ok){setInstallations({});return}
   const data=await r.json();
   setInstallations(Object.fromEntries((Array.isArray(data.items)?data.items:[]).map((a:InstallInfo)=>[a.slug,a])));
   setInstallationsReady(true);
  }catch{setInstallations({})}
 },[session?.authenticated,tenant]);
 useEffect(()=>{void refresh()},[refresh]);
 const selectedStore=session?.memberships?.find(m=>m.tenantId===tenant)||session?.memberships?.[0];
 const install=useCallback(async(app:AppItem)=>{
  setActionError('');setNotice('');
  if(!session?.authenticated){window.location.href='https://login.ticarti.com/?returnTo='+encodeURIComponent('https://apps.ticarti.com/'+encodeURIComponent(app.slug));return}
  if(!tenant){setActionError('Kurulum için bir mağaza seç.');return}
  setBusy(app.slug);
  try{
   const r=await fetch(SSO+'/marketplace/'+encodeURIComponent(app.slug)+'/install?tenantId='+encodeURIComponent(tenant),{
    method:'POST',credentials:'include',headers:{'x-auth-client':'merchant-landing','content-type':'application/json'},body:'{}'
   });
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Kurulum tamamlanamadı');
   if(data.paymentRequired){
    if(typeof data.checkoutUrl==='string'&&data.checkoutUrl.startsWith('https://')){window.location.assign(data.checkoutUrl);return}
    throw new Error('Bu ücretli uygulama için ödeme bağlantısı henüz yapılandırılmamış.');
   }
   await refresh();setNotice(app.name+' uygulaması mağazana eklendi.');
  }catch(e:any){setActionError(e.message||'Uygulama yüklenemedi')}finally{setBusy('')}
 },[session?.authenticated,tenant,refresh]);
 return {apps,session,tenant,setTenant,selectedStore,installations,installationsReady,loading,error,busy,actionError,notice,install,refresh};
}
export type Market=ReturnType<typeof useMarketplace>;
export function AppBadge({app}:{app:AppItem}){
 const logo=String(app.logoUrl||'');
 return <span className="am-app-icon">{logo.startsWith('https://')||logo.startsWith('/')?<img src={logo} alt="" loading="lazy"/>:<span>{(app.name||'T').slice(0,1).toLocaleUpperCase('tr-TR')}</span>}</span>;
}
export function Action({app,market,full=false}:{app:AppItem;market:Market;full?:boolean}){
 const info=market.installations[app.slug];
 const url=storeUrl(market.selectedStore,'/admin/extensions/installed/'+encodeURIComponent(app.slug));
 if(info?.installed)return <a className={'am-button am-button-outline'+(full?' am-button-wide':'')} href={url}>Ayarla</a>;
 if(!market.session?.authenticated)return <a className={'am-button am-button-primary'+(full?' am-button-wide':'')} href={'https://login.ticarti.com/?returnTo='+encodeURIComponent('https://apps.ticarti.com/'+app.slug)}>Giriş yap</a>;
 if(!market.installationsReady)return <button className={'am-button am-button-primary'+(full?' am-button-wide':'')} disabled>Kurulum durumu kontrol edilemedi</button>;
 return <button className={'am-button am-button-primary'+(full?' am-button-wide':'')} disabled={market.busy===app.slug} onClick={()=>void market.install(app)}>{market.busy===app.slug?'Yükleniyor…':'Yükle'}</button>;
}
export function MarketplaceShell({children,market}:{children:ReactNode;market:Market}){
 const [detail,setDetail]=useState<AppItem|null>(null);
 const [shot,setShot]=useState('');
 const close=useCallback(()=>{setDetail(null);setShot('')},[]);
 useEffect(()=>{
  if(!detail)return;
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',key);
  return()=>document.removeEventListener('keydown',key);
 },[detail,close]);
 const related=detail?market.apps.filter(app=>app.slug!==detail.slug&&(app.categoryId&&app.categoryId===detail.categoryId||app.category===detail.category)).slice(0,4):[];
 const shots=detail?(Array.isArray(detail.screenshots)?detail.screenshots.filter(src=>typeof src==='string'&&/^(https:\/\/|\/)/.test(src)):[]):[];
 return <AppDetailContext.Provider value={setDetail}>
 <div className="ticarti-app-site am-shell">
  <main className="am-main">
   {market.actionError?<p className="am-alert am-alert-error" role="alert">{market.actionError}</p>:null}
   {market.notice?<p className="am-alert" role="status">{market.notice}</p>:null}
   {children}
  </main>
  {detail?<div className="am-app-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
    <section role="dialog" aria-modal="true" aria-label={detail.name+' uygulama detayları'} className="am-app-modal">
     <header className="am-app-modal-head">
      <div className="am-card-heading"><AppBadge app={detail}/><div className="am-card-heading-text"><h2>{detail.name}</h2><span>{detail.developer||'Ticarti'} · {detail.category}</span></div></div>
      <button type="button" className="am-app-modal-close" aria-label="Kapat" onClick={close}>×</button>
     </header>
     <div className="am-app-modal-body">
      <div className="am-app-modal-main">
       {shots.length?<section className="am-app-modal-section"><h3>Ekran görüntüleri</h3><div className="am-screenshots">{shots.map((src,i)=><button type="button" key={src+i} onClick={()=>setShot(src)}><img src={src} alt={detail.name+' ekran görüntüsü '+(i+1)} loading="lazy"/></button>)}</div></section>:null}
       <section className="am-app-modal-section"><h3>Uygulama hakkında</h3><div className="am-description">{String(detail.description||detail.summary||'Açıklama henüz eklenmedi.').split(/\n+/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div></section>
       {detail.usageGuide?<section className="am-app-modal-section"><h3>Nasıl kullanılır?</h3><div className="am-description">{detail.usageGuide.split(/\n+/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div></section>:null}
       {related.length?<section className="am-app-modal-section"><h3>Benzer uygulamalar</h3><div className="am-app-modal-related">{related.map(a=><button key={a.id} type="button" onClick={()=>{setDetail(a);setShot('')}}><AppBadge app={a}/><span>{a.name}</span><span aria-hidden="true">→</span></button>)}</div></section>:null}
      </div>
      <aside className="am-app-modal-aside">
       <div className="am-app-modal-price"><small>Uygulama fiyatı</small><strong>{price(detail,market.installations[detail.slug])}</strong><Action app={detail} market={market} full/></div>
       <dl>
        <dt>Geliştirici</dt><dd>{detail.developer||'Ticarti'}</dd>
        <dt>Kategori</dt><dd>{detail.category}</dd>
        <dt>Kurulum</dt><dd>{Number(detail.downloadCount||0).toLocaleString('tr-TR')}</dd>
        <dt>Yayın tarihi</dt><dd>{date(detail.createdAt)}</dd>
        <dt>Son güncelleme</dt><dd>{date(detail.updatedAt)}</dd>
        <dt>Sürüm</dt><dd>{detail.version||'—'}</dd>
        <dt>Desteklenen diller</dt><dd>{detail.languages?.length?detail.languages.join(', '):'Belirtilmemiş'}</dd>
       </dl>
      </aside>
     </div>
    </section>
   </div>:null}
   {shot?<div className="am-lightbox" role="dialog" aria-modal="true" aria-label="Ekran görüntüsü" onClick={()=>setShot('')}><button type="button" aria-label="Görseli kapat" onClick={()=>setShot('')}>×</button><img src={shot} alt="Uygulama ekran görüntüsü" onClick={e=>e.stopPropagation()}/></div>:null}
 </div>
 </AppDetailContext.Provider>;
}
export function AppCard({app,market}:{app:AppItem;market:Market}){
 const installed=market.installations[app.slug]?.installed;
 const openDetail=useContext(AppDetailContext);
 return <article className="am-card">
  <div className="am-card-heading">
   <button type="button" className="am-card-logo-link" onClick={()=>openDetail?.(app)} aria-label={app.name+' detayları'}><AppBadge app={app}/></button>
   <div className="am-card-heading-text">
    <button type="button" className="am-card-title-button" onClick={()=>openDetail?.(app)}><h3>{app.name}</h3></button>
    <span className="am-card-by">{app.developer||'Ticarti'}</span>
   </div>
   {installed?<span className="am-tag">Yüklü</span>:null}
  </div>
  <p className="am-card-desc">{app.summary||'Uygulama açıklaması henüz eklenmedi.'}</p>
  <div className="am-card-bottom">
   <span className="am-card-stat" title="Toplam kurulum">{Number(app.downloadCount||0).toLocaleString('tr-TR')} kurulum</span>
   <span className="am-card-price">{price(app,market.installations[app.slug])}</span>
  </div>
  <div className="am-card-link-row"><button type="button" className="am-card-inspect" onClick={()=>openDetail?.(app)}>İncele <span aria-hidden="true">→</span></button></div>
 </article>;
}
