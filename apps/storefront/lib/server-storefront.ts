import {cache} from 'react';
import {headers} from 'next/headers';
import {ticartiPerfMeasure} from './storefront-perf';
export const apiOrigin=()=>String(process.env.API_ORIGIN||process.env.API_URL||process.env.NEXT_PUBLIC_API_URL||'https://dev.ticarti.com').replace(/\/v1\/?$/,'').replace(/\/$/,'');
export function cleanHost(v:string|null){return String(v||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
export function storeKey(h:string){return h.endsWith('.ticarti.com')?h.slice(0,-'.ticarti.com'.length).split('.')[0]:h}
export const requestHost=cache(async()=>{const h=await headers();return cleanHost(h.get('x-ticarti-tenant-host')||h.get('x-forwarded-host')||h.get('x-original-host')||h.get('host'))});
export const storefrontBoot=cache(async(host:string)=>{
  if(!host)return null;
  const started=performance.now();
  let status=0, bytes=0, outcome='error';
  try{
    const shellResponse=await fetch(`${apiOrigin()}/v1/storefront/${encodeURIComponent(storeKey(host))}/shell`,{cache:'no-store'});
    status=shellResponse.status;
    if(!shellResponse.ok){outcome='shell_http_error';return null;}
    const shellRaw=await shellResponse.text();
    bytes=Buffer.byteLength(shellRaw,'utf8');
    const shell=JSON.parse(shellRaw);
    if(String(shell?.theme?.config?.engine||'')==='ticarti-liquid-source'){
      outcome='shell_ok';return shell;
    }
    const r=await fetch(`${apiOrigin()}/v1/storefront/${encodeURIComponent(storeKey(host))}`,{next:{revalidate:120,tags:[`storefront:${storeKey(host)}`]}});
    status=r.status;
    if(!r.ok){outcome='http_error';return null;}
    const raw=await r.text();
    bytes=Buffer.byteLength(raw,'utf8');
    const data=JSON.parse(raw);
    outcome='ok';
    return data;
  }catch{
    outcome='exception';
    return null;
  }finally{
    ticartiPerfMeasure('bootstrap_api',performance.now()-started,{store:host,status,bytes,outcome});
  }
});
export const storefrontProduct=cache(async(host:string,slug:string,locale='')=>{try{const q=locale?`?locale=${encodeURIComponent(locale)}`:'';const r=await fetch(`${apiOrigin()}/v1/storefront/${encodeURIComponent(storeKey(host))}/products/${encodeURIComponent(slug)}${q}`,{next:{revalidate:120,tags:[`product:${storeKey(host)}:${slug}`]}});return r.ok?await r.json():null}catch{return null}});
export const storefrontArticle=cache(async(host:string,slug:string,locale='')=>{try{const q=locale?`?locale=${encodeURIComponent(locale)}`:'';const r=await fetch(`${apiOrigin()}/v1/storefront/${encodeURIComponent(storeKey(host))}/blog/posts/${encodeURIComponent(slug)}${q}`,{next:{revalidate:120,tags:[`article:${storeKey(host)}:${slug}`]}});return r.ok?await r.json():null}catch{return null}});
export function localePath(locale:string,defaultLocale:string,path:string){const a=String(locale||'').toLowerCase().split(/[-_]/)[0],b=String(defaultLocale||'').toLowerCase().split(/[-_]/)[0];return a&&a!==b?`/${a}${path}`:path}
