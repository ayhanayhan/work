'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import ProductCard from '../components/ProductCard';
import {api,STORE,getCurrency,getLocale,sfText,readSavedIds,writeSavedIds} from '../../sdk/storefront';

export default function WishlistPage(){
  const locale=getLocale();const t=(k:string)=>sfText(k,locale);
  const[items,setItems]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[token,setToken]=useState('');
  async function guestItems(ids:string[]){if(!ids.length)return[];const r=await api(`/storefront/${STORE}/product-selection?ids=${encodeURIComponent(ids.join(','))}&currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`);return Array.isArray(r?.items)?r.items:[]}
  async function restoreAndMerge(){
    const localIds=readSavedIds('wishlist');
    try{
      const session=await api('/storefront/customer/session',{credentials:'include'});
      if(!session?.authenticated||!session?.accessToken)throw new Error('Oturum bulunamadı');
      if(session?.accessToken){
        setToken(session.accessToken);const h={authorization:`Bearer ${session.accessToken}`};
        const rows=await api('/storefront/customer/wishlist/merge',{method:'POST',headers:h,body:JSON.stringify({productIds:localIds})});
        const products=(Array.isArray(rows)?rows:[]).map((x:any)=>x.product).filter(Boolean);writeSavedIds('wishlist',products.map((p:any)=>p.id));setItems(products);return;
      }
    }catch{}
    setItems(await guestItems(localIds));
  }
  async function load(){setLoading(true);setError('');try{if(token){const rows=await api('/storefront/customer/wishlist',{headers:{authorization:`Bearer ${token}`}});const products=(Array.isArray(rows)?rows:[]).map((x:any)=>x.product).filter(Boolean);writeSavedIds('wishlist',products.map((p:any)=>p.id));setItems(products)}else await restoreAndMerge()}catch(e:any){setError(e.message||t('wishlist.loadFailed'))}finally{setLoading(false)}}
  useEffect(()=>{void load();const h=()=>void load();window.addEventListener('ticarti-saved-list-change',h as any);window.addEventListener('currency-change',h);window.addEventListener('locale-change',h);return()=>{window.removeEventListener('ticarti-saved-list-change',h as any);window.removeEventListener('currency-change',h);window.removeEventListener('locale-change',h)}},[token]);
  async function clear(){if(token){for(const p of items){try{await api(`/storefront/customer/wishlist/${encodeURIComponent(p.id)}`,{method:'POST',headers:{authorization:`Bearer ${token}`},body:'{}'})}catch{}}}writeSavedIds('wishlist',[]);setItems([])}
  return <main className="storefront-customer-page page-width top-spacing-normal"><div className="storefront-list-head"><div><span className="body3 text-uppercase">{t('wishlist.account')}</span><h1 className="mt8">{t('wishlist.title')}</h1><p>{t('wishlist.description')}</p></div>{items.length>0&&<button className="btn btn--border" onClick={()=>void clear()}>{t('wishlist.clear')}</button>}</div>{error&&<div className="error">{error}</div>}{loading?<div className="storefront-empty-state">{t('common.loading')}</div>:items.length?<div className="page-grid-4 page-grid-st-3 page-grid-sp-2 page-vertical-gap-40">{items.map(p=><ProductCard key={p.id} p={p} currency={p.displayCurrency||getCurrency()}/>)}</div>:<div className="storefront-empty-state"><h2>{t('wishlist.emptyTitle')}</h2><p>{t('wishlist.emptyHelp')}</p><Link className="btn" href="/products">{t('wishlist.shop')}</Link></div>}</main>
}
