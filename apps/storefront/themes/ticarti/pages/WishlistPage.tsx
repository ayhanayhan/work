'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import ProductCard from '../components/ProductCard';
import {api,STORE,getCurrency,getLocale} from '../../../lib/api';
import {readSavedIds,writeSavedIds} from '../../../lib/product-lists';

export default function WishlistPage(){
  const[items,setItems]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  async function load(){const ids=readSavedIds('wishlist');if(!ids.length){setItems([]);setLoading(false);return}setLoading(true);setError('');try{const r=await api(`/storefront/${STORE}/product-selection?ids=${encodeURIComponent(ids.join(','))}&currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`);setItems(Array.isArray(r?.items)?r.items:[])}catch(e:any){setError(e.message||'Favoriler yüklenemedi')}finally{setLoading(false)}}
  useEffect(()=>{void load();const h=()=>void load();window.addEventListener('ticarti-saved-list-change',h as any);window.addEventListener('currency-change',h);window.addEventListener('locale-change',h);return()=>{window.removeEventListener('ticarti-saved-list-change',h as any);window.removeEventListener('currency-change',h);window.removeEventListener('locale-change',h)}},[]);
  function clear(){writeSavedIds('wishlist',[])}
  return <main className="wok-customer-page page-width top-spacing-normal"><div className="wok-list-head"><div><span className="body3 text-uppercase">HESABIM</span><h1 className="mt8">Favorilerim</h1><p>Beğendiğiniz ürünleri burada saklayın ve daha sonra kolayca ulaşın.</p></div>{items.length>0&&<button className="btn btn--border" onClick={clear}>Favorileri temizle</button>}</div>{error&&<div className="error">{error}</div>}{loading?<div className="wok-empty-state">Yükleniyor…</div>:items.length?<div className="page-grid-4 page-grid-st-3 page-grid-sp-2 page-vertical-gap-40">{items.map(p=><ProductCard key={p.id} p={p} currency={p.displayCurrency||getCurrency()}/>)}</div>:<div className="wok-empty-state"><h2>Favori listeniz boş</h2><p>Ürün kartlarındaki kalp ikonuna dokunarak ürün ekleyebilirsiniz.</p><Link className="btn" href="/products">Alışverişe başla</Link></div>}</main>
}
