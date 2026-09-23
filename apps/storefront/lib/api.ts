export const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

function runtimeStoreKey(){
  const fallback=process.env.NEXT_PUBLIC_STORE_SLUG||'main';
  if(typeof window==='undefined')return fallback;
  const host=window.location.hostname.toLowerCase().replace(/\.$/,'');
  if(!host||host==='localhost'||host==='127.0.0.1'||host.endsWith('.hosted.app'))return fallback;
  if(host.endsWith('.ticarti.com'))return host.slice(0,-'.ticarti.com'.length).split('.')[0]||fallback;
  return host;
}
export const STORE=runtimeStoreKey();
export async function api(path:string,options:any={}){
  const isForm=typeof FormData!=='undefined'&&options.body instanceof FormData;
  const r=await fetch(API+path,{credentials:'include',...options,headers:{...(isForm?{}:{'content-type':'application/json'}),...(options.headers||{})}});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):j.message||'İşlem başarısız');return j;
}
export function money(n:any,currency='TRY',locale?:string){return new Intl.NumberFormat(locale||undefined,{style:'currency',currency}).format(Number(n||0))}
export function getCartToken(){if(typeof window==='undefined')return '';return localStorage.getItem('commerce-cart')||''}
export function setCartToken(t:string){localStorage.setItem('commerce-cart',t);window.dispatchEvent(new Event('cart-change'))}
export function getCurrency(){if(typeof window==='undefined')return 'TRY';return localStorage.getItem('commerce-currency')||'TRY'}
export function setCurrency(c:string){localStorage.setItem('commerce-currency',c);window.dispatchEvent(new CustomEvent('currency-change',{detail:c}))}
export function visitorId(){if(typeof window==='undefined')return '';let id=localStorage.getItem('commerce-visitor');if(!id){id=crypto.randomUUID();localStorage.setItem('commerce-visitor',id)}return id}
export function getLocale(){if(typeof window==='undefined')return 'tr-TR';return localStorage.getItem('commerce-locale')||'tr-TR'}
export function setLocale(l:string){localStorage.setItem('commerce-locale',l);window.dispatchEvent(new CustomEvent('locale-change',{detail:l}))}

export function mediaUrl(url:any,size='card',format='webp'){const raw=String(url||'');if(!raw)return '';if(!/\/v1\/media\/[^/?#]+\/content/.test(raw))return raw;try{const base=typeof window!=='undefined'?window.location.origin:'https://ticarti.com';const u=new URL(raw,base);u.searchParams.set('size',size);u.searchParams.set('format',format);return u.toString()}catch{return raw+(raw.includes('?')?'&':'?')+'size='+encodeURIComponent(size)+'&format='+encodeURIComponent(format)}}
export function track(event:string,detail:any={}){if(typeof window==='undefined')return;window.dispatchEvent(new CustomEvent('ticarti-analytics',{detail:{event,...detail}}))}
