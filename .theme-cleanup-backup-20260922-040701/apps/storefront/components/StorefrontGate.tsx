'use client';

import {useEffect,useState} from 'react';
import Header from './Header';
import CookieBanner from './CookieBanner';
import MaintenanceCountdown from './MaintenanceCountdown';
import LiveTrackerBeacon from './LiveTrackerBeacon';
import DesignPreviewBridge from './DesignPreviewBridge';
import TrackingScripts from './TrackingScripts';
import Footer from './Footer';
import {api,getCurrency,getLocale,STORE} from '../lib/api';

function cleanHtml(v:any){return String(v||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript\s*:/gi,'')}

export default function StorefrontGate({children}:{children:React.ReactNode}){
  const[boot,setBoot]=useState<any>(null);const[error,setError]=useState('');const[draftDesign,setDraftDesign]=useState<any>(null);
  useEffect(()=>{let live=true;const load=()=>api(`/storefront/${STORE}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`).then(x=>{if(live){setBoot(x);setError('');setDraftDesign(null)}}).catch(e=>{if(live)setError(e?.message||'Mağaza yüklenemedi')});void load();const refresh=()=>void load();window.addEventListener('currency-change',refresh);window.addEventListener('locale-change',refresh);return()=>{live=false;window.removeEventListener('currency-change',refresh);window.removeEventListener('locale-change',refresh)}},[]);
  useEffect(()=>{const h=(event:any)=>{const d=event?.detail;if(d?.kind==='design'&&d.design)setDraftDesign(d.design)};window.addEventListener('ticarti-design-draft',h as EventListener);return()=>window.removeEventListener('ticarti-design-draft',h as EventListener)},[]);
  const design=draftDesign||boot?.design||{};const g=design.general||{};const p=design.products||{};const f=design.footer||{};
  useEffect(()=>{
    const values=[g.bodyFont,g.paragraphFont,g.headingFont,g.h1Font,g.h2Font,g.h3Font,g.h4Font,g.h5Font].filter(Boolean);
    const system=new Set(['Arial','Georgia','Trebuchet MS','Verdana','Courier New','system-ui','ui-sans-serif']);
    const families=Array.from(new Set(values.map((value:any)=>String(value).split(',')[0].trim().replace(/^['"]|['"]$/g,'')).filter((name:string)=>name&&!system.has(name))));
    const id='ticarti-google-fonts';
    const old=document.getElementById(id) as HTMLLinkElement|null;
    if(!families.length){old?.remove();return}
    const href='https://fonts.googleapis.com/css2?'+families.map((name:string)=>`family=${encodeURIComponent(name).replace(/%20/g,'+')}:wght@300;400;500;600;700;800;900`).join('&')+'&display=swap';
    if(old?.href===href)return;
    const link=old||document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;if(!old)document.head.appendChild(link);
  },[g.bodyFont,g.paragraphFont,g.headingFont,g.h1Font,g.h2Font,g.h3Font,g.h4Font,g.h5Font]);
  if(error)return <main className="storefront-gate-state"><div><b>Mağaza şu anda görüntülenemiyor.</b><p>{error}</p></div></main>;
  if(!boot)return <main className="storefront-gate-state"><div className="storefront-loader" aria-label="Yükleniyor"/></main>;
  if(boot.store?.maintenanceMode)return <MaintenanceCountdown store={boot.store}/>;
  const width=g.layoutMode==='full'?'100%':`${Number(g.layoutMode==='custom'?(g.customWidth||g.containerWidth):(g.containerWidth||1180))}px`;
  const themeStyle:any={'--store-font-body':g.bodyFont||'Inter,ui-sans-serif,system-ui,sans-serif','--store-font-paragraph':g.paragraphFont||g.bodyFont||'Inter,ui-sans-serif,system-ui,sans-serif','--store-font-heading':g.headingFont||g.bodyFont||'Inter,ui-sans-serif,system-ui,sans-serif','--store-font-h1':g.h1Font||g.headingFont||g.bodyFont,'--store-font-h2':g.h2Font||g.headingFont||g.bodyFont,'--store-font-h3':g.h3Font||g.headingFont||g.bodyFont,'--store-font-h4':g.h4Font||g.headingFont||g.bodyFont,'--store-font-h5':g.h5Font||g.headingFont||g.bodyFont,'--store-base-font':`${Number(g.baseFontSize||16)}px`,'--store-paragraph':`${Number(g.paragraphSize||g.baseFontSize||16)}px`,'--store-h1':`${Number(g.h1Size||52)}px`,'--store-h2':`${Number(g.h2Size||34)}px`,'--store-h3':`${Number(g.h3Size||24)}px`,'--store-h4':`${Number(g.h4Size||20)}px`,'--store-h5':`${Number(g.h5Size||17)}px`,'--store-primary':g.primaryColor||'#15171a','--store-secondary':g.secondaryColor||'#727b85','--store-heading':g.headingColor||g.textColor||'#15171a','--store-text':g.textColor||'#15171a','--store-link':g.linkColor||g.primaryColor||'#15171a','--store-bg':g.backgroundColor||'#ffffff','--store-surface':g.surfaceColor||'#ffffff','--store-border':g.borderColor||'#e6e9ec','--store-container':width,'--store-section-gap':`${Number(g.sectionSpacing||64)}px`,'--store-radius':`${Number(g.borderRadius||8)}px`,'--store-button-radius':`${Number(g.buttonRadius||6)}px`,'--store-cols-desktop':String(Math.max(1,Number(p.columnsDesktop||4))),'--store-cols-tablet':String(Math.max(1,Number(p.columnsTablet||2))),'--store-cols-mobile':String(Math.max(1,Number(p.columnsMobile||2))),'--font-body-family':g.bodyFont||'Inter,Arial,sans-serif','--font-heading-family':g.headingFont||g.bodyFont||'Inter,Arial,sans-serif','--font-button-family':g.bodyFont||'Inter,Arial,sans-serif','--font-mainmenu-family':g.headingFont||g.bodyFont||'Inter,Arial,sans-serif','--font-price-family':g.headingFont||g.bodyFont||'Inter,Arial,sans-serif','--color-base':g.textColor||'#000000','--color-accent':g.primaryColor||'#304ffe','--color-lines':g.borderColor||'#d9d9d9','--color-body-background':g.backgroundColor||'#ffffff','--color-secondary-background':g.surfaceColor||'#f0f0f0','--color-heading-main':g.headingColor||g.textColor||'#000000','--color-text-main':g.textColor||'#000000','--color-product-name-main':g.headingColor||g.textColor||'#000000','--color-price-main':g.primaryColor||'#304ffe','--page-width':width,'--padding-wide-horizontal':`${Number(g.pagePadding||20)}px`,'--grid-desktop-horizontal-spacing':`${Number(g.gridSpacing||20)}px`,'--grid-mobile-horizontal-spacing':`${Number(g.gridSpacingMobile||10)}px`,'--buttons-radius':`${Number(g.buttonRadius||8)}px`,'--inputs-radius':`${Number(g.inputRadius||g.buttonRadius||8)}px`,'--badges-radius':`${Number(g.badgeRadius||8)}px`,'--product-card-radius':`${Number(g.productCardRadius||8)}px`,'--roundness':`${Number(g.borderRadius||20)}px`};
  const effectiveBoot={...boot,design};
  return <ThemeRuntime theme={boot.theme}><>{<><link rel="stylesheet" href="/signature-assets/signature-bundle.css"/><link rel="stylesheet" href="/signature-assets/signature-runtime.css"/>{String(boot.store?.locale||'').toLowerCase().startsWith('ar')&&<link rel="stylesheet" href="/signature-assets/base-rtl.css"/>}</>}<div className="storefront-theme" dir={String(boot.store?.locale||'').toLowerCase().startsWith('ar')?'rtl':'ltr'} lang={String(boot.store?.locale||'tr-TR')} style={themeStyle} data-skin={g.skinSlug||'demo-1'} data-skin-group={g.skinGroup||''} data-layout={g.layoutMode||'boxed'} data-product-card={p.productCardTemplate||1} data-product-page={p.productPageTemplate||1} data-category-layout={p.categoryTemplate||1} data-footer-template={f.template||1}>
    <LiveTrackerBeacon/><DesignPreviewBridge/><TrackingScripts settings={boot.store?.settings||{}} store={boot.store}/>{g.customCss&&<style>{String(g.customCss)}</style>}<Header boot={effectiveBoot}/>{children}
    <Footer boot={effectiveBoot}/>
    {boot.features?.aiAssistant&&<a className="store-ai-launcher" href="/account?ai=1" aria-label="AI asistanını aç"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l1.45 4.05L17.5 8l-4.05 1.45L12 13.5l-1.45-4.05L6.5 8l4.05-1.45L12 2.5Zm6.2 8.7.9 2.45 2.4.85-2.4.9-.9 2.4-.85-2.4-2.45-.9 2.45-.85.85-2.45Zm-9.4 4.6 1.1 3.05 3.1 1.1-3.1 1.1L8.8 24l-1.1-2.95-3.05-1.1 3.05-1.1 1.1-3.05Z"/></svg></a>}
    <CookieBanner/>
  </div></></ThemeRuntime>;
}
