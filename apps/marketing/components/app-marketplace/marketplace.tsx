'use client';
import {useCallback,useEffect,useState,type ReactNode} from 'react';

export const API='https://commerce-api-ynhobkprgq-ew.a.run.app/v1';
const SSO='https://login.ticarti.com/api/v1/merchant-auth';
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
  if(!session?.authenticated){window.location.href='https://login.ticarti.com/?returnTo='+encodeURIComponent('https://app.ticarti.com/'+encodeURIComponent(app.slug));return}
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
 const url=storeUrl(market.selectedStore,'/admin/extensions/my-apps?app='+encodeURIComponent(app.slug));
 if(info?.installed)return <a className={'am-button am-button-outline'+(full?' am-button-wide':'')} href={url}>Yönet</a>;
 if(!market.session?.authenticated)return <a className={'am-button am-button-primary'+(full?' am-button-wide':'')} href={'https://login.ticarti.com/?returnTo='+encodeURIComponent('https://app.ticarti.com/'+app.slug)}>Giriş yap</a>;
 if(!market.installationsReady)return <button className={'am-button am-button-primary'+(full?' am-button-wide':'')} disabled>Kurulum durumu kontrol edilemedi</button>;
 return <button className={'am-button am-button-primary'+(full?' am-button-wide':'')} disabled={market.busy===app.slug} onClick={()=>void market.install(app)}>{market.busy===app.slug?'Yükleniyor…':'Yükle'}</button>;
}
export function MarketplaceShell({children,market}:{children:ReactNode;market:Market}){
 return <div className="ticarti-app-site am-shell">
  <main className="am-main">
   {market.actionError?<p className="am-alert am-alert-error" role="alert">{market.actionError}</p>:null}
   {market.notice?<p className="am-alert" role="status">{market.notice}</p>:null}
   {children}
  </main>
 </div>;
}
export function AppCard({app,market}:{app:AppItem;market:Market}){
 const installed=market.installations[app.slug]?.installed;
 return <article className="am-card">
  <div className="am-card-heading">
   <a className="am-card-logo-link" href={'/'+encodeURIComponent(app.slug)} aria-label={app.name+' detayları'}><AppBadge app={app}/></a>
   <div className="am-card-heading-text">
    <a href={'/'+encodeURIComponent(app.slug)}><h3>{app.name}</h3></a>
    <span className="am-card-by">{app.developer||'Ticarti'}</span>
   </div>
   {installed?<span className="am-tag">Yüklü</span>:null}
  </div>
  <p className="am-card-desc">{app.summary||'Uygulama açıklaması henüz eklenmedi.'}</p>
  <div className="am-card-bottom">
   <span className="am-card-stat" title="Toplam kurulum">{Number(app.downloadCount||0).toLocaleString('tr-TR')} kurulum</span>
   <span className="am-card-price">{price(app,market.installations[app.slug])}</span>
  </div>
  <div className="am-card-link-row"><a href={'/'+encodeURIComponent(app.slug)} className="am-card-more">İncele <span aria-hidden="true">→</span></a><Action app={app} market={market}/></div>
 </article>;
}
