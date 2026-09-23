'use client';
import {useEffect} from 'react';

type Props={settings:any;store:any};
type Consent={analytics:boolean;marketing:boolean};

function safeId(v:any,re:RegExp){const s=String(v||'').trim();return re.test(s)?s:''}
function injectScript(id:string,src?:string,code?:string){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;if(src){s.src=src;s.async=true}else s.text=code||'';document.head.appendChild(s)}
function consentState():Consent{try{const x=JSON.parse(localStorage.getItem('commerce-cookie-choice')||'{}');return{analytics:x.analytics===true,marketing:x.marketing===true}}catch{return{analytics:false,marketing:false}}}

export default function TrackingScripts({settings,store}:Props){
  useEffect(()=>{
    const seo=settings?.seoAdvanced||{};const tracking=seo.tracking||{};
    if(seo.defaultTitle)document.title=String(seo.defaultTitle);
    const upsertMeta=(name:string,content:any,property=false)=>{if(!content)return;const attr=property?'property':'name';let el=document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement|null;if(!el){el=document.createElement('meta');el.setAttribute(attr,name);document.head.appendChild(el)}el.content=String(content)};
    upsertMeta('description',seo.defaultDescription);upsertMeta('robots',seo.technical?.robots||'index,follow');upsertMeta('og:title',seo.defaultTitle,true);upsertMeta('og:description',seo.defaultDescription,true);upsertMeta('og:image',seo.social?.ogImage,true);upsertMeta('twitter:card',seo.social?.twitterCard||'summary_large_image');
    if(seo.technical?.canonicalBase){let link=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}link.href=String(seo.technical.canonicalBase).replace(/\/$/,'')+window.location.pathname}
    if(seo.customHeadHtml){document.head.querySelectorAll('[data-ticarti-custom-head]').forEach(x=>x.remove());const template=document.createElement('template');template.innerHTML=String(seo.customHeadHtml);Array.from(template.content.children).forEach((node:any)=>{const tag=String(node.tagName||'').toUpperCase();if(!['META','LINK','SCRIPT','STYLE'].includes(tag))return;const copy=document.createElement(tag.toLowerCase());Array.from(node.attributes||[]).forEach((a:any)=>{if(a.name.toLowerCase().startsWith('on'))return;if(tag==='SCRIPT'&&a.name==='src'&&!/^https:\/\//i.test(a.value))return;copy.setAttribute(a.name,a.value)});if(tag==='SCRIPT'||tag==='STYLE')copy.textContent=node.textContent||'';copy.setAttribute('data-ticarti-custom-head','1');document.head.appendChild(copy)})}

    const gtm=safeId(tracking.gtmId,/^GTM-[A-Z0-9]+$/i);const ga=safeId(tracking.ga4Id,/^G-[A-Z0-9]+$/i);const pixel=safeId(tracking.metaPixelId,/^\d{5,30}$/);const ads=safeId(tracking.googleAdsId,/^AW-[A-Z0-9-]+$/i);const adsPurchaseLabel=String(tracking.googleAdsPurchaseLabel||'').trim();
    const dataLayer=()=>((window as any).dataLayer=(window as any).dataLayer||[]);
    const gtag=(...args:any[])=>{dataLayer().push(args);(window as any).gtag=gtag};
    const applyConsent=(c:Consent)=>gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:c.marketing?'granted':'denied',ad_user_data:c.marketing?'granted':'denied',ad_personalization:c.marketing?'granted':'denied'});
    const bootTags=(c:Consent)=>{
      dataLayer();gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});applyConsent(c);
      if((c.analytics||c.marketing)&&gtm){injectScript('ticarti-gtm','https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(gtm));dataLayer().push({'gtm.start':Date.now(),event:'gtm.js'});}
      if(c.analytics&&ga){injectScript('ticarti-gtag','https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ga));gtag('js',new Date());gtag('config',ga,{send_page_view:true});}
      if(c.marketing&&ads){injectScript('ticarti-google-ads','https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ads));gtag('js',new Date());gtag('config',ads);}
      if(c.marketing&&pixel){injectScript('ticarti-meta-pixel',undefined,`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`)}
    };
    bootTags(consentState());

    const onConsent=(event:any)=>{const c={analytics:event?.detail?.analytics===true,marketing:event?.detail?.marketing===true};applyConsent(c);bootTags(c)};
    const onEvent=(event:any)=>{const detail=event?.detail||{};const name=String(detail.event||'');if(!name)return;const c=consentState();try{if(c.analytics||c.marketing)dataLayer().push({event:name,...detail});if(c.analytics&&(window as any).gtag)(window as any).gtag('event',name,detail);if(c.marketing&&name==='purchase'&&(window as any).gtag&&ads&&adsPurchaseLabel)(window as any).gtag('event','conversion',{send_to:`${ads}/${adsPurchaseLabel}`,value:Number(detail.value||0),currency:detail.currency||store?.currency||'TRY',transaction_id:detail.transaction_id||''});if(c.marketing&&(window as any).fbq){const map:any={view_item:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout',purchase:'Purchase',search:'Search'};(window as any).fbq('track',map[name]||'CustomEvent',detail)}}catch{}};
    window.addEventListener('ticarti-cookie-consent',onConsent as EventListener);window.addEventListener('ticarti-analytics',onEvent as EventListener);
    return()=>{window.removeEventListener('ticarti-cookie-consent',onConsent as EventListener);window.removeEventListener('ticarti-analytics',onEvent as EventListener)};
  },[settings,store?.id]);
  return null;
}
