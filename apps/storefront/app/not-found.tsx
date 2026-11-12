'use client';
import {useEffect} from 'react';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
function hostKey(){const h=location.hostname.toLowerCase();return h.endsWith('.ticarti.com')?h.slice(0,-'.ticarti.com'.length).split('.')[0]:h}
export default function NotFound(){useEffect(()=>{const body={path:location.pathname+location.search,referrer:document.referrer||''};void fetch(`${API}/storefront/${encodeURIComponent(hostKey())}/seo/not-found`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{})},[]);return <main style={{minHeight:'60vh',display:'grid',placeItems:'center',padding:'48px 20px'}}><div style={{textAlign:'center',maxWidth:520}}><div style={{fontSize:64,fontWeight:800}}>404</div><h1>Sayfa bulunamadı</h1><p>Aradığınız sayfa kaldırılmış veya adresi değişmiş olabilir.</p><a href="/" style={{display:'inline-block',marginTop:16}}>Ana sayfaya dön</a></div></main>}
