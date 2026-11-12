'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {api,clearCartToken,getAffiliateRef,getCartToken,getCurrency,getLocale,isCartUnavailableError,setCartToken,setCurrency,setLocale,STORE} from '../lib/api';
import {usePathname, useRouter} from 'next/navigation';
import {createPortal} from 'react-dom';
import {CustomerVerifyEmailPage} from './CustomerRecoveryPages';
import {startSharedCheckout} from '../lib/checkout';
import LiquidWishlistBridge from './LiquidWishlistBridge';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

export default function LiquidThemeRuntime({boot,isPreview=false,initialThemeOnServer=false}:{boot:any;isPreview?:boolean;initialThemeOnServer?:boolean}){
  // TICARTI_V13_2_NAVIGATION
  const ticartiNavRouter=useRouter();
  const ticartiNavPathname=usePathname();
  // v16: short-lived, tab-local render prefetch. Never shared between users or tenants.
  // Experimental: opt-in only after validating the candidate Storefront.
  const v16PrefetchEnabled=process.env.NEXT_PUBLIC_TICARTI_LIQUID_PREFETCH==='true';
  const v16Prefetched=useRef<Map<string,{at:number;promise:Promise<string>}>>(new Map());
  const v16Url=(pathname:string)=>{
    const q=new URLSearchParams({path:pathname,currency:getCurrency(),locale:getLocale(),apiBase:API,origin:window.location.origin,previewToken:''});
    const cartToken=getCartToken();if(cartToken)q.set('cartToken',cartToken);
    return `${API}/storefront/${encodeURIComponent(STORE)}/theme/render?${q.toString()}`;
  };

  const[html,setHtml]=useState('');const[error,setError]=useState('');const[draft,setDraft]=useState<any>(null);const rootRef=useRef<HTMLDivElement|null>(null);
  const path=usePathname()||'/';
  const isVerifyEmail=path==='/verify-email';
  const [verifyMount,setVerifyMount]=useState<HTMLElement|null>(null);
  const isLiquid=String(boot?.theme?.config?.engine||boot?.theme?.config?.manifest?.engine||'')==='ticarti-liquid-source';
  // TICARTI_CART_CONTRACT_V2: re-use native checkout for imported Shopify cart forms.
  useEffect(()=>{
    if(!isLiquid)return;
    let active=false;
    const submit=(event:Event)=>{
      const form=event.target;
      if(!(form instanceof HTMLFormElement)||!['cart','CartDrawer-Form'].includes(form.id))return;
      const target=(event as SubmitEvent).submitter as HTMLElement|null;
      if(!target||target.getAttribute('name')!=='checkout'||(target as HTMLButtonElement).disabled)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(active)return;
      active=true;
      void startSharedCheckout().catch((err)=>{
        console.error('[Ticarti checkout]',err);
        const notice=document.createElement('p');
        notice.setAttribute('role','alert');
        notice.textContent=String(err?.message||'Ödeme başlatılamadı.');
        form.prepend(notice);
      }).finally(()=>{active=false});
    };
    document.addEventListener('submit',submit,true);
    return()=>document.removeEventListener('submit',submit,true);
  },[isLiquid]);

  // Keep the imported theme's original cart-drawer instance alive. The cart
  // bridge updates its inner HTML, not the custom element itself.
  useEffect(()=>{
    if(!isLiquid)return;
    let cancelled=false;
    let generation=0;
    const openDrawer=()=>{
      if(cancelled)return;
      const drawer=document.querySelector<HTMLElement>('cart-drawer');
      if(!drawer)return;
      const trigger=document.querySelector<HTMLElement>('#cart-icon-bubble-short, #cart-icon-bubble, #cart-icon-bubble--mobile-short, #cart-icon-bubble--mobile');
      const custom=drawer as HTMLElement & {open?:(trigger?:HTMLElement)=>void};
      if(typeof custom.open==='function')custom.open(trigger||undefined);
    };
    const openAfterAdd=()=>{
      const current=++generation;
      // cart-change is fired before cart-added; allow the async drawer refresh
      // to settle, without replacing theme nodes or redefining its JS.
      window.setTimeout(()=>{if(!cancelled&&current===generation)openDrawer()},350);
    };
    const clickHeader=(event:MouseEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const link=target.closest<HTMLElement>('#cart-icon-bubble-short, #cart-icon-bubble, #cart-icon-bubble--mobile-short, #cart-icon-bubble--mobile');
      if(!link||!document.querySelector('cart-drawer'))return;
      // Imported theme normally registers its own click callback. Intervene
      // only when it has not opened the drawer after the click has propagated.
      event.preventDefault();
      window.setTimeout(()=>{
        const drawer=document.querySelector<HTMLElement>('cart-drawer');
        if(drawer&&!drawer.classList.contains('active'))openDrawer();
      },40);
    };
    window.addEventListener('ticarti:cart-added',openAfterAdd);
    document.addEventListener('click',clickHeader);
    return()=>{cancelled=true;generation++;window.removeEventListener('ticarti:cart-added',openAfterAdd);document.removeEventListener('click',clickHeader)};
  },[isLiquid]);

  // Native cart adapter for Liquid product-form.js. Register before theme assets execute.
  useEffect(()=>{
    if(!isLiquid)return;
    const w=window as any;
    const previous=w.TicartiTheme;
    const previousCart=previous?.cart;
    let pending:Promise<any>|null=null;
    const add=async(input:{variantId:string;quantity:number})=>{
      if(!input?.variantId)throw new Error('Variant seçilemedi.');
      if(pending)return pending;
      const transaction=async()=>{
        for(let attempt=0;attempt<2;attempt++){
          let token=getCartToken();
          if(!token){
            const created=await api(`/storefront/${STORE}/carts`,{method:'POST',body:JSON.stringify({currency:getCurrency(),affiliateCode:getAffiliateRef()||undefined})});
            token=String(created?.token||'');
            if(!token)throw new Error('Sepet oluşturulamadı.');
            setCartToken(token);
          }
          try{
            const result=await api(`/storefront/carts/${encodeURIComponent(token)}/items`,{method:'POST',body:JSON.stringify({variantId:input.variantId,quantity:Math.max(1,Number(input.quantity)||1)})});
            window.dispatchEvent(new Event('cart-change'));
            window.dispatchEvent(new Event('ticarti:cart-added'));
            return result;
          }catch(error){
            if(attempt===0&&isCartUnavailableError(error)){clearCartToken(token);continue;}
            throw error;
          }
        }
      };
      pending=transaction();
      try{return await pending}finally{pending=null}
    };
    // Existing cart mutation endpoints are used by imported Liquid themes.
    const change=async(input:{line:number;quantity:number})=>{
      const token=getCartToken();
      if(!token)throw new Error('Sepet bulunamadı.');
      const line=Number(input?.line);
      const quantity=Number(input?.quantity);
      if(!Number.isInteger(line)||line<1||!Number.isInteger(quantity)||quantity<0)throw new Error('Geçersiz sepet satırı veya miktar.');
      const base=`/storefront/carts/${encodeURIComponent(token)}`;
      const current=await api(base);
      const items=Array.isArray(current?.items)?current.items:[];
      const item=items[line-1];
      if(!item?.id)throw new Error('Sepet satırı bulunamadı.');
      const updated=quantity===0
        ?await api(`${base}/items/${encodeURIComponent(String(item.id))}`,{method:'DELETE'})
        :await api(`${base}/items/${encodeURIComponent(String(item.id))}`,{method:'PATCH',body:JSON.stringify({quantity})});
      window.dispatchEvent(new Event('cart-change'));
      return updated;
    };
    const cart={...(previousCart||{}),add,change};
    w.TicartiTheme={...(previous||{}),cart};
    return()=>{if(w.TicartiTheme?.cart===cart){w.TicartiTheme={...w.TicartiTheme,cart:previousCart}}};
  },[isLiquid]);

  useEffect(()=>{
    if(!isLiquid||typeof window==='undefined'||localStorage.getItem('commerce-currency'))return;
    const code=String(boot?.store?.baseCurrency||boot?.store?.currency||'TRY').toUpperCase();
    if(/^[A-Z]{3}$/.test(code))setCurrency(code);
  },[isLiquid,boot?.store?.baseCurrency,boot?.store?.currency]);
  useEffect(()=>{
    if(!isLiquid)return;
    const change=async(event:Event)=>{
      const input=event.target;
      if(!(input instanceof HTMLSelectElement))return;
      if(input.matches('[data-ticarti-currency-select]')){
        const code=String(input.value||'').toUpperCase();
        if(!/^[A-Z]{3}$/.test(code)||!Array.from(input.options).some(o=>o.value===code))return;
        const token=getCartToken();
        if(token){
          try{
            const response=await fetch(`${API}/storefront/carts/${encodeURIComponent(token)}/currency`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({currency:code})});
            if(!response.ok)throw new Error('Cart currency change failed');
          }catch{input.value=getCurrency();return;}
        }
        setCurrency(code);window.dispatchEvent(new Event('cart-change'));
      }
      if(input.matches('[data-ticarti-language-select]')){
        const locale=String(input.value||'');
        if(locale&&Array.from(input.options).some(o=>o.value===locale)){
          if(!isPreview)setLocale(locale);
        }
      }
    };
    document.addEventListener('change',change);
    return()=>document.removeEventListener('change',change);
  },[isLiquid]);
  useEffect(()=>{
    if(!isLiquid||isPreview)return;
    const seen=new Set<string>();
    const excluded=/^\/(?:checkout|cart|account|orders|login|register|reset-password|forgot-password|returns|ticarti-|api)(?:\/|$)/i;
    const eligible=(target:EventTarget|null)=>{
      const anchor=target instanceof Element?target.closest<HTMLAnchorElement>('a[href]'):null;
      if(!anchor||!anchor.isConnected||anchor.hasAttribute('download')||anchor.hasAttribute('data-no-spa')||anchor.hasAttribute('data-ticarti-no-spa'))return null;
      if(anchor.target&&anchor.target!=='_self')return null;
      if(anchor.hasAttribute('onclick')||anchor.hasAttribute('data-action'))return null;
      const href=anchor.getAttribute('href')||'';
      if(!href||href.startsWith('#')||/^(?:javascript:|mailto:|tel:)/i.test(href))return null;
      let url:URL;try{url=new URL(href,window.location.href)}catch{return null}
      if(url.origin!==window.location.origin||excluded.test(url.pathname)||url.hash||url.searchParams.has('previewToken')||url.searchParams.has('theme')||url.searchParams.has('ticarti_design'))return null;
      if(url.pathname===window.location.pathname&&url.search===window.location.search)return null;
      return url.pathname+url.search;
    };
    const prefetch=(event:Event)=>{
      const href=eligible(event.target);
      if(!href||seen.has(href)||seen.size>=30)return;
      seen.add(href);
      ticartiNavRouter.prefetch(href);
      if(v16PrefetchEnabled && !isPreview && !window.location.search.includes('previewToken=')){
        const key=v16Url(href);
        const cache=v16Prefetched.current;
        const existing=cache.get(key);
        if(!existing || Date.now()-existing.at>8000){
          if(cache.size>=6){const oldest=cache.keys().next().value;if(oldest)cache.delete(oldest)}
          const promise=fetch(key,{credentials:'include',cache:'no-store',headers:{'cache-control':'no-store'}})
            .then(async r=>{if(!r.ok)throw new Error(`Prefetch HTTP ${r.status}`);const j=await r.json();return String(j?.html||'')})
            .catch(()=>{cache.delete(key);return ''});
          cache.set(key,{at:Date.now(),promise});
        }
      }
    };
    const navigate=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const href=eligible(event.target);
      if(!href)return;
      event.preventDefault();
      ticartiNavRouter.push(href);
    };
    document.addEventListener('pointerover',prefetch,{passive:true});
    document.addEventListener('focusin',prefetch);
    document.addEventListener('click',navigate);
    return()=>{
      document.removeEventListener('pointerover',prefetch);
      document.removeEventListener('focusin',prefetch);
      document.removeEventListener('click',navigate);
    };
  },[isLiquid,isPreview,ticartiNavRouter,v16PrefetchEnabled]);
  const previewThemeId=useMemo(()=>typeof window==='undefined'?'':String(new URLSearchParams(window.location.search).get('theme')||''),[]);
  useEffect(()=>{if(!isPreview)return;const h=(event:any)=>{const d=event?.detail;if(d?.kind==='runtime'&&d?.runtime)setDraft(d.runtime);if(d?.kind==='design'&&d?.design?.themeSettings?.general)setDraft((p:any)=>({...p,settingsCurrent:d.design.themeSettings.general}))};window.addEventListener('ticarti-design-draft',h as EventListener);return()=>window.removeEventListener('ticarti-design-draft',h as EventListener)},[isPreview]);
  const skipInitial=useRef(Boolean(initialThemeOnServer&&!isPreview));
  useEffect(()=>{if(!isLiquid)return;let live=true;const load=async()=>{try{setError('');const locale=getLocale(),currency=getCurrency(),cartToken=getCartToken(),previewToken=new URLSearchParams(window.location.search).get('previewToken')||'';let r:Response;if(isPreview&&draft){r=await fetch(`${API}/storefront/${encodeURIComponent(STORE)}/theme/render`,{method:'POST',cache:'no-store',headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({path:isVerifyEmail?'/login':window.location.pathname+window.location.search,currency,locale,themeId:previewThemeId||draft?.themeId||'',settingsCurrent:draft?.settingsCurrent||{},templates:draft?.templates||{},groups:draft?.groups||{},apiBase:API,origin:window.location.origin,previewToken})});}else{const v16Key=v16PrefetchEnabled&&!isVerifyEmail&&!previewThemeId&&!previewToken?v16Url(window.location.pathname+window.location.search):'';const v16Cached=v16Key?v16Prefetched.current.get(v16Key):undefined;let v16Html='';if(v16Cached){v16Prefetched.current.delete(v16Key);if(Date.now()-v16Cached.at<8000)v16Html=await v16Cached.promise;}if(v16Html){if(live){if(initialThemeOnServer){const host=document.querySelector<HTMLElement>('[data-ticarti-server-liquid]');if(host){host.innerHTML=v16Html;setHtml(v16Html)}else setHtml(v16Html)}else setHtml(v16Html)}return;}const q=new URLSearchParams({path:isVerifyEmail?'/login':window.location.pathname+window.location.search,currency,locale,apiBase:API,origin:window.location.origin,previewToken});if(previewThemeId)q.set('themeId',previewThemeId);if(previewToken)q.set('previewToken',previewToken);if(cartToken)q.set('cartToken',cartToken);q.set('_render',Date.now().toString());r=await fetch(`${API}/storefront/${encodeURIComponent(STORE)}/theme/render?${q.toString()}`,{credentials:'include',cache:'no-store',headers:{'cache-control':'no-store'}});}const raw=await r.text();let j:any={};try{j=raw?JSON.parse(raw):{}}catch{j={message:raw}}if(!r.ok)throw new Error(j?.message||`Tema render edilemedi (${r.status})`);if(live){const nextHtml=String(j?.html||'');if(initialThemeOnServer){const host=document.querySelector<HTMLElement>('[data-ticarti-server-liquid]');if(host){host.innerHTML=nextHtml;setHtml(nextHtml)}else setHtml(nextHtml)}else setHtml(nextHtml)}}catch(e:any){if(live)setError(e?.message||'Tema render edilemedi')}};if(skipInitial.current){skipInitial.current=false}else{void load()}const refresh=()=>{v16Prefetched.current.clear();void load()};
    // Cart mutations must not re-render the whole Liquid document: doing so
    // destroys the live cart-drawer web component and its open/scroll state.
    let cartRefreshGeneration=0;
    const refreshCart=async()=>{
      const sequence=++cartRefreshGeneration;
      const activeDrawer=document.querySelector<HTMLElement>('cart-drawer');
      const activeInner=activeDrawer?.querySelector<HTMLElement>('.drawer__inner');
      // Normal cart page is allowed to refresh via the regular runtime path.
      if(!activeDrawer||!activeInner){void load();return}
      try{
        const cartToken=getCartToken();
        const q=new URLSearchParams({path:window.location.pathname+window.location.search,currency:getCurrency(),locale:getLocale(),apiBase:API,origin:window.location.origin,previewToken:''});
        if(previewThemeId)q.set('themeId',previewThemeId);
        if(cartToken)q.set('cartToken',cartToken);
        q.set('_render',String(Date.now()));
        const response=await fetch(`${API}/storefront/${encodeURIComponent(STORE)}/theme/render?${q}`,{credentials:'include',cache:'no-store',headers:{'cache-control':'no-store'}});
        if(!response.ok)throw new Error(`Cart render failed (${response.status})`);
        const payload=await response.json();
        if(!live||sequence!==cartRefreshGeneration)return;
        const parsed=new DOMParser().parseFromString(String(payload?.html||''),'text/html');
        const updatedDrawer=parsed.querySelector<HTMLElement>('cart-drawer');
        const updatedInner=updatedDrawer?.querySelector<HTMLElement>('.drawer__inner');
        if(!updatedInner)throw new Error('Rendered cart drawer missing');
        const scrollTop=activeInner.scrollTop;
        const open=activeDrawer.classList.contains('active');
        // Retain outer custom element, event handlers, classes and overlay.
        // Only the Shopify drawer's contents reflect the new cart state.
        activeInner.innerHTML=updatedInner.innerHTML;
        activeInner.scrollTop=scrollTop;
        activeDrawer.classList.toggle('is-empty',updatedDrawer.classList.contains('is-empty'));
        if(open)activeDrawer.classList.add('active');
        for(const selector of ['#cart-icon-bubble','#cart-icon-bubble-short','#cart-icon-bubble--mobile','#cart-icon-bubble--mobile-short']){
          const current=document.querySelector<HTMLElement>(selector);
          const replacement=parsed.querySelector<HTMLElement>(selector);
          // Preserve icon nodes/listeners; update only cart count markup.
          const oldBubble=current?.querySelector<HTMLElement>('.cart-count-bubble');
          const newBubble=replacement?.querySelector<HTMLElement>('.cart-count-bubble');
          if(oldBubble&&newBubble)oldBubble.innerHTML=newBubble.innerHTML;
          else if(oldBubble&&!newBubble)oldBubble.remove();
          else if(current&&newBubble)current.appendChild(newBubble.cloneNode(true));
        }
      }catch(err){console.error('[TICARTI] Cart drawer refresh:',err)}
    };
    window.addEventListener('currency-change',refresh);
    window.addEventListener('locale-change',refresh);
    window.addEventListener('cart-change',refreshCart);
    return()=>{live=false;cartRefreshGeneration++;window.removeEventListener('currency-change',refresh);window.removeEventListener('locale-change',refresh);window.removeEventListener('cart-change',refreshCart)}},[draft,isLiquid,isPreview,ticartiNavPathname,previewThemeId]);
  // Keep the original Liquid header/footer/theme assets, while mounting the native
  // verification interaction in the theme's main content area. Do not edit theme ZIP.
  useEffect(()=>{
    if(!isLiquid||!isVerifyEmail||!html){setVerifyMount(null);return}
    const root=(initialThemeOnServer?document.querySelector<HTMLElement>('[data-ticarti-server-liquid]'):null)||rootRef.current;
    const main=root?.querySelector<HTMLElement>('main#MainContent, #MainContent, main');
    if(!main){setVerifyMount(null);return}
    const target=document.createElement('div');
    target.className='ticarti-verify-email-content';
    target.style.cssText='width:100%;max-width:1140px;margin:0 auto;padding:48px 20px 80px;min-height:340px';
    main.replaceChildren(target);
    setVerifyMount(target);
    return()=>setVerifyMount(null);
  },[html,isLiquid,isVerifyEmail,initialThemeOnServer]);
  // Scripts inside server-rendered HTML have already executed during parsing. Re-running
  // them causes global lexical redeclarations and duplicate import maps.
  const firstScriptPass=useRef(true);
  useEffect(()=>{
    const root=(initialThemeOnServer?document.querySelector<HTMLElement>('[data-ticarti-server-liquid]'):null)||rootRef.current;
    if(!root||(!html&&!initialThemeOnServer))return;
    const globalStateKey='__ticartiLiquidAssetRegistry_v1';
    type AssetRegistry={loaded:Set<string>;pending:Map<string,Promise<void>>};
    const win=window as typeof window & {[globalStateKey]?:AssetRegistry};
    const registry=win[globalStateKey]??(win[globalStateKey]={loaded:new Set(),pending:new Map()});
    const scripts=Array.from(root.querySelectorAll<HTMLScriptElement>('script'));
    const identity=(script:HTMLScriptElement)=>{
      const type=(script.getAttribute('type')||'').trim().toLowerCase();
      const src=script.getAttribute('src');
      if(src){try{return 'src:'+new URL(src,document.baseURI).href+'|'+type}catch{return 'src:'+src+'|'+type}}
      // Inline theme bootstrap/importmaps are document-level; do not redeclare them
      // when the same Liquid layout is refreshed or navigated.
      return 'inline:'+type+':'+(script.textContent||'');
    };
    // Server-rendered Liquid markup can contain inert <script> nodes. Never
    // infer that the cart custom elements were registered merely because a
    // script tag is present. Recover the original theme's cart modules in
    // source order, without modifying its assets or rerunning other scripts.
    const cartScriptKind=(script:HTMLScriptElement)=>{
      const src=script.getAttribute('src')||'';
      let pathname='';
      try{pathname=new URL(src,document.baseURI).pathname}catch{pathname=src.split('?')[0]}
      if(/(?:^|\/)cart-drawer\.js$/i.test(pathname))return 'drawer';
      if(/(?:^|\/)cart\.js$/i.test(pathname))return 'cart';
      return '';
    };
    const cartScriptInitialized=(kind:string)=>kind==='drawer'
      ? Boolean(customElements.get('cart-drawer'))
      : kind==='cart' ? Boolean(customElements.get('cart-items')) : true;
    if(firstScriptPass.current){
      firstScriptPass.current=false;
      if(initialThemeOnServer){
        for(const script of scripts){
          const kind=cartScriptKind(script);
          if(!kind||cartScriptInitialized(kind))registry.loaded.add(identity(script));
        }
        // Continue through the normal ordered loader to execute only missing
        // cart modules. Returning here would incorrectly mark inert scripts loaded.
      }
    }
    let cancelled=false;
    const run=async()=>{
      for(const old of scripts){
        if(cancelled)break;
        const type=(old.getAttribute('type')||'').toLowerCase().trim();
        if(type==='application/ld+json'||type==='application/json'||type==='speculationrules')continue;
        const key=identity(old);
        const cartKind=cartScriptKind(old);
        // A registered web component is definitive evidence that this module ran.
        // Never evaluate its top-level customElements.define calls twice.
        if(cartKind&&cartScriptInitialized(cartKind)){registry.loaded.add(key);continue}
        if(registry.loaded.has(key))continue;
        const pending=registry.pending.get(key);
        if(pending){await pending;continue}
        // Import maps must only be installed before module resolution. A page
        // transition must not try to replace an already resolved module map.
        if(type==='importmap'){
          const existing=Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="importmap"]')).some(s=>s!==old&&identity(s)===key);
          if(existing){registry.loaded.add(key);continue}
        }
        const next=document.createElement('script');
        for(const attr of Array.from(old.attributes)){
          if(attr.name!=='async'&&attr.name!=='defer')next.setAttribute(attr.name,attr.value);
        }
        const src=old.getAttribute('src');
        if(src){
          next.async=false;
          const task=new Promise<void>((resolve,reject)=>{
            next.onload=()=>resolve();next.onerror=()=>reject(new Error('Theme asset failed: '+src));
          });
          registry.pending.set(key,task);
          old.parentNode?.replaceChild(next,old);
          try{await task;registry.loaded.add(key)}catch(e){console.error(e)}finally{registry.pending.delete(key)}
        }else{
          next.text=old.textContent||'';
          // Mark before replacing: synchronous inline execution can cause nested
          // updates, but must never register the same globals twice.
          registry.loaded.add(key);
          old.parentNode?.replaceChild(next,old);
        }
      }
      if(!cancelled)window.dispatchEvent(new CustomEvent('ticarti:theme-content-updated'));
    };
    void run();
    return()=>{cancelled=true};
  },[html,initialThemeOnServer]);
  if(!isLiquid)return null;if(error)return <main style={{padding:24}}>{error}</main>;if(!html&&!initialThemeOnServer)return <main aria-busy="true" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#fff'}}>{boot?.store?.logoUrl?<img src={String(boot.store.logoUrl)} alt={String(boot.store.name||'Mağaza')} style={{maxWidth:170,maxHeight:70,objectFit:'contain'}}/>:null}</main>;return <><LiquidWishlistBridge/>{initialThemeOnServer?null:<div ref={rootRef} data-ticarti-liquid-theme dangerouslySetInnerHTML={{__html:html}}/>}{isVerifyEmail&&verifyMount?createPortal(<CustomerVerifyEmailPage/>,verifyMount):null}</>;
}
