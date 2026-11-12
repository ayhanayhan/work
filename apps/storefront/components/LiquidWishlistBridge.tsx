'use client';
import {useEffect} from 'react';
import {api,STORE,getCurrency,getLocale} from '../lib/api';
import {readSavedIds,writeSavedIds} from '../lib/product-lists';

// Bridges Shopify Liquid wishlist elements to TICARTI's single saved-product list.
// Theme HTML, CSS, and the built-in custom elements remain untouched.
export default function LiquidWishlistBridge(){
 useEffect(()=>{
  let alive=true;let token='';let busy=false;let currentUser='';let lastUser='';
  const nativeKey='productDataWishlist'; // TICARTI_WISHLIST_MEMBER_AUTH
  const importedKey=`ticarti:${location.hostname}:wishlist-theme-imported`;
  // Preserve favorites saved by the original Shopify theme before TICARTI was connected.
  if(!sessionStorage.getItem(importedKey)){
   try{const old=JSON.parse(sessionStorage.getItem(nativeKey)||localStorage.getItem(nativeKey)||'{}');localStorage.removeItem(nativeKey);if(old&&typeof old==='object'&&!Array.isArray(old)){
    const ids=Object.keys(old).filter(Boolean);if(ids.length)writeSavedIds('wishlist',[...readSavedIds('wishlist'),...ids]);
   }}catch{}
   sessionStorage.setItem(importedKey,'1');
  }
  const readMap=():Record<string,string>=>{try{const v=JSON.parse(sessionStorage.getItem(nativeKey)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}};
  const saveMap=(m:Record<string,string>)=>{if(Object.keys(m).length)sessionStorage.setItem(nativeKey,JSON.stringify(m));else sessionStorage.removeItem(nativeKey)};
  const syncState=()=>{
   const ids=new Set(readSavedIds('wishlist'));const old=readMap();const next:Record<string,string>={};
   for(const id of ids)next[id]=old[id]||document.querySelector<HTMLElement>(`wishlist-button[data-id="${CSS.escape(id)}"]`)?.getAttribute('data-product-handle')||'';
   saveMap(next);
   document.querySelectorAll<HTMLElement>('wishlist-button[data-id]').forEach(el=>{const on=ids.has(String(el.dataset.id));el.classList.toggle('active',on);el.setAttribute('aria-pressed',String(on))});
   document.querySelectorAll<HTMLElement>('wishlist-bubble').forEach(el=>{const count=el.firstElementChild;if(count)count.textContent=String(ids.size)});
  };
  // Suppress only Wokiee's original Shopify-only collection AJAX behavior.
  // Preserve all markup, settings, headings, grid classes and actual Liquid product cards.
  const wishlistPages=()=>{
    document.querySelectorAll<HTMLElement>('wishlist-page').forEach(old=>{
      const replacement=document.createElement('div');
      for(const a of Array.from(old.attributes))replacement.setAttribute(a.name,a.value);
      replacement.dataset.ticartiWishlistPage='1';
      while(old.firstChild)replacement.appendChild(old.firstChild);
      old.replaceWith(replacement);
    });
    return document.querySelectorAll<HTMLElement>('[data-ticarti-wishlist-page]');
  };
  let renderVersion=0;
  const wishlistRender=async()=>{
   const pages=wishlistPages();if(!pages.length)return;
   const version=++renderVersion;
   const ids=readSavedIds('wishlist');
   for(const page of pages){
    const empty=page.querySelector<HTMLElement>('.wishlist-is-empty');
    const main=page.querySelector<HTMLElement>('.wishlist-content');
    const grid=page.querySelector<HTMLElement>('.wishlist-ajax-content');
    empty?.classList.toggle('hide',ids.length>0);
    main?.classList.toggle('hide',ids.length===0);
    if(!grid)continue;
    if(!ids.length){grid.replaceChildren();continue}
    try{
     const result=await api(`/storefront/${encodeURIComponent(STORE)}/theme/wishlist-cards`,{
      method:'POST',body:JSON.stringify({ids,settings:page.dataset.settings||'',locale:getLocale(),currency:getCurrency()})
     });
     if(!alive||version!==renderVersion)return;
     // HTML is produced by the current installed theme's own Liquid product-card snippet.
     grid.innerHTML=String(result?.html||'');
     syncState();
    }catch(e){console.error('[Ticarti wishlist] theme card rendering',e)}
   }
  };
  const redraw=()=>{syncState();void wishlistRender()};
  const setSaved=(ids:string[])=>{writeSavedIds('wishlist',ids)};
  const toggle=async(id:string,handle:string)=>{
   if(!id||busy)return;busy=true;
   const before=readSavedIds('wishlist');const isAdding=!before.includes(id);
   const updated=isAdding?[...before,id]:before.filter(x=>x!==id);
   const map=readMap();if(isAdding)map[id]=handle;else delete map[id];saveMap(map);setSaved(updated);
   try{
    if(token){const result=await api(`/storefront/customer/wishlist/${encodeURIComponent(id)}`,{method:'POST',headers:{authorization:`Bearer ${token}`},body:'{}'});
     if(Boolean(result?.added)!==isAdding){ // server is authoritative; recover with a fresh read
      await refreshMember();
     }
    }
   }catch(err){console.error('[Ticarti wishlist] save',err);setSaved(before)}finally{busy=false}
  };
  const refreshMember=async()=>{
   if(!token)return;
   const rows=await api('/storefront/customer/wishlist',{headers:{authorization:`Bearer ${token}`}});
   const ids=(Array.isArray(rows)?rows:[]).map((x:any)=>String(x?.productId||x?.product?.id||'')).filter(Boolean);
   setSaved(ids);
  };
  const authenticate=async()=>{
   try{
    const session=await api('/storefront/customer/session',{credentials:'include'});
    if(!alive)return;
    if(!session?.authenticated||!session.accessToken){token='';currentUser='';if(lastUser){lastUser='';setSaved([])}redraw();return}
    token=String(session.accessToken);
    const user=await api('/storefront/customer/me',{headers:{authorization:`Bearer ${token}`}});
    if(!alive)return;
    currentUser=String(user?.id||user?.customer?.id||'');
    // Never merge a previous member's local cache into a different member account.
    const guestIds=lastUser&&lastUser!==currentUser?[]:readSavedIds('wishlist');lastUser=currentUser;
    try{
     const rows=await api('/storefront/customer/wishlist/merge',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({productIds:guestIds})});
     const ids=(Array.isArray(rows)?rows:[]).map((x:any)=>String(x?.productId||x?.product?.id||'')).filter(Boolean);
     setSaved(ids);
    }catch{await refreshMember()}
   }catch(e){console.warn('[Ticarti wishlist] session sync unavailable',e);redraw()}
  };
  const click=(e:MouseEvent)=>{
   const target=e.target as Element|null;const heart=target?.closest?.('wishlist-button[data-id]') as HTMLElement|null;
   if(!heart)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   void toggle(String(heart.dataset.id||''),String(heart.dataset.productHandle||''));
  };
  const updated=()=>{syncState();void wishlistRender()};
  document.addEventListener('click',click,true);
  window.addEventListener('ticarti:theme-content-updated',updated);
  window.addEventListener('focus',authenticate);
  window.addEventListener('ticarti-saved-list-change',updated);
  void authenticate();
  return()=>{alive=false;document.removeEventListener('click',click,true);window.removeEventListener('ticarti:theme-content-updated',updated);window.removeEventListener('focus',authenticate);window.removeEventListener('ticarti-saved-list-change',updated)};
 },[]);
 return null;
}
