export const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

export class StorefrontApiError extends Error{
  status:number; code:string; payload:any;
  constructor(message:string,status:number,code:string,payload:any){super(message);this.name='StorefrontApiError';this.status=status;this.code=code;this.payload=payload}
}

const CART_TOKEN_KEY='commerce-cart';
const CART_META_KEY='commerce-cart-meta';
export const GUEST_CART_TTL_MS=24*60*60*1000;

type CartMeta={token:string;touchedAt:number;member?:boolean};
function readCartMeta():CartMeta|null{
  if(typeof window==='undefined')return null;
  try{const raw=localStorage.getItem(CART_META_KEY);if(!raw)return null;const x=JSON.parse(raw);return x&&typeof x==='object'?x:null}catch{return null}
}
function writeCartMeta(meta:CartMeta){if(typeof window==='undefined')return;try{localStorage.setItem(CART_META_KEY,JSON.stringify(meta))}catch{}}
export function clearCartToken(expected?:string){if(typeof window==='undefined')return;try{const current=localStorage.getItem(CART_TOKEN_KEY)||'';if(expected&&current&&current!==expected)return;localStorage.removeItem(CART_TOKEN_KEY);localStorage.removeItem(CART_META_KEY)}catch{}window.dispatchEvent(new Event('cart-change'))}
export function touchCartToken(member?:boolean){if(typeof window==='undefined')return;const token=localStorage.getItem(CART_TOKEN_KEY)||'';if(!token)return;const old=readCartMeta();writeCartMeta({token,touchedAt:Date.now(),member:member??old?.member??false})}
export function markCartMember(){touchCartToken(true)}
export function cartTokenIsStale(maxAge=GUEST_CART_TTL_MS){if(typeof window==='undefined')return false;const token=localStorage.getItem(CART_TOKEN_KEY)||'';if(!token)return false;const meta=readCartMeta();if(meta?.member)return false;if(!meta||meta.token!==token||!Number.isFinite(Number(meta.touchedAt)))return true;return Date.now()-Number(meta.touchedAt)>maxAge}
export function isCartUnavailableError(error:any){const code=String(error?.code||error?.payload?.code||'').toUpperCase();if(code==='CART_NOT_ACTIVE'||code==='CART_NOT_FOUND'||code==='CART_EXPIRED'||code==='CART_SUBMITTED')return true;const status=Number(error?.status||0);const m=String(error?.message||error||'').toLowerCase();return status===410||m.includes('cart is not active')||m.includes('cart not found')||m.includes('cart expired')||m.includes('cart has already been submitted')}


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
  const r=await fetch(API+path,{credentials:'include',...options,headers:{...(isForm?{}:{'content-type':'application/json'}),'x-ticarti-store-key':STORE,...(options.headers||{})}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const message=Array.isArray(j.message)?j.message.join(', '):j.message||'İşlem başarısız';throw new StorefrontApiError(message,r.status,String(j.code||j.errorCode||''),j)}
  if(typeof window!=='undefined'){const m=String(path).match(/\/storefront\/carts\/([^/?]+)/);if(m){try{const token=decodeURIComponent(m[1]);if(token===getCartToken())touchCartToken()}catch{}}}
  return j;
}
export function money(n:any,currency='TRY',locale?:string){return new Intl.NumberFormat(locale||undefined,{style:'currency',currency}).format(Number(n||0))}
export function getCartToken(){if(typeof window==='undefined')return '';return localStorage.getItem(CART_TOKEN_KEY)||''}
export function getAffiliateRef(){if(typeof window==='undefined')return '';try{const q=new URLSearchParams(window.location.search);const incoming=String(q.get('ref')||'').trim().toUpperCase();if(incoming){localStorage.setItem('commerce-affiliate-ref',incoming);return incoming}return localStorage.getItem('commerce-affiliate-ref')||''}catch{return ''}}
export function setCartToken(t:string){if(typeof window==='undefined')return;localStorage.setItem(CART_TOKEN_KEY,t);writeCartMeta({token:t,touchedAt:Date.now(),member:false});window.dispatchEvent(new Event('cart-change'))}
export function getDefaultCurrency(){
  if(typeof document==='undefined')return 'TRY';
  return document.documentElement.getAttribute('data-ticarti-default-currency')||'TRY';
}
export function getCurrency(){if(typeof window==='undefined')return 'TRY';return localStorage.getItem('commerce-currency')||getDefaultCurrency()}
export function setCurrency(c:string){localStorage.setItem('commerce-currency',c);window.dispatchEvent(new CustomEvent('currency-change',{detail:c}))}
export function visitorId(){if(typeof window==='undefined')return '';let id=localStorage.getItem('commerce-visitor');if(!id){id=crypto.randomUUID();localStorage.setItem('commerce-visitor',id)}return id}
// The configured default language owns prefix-free URLs. Browser preferences do not.
const localePrefix=/^\/(en|de|ru|pt|es|tr|ar|fr|it|nl|pl)(?=\/|$)/i;
function languageCode(value:any){return String(value||'').trim().toLowerCase().split(/[-_]/)[0]}
export function getDefaultLocale(){
  if(typeof document==='undefined')return 'tr-TR'; // SSR uses the store bootstrap, not this client helper.
  return document.documentElement.getAttribute('data-ticarti-default-locale')||document.documentElement.lang||'tr-TR';
}
export function getLocale(){
  if(typeof window==='undefined')return 'tr-TR'; // Server-rendered locale comes from the store bootstrap.
  const code=window.location.pathname.match(localePrefix)?.[1]?.toLowerCase();
  if(!code)return getDefaultLocale();
  return (document.documentElement.getAttribute('data-ticarti-full-locales')||'').split(',').find(x=>languageCode(x)===code)||code;
}
export async function switchLocale(locale:string){
  if(typeof window==='undefined')return;
  const code=languageCode(locale);
  const supported=document.documentElement.getAttribute('data-ticarti-locales');
  const codes=(supported||'').split(',').map(languageCode).filter(Boolean);
  if(!code||(codes.length?!codes.includes(code):!/^(tr|en|de|ru|pt|es|ar|fr|it|nl|pl)$/.test(code)))return;
  const pathname=window.location.pathname;
  const clean=pathname.replace(localePrefix,'')||'/';
  const fallback=(code===languageCode(getDefaultLocale())?'':`/${code}`)+clean;
  let next=fallback;
  try{
    const query=new URLSearchParams({path:pathname,locale:code});
    const response=await api(`/storefront/${encodeURIComponent(STORE)}/localized-path?${query}`);
    if(response?.path&&typeof response.path==='string'&&response.path.startsWith('/')&&!response.path.startsWith('//'))next=response.path;
  }catch{/* Safe fallback for non-content routes or a temporarily unavailable resolver. */}
  window.location.assign(next+window.location.search+window.location.hash);
}
export function setLocale(locale:string){void switchLocale(locale);}


export function mediaUrl(url:any,size='card',format='webp'){const raw=String(url||'');if(!raw)return '';if(!/\/v1\/media\/[^/?#]+\/content/.test(raw))return raw;try{const base=typeof window!=='undefined'?window.location.origin:'https://ticarti.com';const u=new URL(raw,base);u.searchParams.set('size',size);u.searchParams.set('format',format);return u.toString()}catch{return raw+(raw.includes('?')?'&':'?')+'size='+encodeURIComponent(size)+'&format='+encodeURIComponent(format)}}
export function track(event:string,detail:any={}){if(typeof window==='undefined')return;window.dispatchEvent(new CustomEvent('ticarti-analytics',{detail:{event,...detail}}))}
