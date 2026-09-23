'use client';

import {useEffect,useState} from 'react';
import {api,getLocale,STORE} from '../../../lib/api';

export default function ContentPageClient({slug,locale}:{slug:string;locale?:string}){
  const[page,setPage]=useState<any>(null);const[error,setError]=useState('');
  const activeLocale=locale||getLocale();
  useEffect(()=>{let live=true;api(`/storefront/${STORE}/pages/${encodeURIComponent(slug)}?locale=${encodeURIComponent(activeLocale)}`).then(x=>{if(live)setPage(x)}).catch(e=>{if(live)setError(e?.message||'Sayfa bulunamadı')});return()=>{live=false}},[slug,activeLocale]);
  if(error)return <main className="page-width top-spacing-small"><div className="rte page-width--narrow"><h1>Sayfa bulunamadı</h1><p>{error}</p></div></main>;
  if(!page)return <main className="page-width top-spacing-small"><div className="storefront-loader" aria-label="Yükleniyor"/></main>;
  return <main className="page-width top-spacing-small"><article className="rte page-width--narrow">{page.imageUrl&&<img className="image-hover-box w-full mb30" src={page.imageUrl} alt=""/>}<h1>{page.title}</h1>{page.seoDescription&&<p className="body2 mt15">{page.seoDescription}</p>}<div className="rte body2 mt30">{String(page.body||'').split(/\n{2,}/).map((block:string,i:number)=>{const lines=block.split('\n');return <p key={i}>{lines.map((line:string,j:number)=><span key={j}>{line}{j<lines.length-1&&<br/>}</span>)}</p>})}</div></article></main>;
}
