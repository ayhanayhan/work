import './globals.css';
import './core-commerce.css';
import './theme-runtime.css';
import type {Metadata} from 'next';
import {headers} from 'next/headers';
import StorefrontGate from '../components/StorefrontGate';
import B2BStorefrontBridge from '../components/B2BStorefrontBridge';
import {ticartiPerfMeasure} from '../lib/storefront-perf';
import {storefrontBoot,localePath,apiOrigin} from '../lib/server-storefront';

function cleanHost(raw:string|null){return String(raw||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
function platformHost(host:string){return ['ticarti.com','www.ticarti.com','login.ticarti.com','app.ticarti.com','academy.ticarti.com','superadmin.ticarti.com','dev.ticarti.com'].includes(host)}
function storeKey(host:string){if(host.endsWith('.ticarti.com'))return host.slice(0,-'.ticarti.com'.length).split('.')[0];return host}
export async function generateMetadata():Promise<Metadata>{
  const h=await headers();const host=cleanHost(h.get('x-forwarded-host')||h.get('x-original-host')||h.get('host'));
  if(!host||platformHost(host)||host.endsWith('.hosted.app'))return {title:'Ticarti',description:'E-ticaret altyapısı'};
  const boot=await storefrontBoot(host);const store=boot?.store||{};const seo=store?.settings?.seoAdvanced||{};const technical=seo.technical||{};const social=seo.social||{};
  const title=String(seo.defaultTitle||store.seoTitle||store.name||'Ticarti');const description=String(seo.defaultDescription||store.seoDescription||'').trim()||undefined;
  const canonicalBase=String(technical.canonicalBase||`https://${host}`).replace(/\/$/,'');const robotsRaw=String(technical.robots||'index,follow').toLowerCase();
  const index=!robotsRaw.includes('noindex'),follow=!robotsRaw.includes('nofollow');
  const locales=Array.isArray(store.locales)?store.locales:[];const languages:Record<string,string>={};for(const l of locales){const locale=String(l?.locale||'').trim();if(locale)languages[locale]=canonicalBase+localePath(locale,store.locale||'tr-TR','/');}
  return {
    title,description,
    alternates:{canonical:canonicalBase,...(Object.keys(languages).length?{languages}: {})},
    robots:{index,follow,googleBot:{index,follow}},
    openGraph:{type:'website',url:canonicalBase,siteName:store.name||title,title,description,images:social.ogImage?[{url:String(social.ogImage)}]:undefined},
    twitter:{card:social.twitterCard==='summary'?'summary':'summary_large_image',title,description,images:social.ogImage?[String(social.ogImage)]:undefined},
    icons:store.faviconUrl?{icon:String(store.faviconUrl)}:undefined,
  };
}

// Keep the full bootstrap on the server for Liquid rendering and metadata.
// A published Liquid theme needs only its runtime identity and public tracking
// settings on the client. Never serialize product/catalog/theme archives into RSC.
function publishedLiquidClientBoot(boot:any){
  const store=boot?.store||{};
  const settings=store.settings||{};
  const seo=settings.seoAdvanced||{};
  return {
    store:{
      id:store.id,name:store.name,logoUrl:store.logoUrl,
      locale:store.locale,currency:store.currency,defaultCurrency:store.defaultCurrency,
      activeTheme:store.activeTheme,maintenanceMode:store.maintenanceMode,
      settings:{seoAdvanced:{
        defaultTitle:seo.defaultTitle,defaultDescription:seo.defaultDescription,
        technical:seo.technical,social:seo.social,tracking:seo.tracking,
        // customHeadHtml is needed by TrackingScripts; preserve original semantics.
        customHeadHtml:seo.customHeadHtml
      }}
    },
    theme:{config:{engine:'ticarti-liquid-source'}},
    design:{},sections:[],menus:[],themeRuntime:{}
  };
}

export default async function Layout({children}:{children:React.ReactNode}){
  const h=await headers();
  const surface=h.get('x-ticarti-surface');
  const designPreview=h.get('x-ticarti-design-preview')==='1';
  const canonicalTenantHost=cleanHost(h.get('x-ticarti-tenant-host'));
  const hosts=[
    canonicalTenantHost,
    cleanHost(h.get('host')),
    cleanHost(h.get('x-forwarded-host')),
    cleanHost(h.get('x-original-host'))
  ].filter(Boolean);

  const tenantPlatformHost=canonicalTenantHost||
    hosts.find(x=>x.endsWith('.ticarti.com')&&!platformHost(x))||'';
  const externalCustomHost=hosts.find(x=>
    !!x &&
    !x.endsWith('.hosted.app') &&
    !x.endsWith('.run.app') &&
    !platformHost(x)
  )||'';
  const tenantHost=tenantPlatformHost||externalCustomHost;
  const current=tenantHost||
    hosts.find(x=>platformHost(x))||
    hosts.find(x=>!x.endsWith('.hosted.app')&&!x.endsWith('.run.app'))||
    hosts[0]||'';

  const platform=surface!=='tenant'&&!tenantHost&&(
    surface==='platform'||
    surface==='login'||
    surface==='app-marketplace'||
    surface==='superadmin'||
    platformHost(current)
  );

  const bootStarted=performance.now();
  const boot=platform?null:await storefrontBoot(current);
  ticartiPerfMeasure('layout_boot_wait',performance.now()-bootStarted,{store:current,hasBoot:Boolean(boot)});
  const requestPath=h.get('x-ticarti-original-path')||'';
  const engine=String(boot?.theme?.config?.engine||boot?.theme?.config?.manifest?.engine||'');
  let initialThemeHtml='';
  // Render the homepage on the server, so browsers do not wait for bootstrap -> render waterfalls.
  // Do not pre-render design previews, cart-aware or personalized pages.
  if(boot&&!designPreview&&requestPath==='/'&&engine==='ticarti-liquid-source'){
    try{
      const locale=String(boot.store?.locale||'tr-TR');
      const currency=String(boot.store?.currency||boot.store?.defaultCurrency||'TRY');
      const apiBase=String(process.env.NEXT_PUBLIC_API_URL||'/api/v1');
      const params=new URLSearchParams({path:'/',locale,currency,apiBase,origin:`https://${current}`});
      const renderStarted=performance.now();
      const response=await fetch(`${apiOrigin()}/v1/storefront/${encodeURIComponent(storeKey(current))}/theme/render?${params}`,{cache:'no-store',signal:AbortSignal.timeout(6500)});
      ticartiPerfMeasure('liquid_render_http',performance.now()-renderStarted,{store:current,status:response.status});
      if(response.ok){
        const parseStarted=performance.now();
        const result=await response.json();
        initialThemeHtml=typeof result?.html==='string'?result.html:'';
        ticartiPerfMeasure('liquid_render_json',performance.now()-parseStarted,{store:current,htmlBytes:Buffer.byteLength(initialThemeHtml,'utf8')});
      }
    }catch{/* The client renderer remains the fallback when server render is unavailable. */}
  }
  const locale=String(boot?.store?.locale||'tr-TR');const defaultLocale=String(boot?.store?.locales?.find((l:any)=>l?.isDefault)?.locale||boot?.store?.locale||'tr-TR');const activeLocale=String(h.get('x-ticarti-locale')||locale);const localeCodes=(boot?.store?.locales||[]).map((l:any)=>String(l?.locale||'').split('-')[0].toLowerCase()).filter(Boolean).join(',');const rtl=locale.toLowerCase().startsWith('ar');const schema=boot?.store?.settings?.seoAdvanced?.schema||{};
  const organization=boot&&!platform?{ '@context':'https://schema.org','@type':'Organization',name:schema.organizationName||boot.store?.name,url:`https://${current}`,...(schema.logoUrl?{logo:schema.logoUrl}:{}),...(schema.phone?{telephone:schema.phone}:{}),...(schema.email?{email:schema.email}:{})}:null;
  return <html lang={activeLocale.split('-')[0]||defaultLocale.split('-')[0]} data-ticarti-default-locale={defaultLocale} data-ticarti-locales={localeCodes} data-ticarti-full-locales={(boot?.store?.locales||[]).map((l:any)=>String(l?.locale||'')).filter(Boolean).join(',')} dir={rtl?'rtl':'ltr'}><body className={designPreview?'ticarti-design-preview-loading':undefined}>{organization&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization).replace(/</g,'\\u003c')}}/>}<>{initialThemeHtml&&<div data-ticarti-server-liquid dangerouslySetInnerHTML={{__html:initialThemeHtml}}/>}<StorefrontGate initialBoot={boot&&!designPreview&&engine==='ticarti-liquid-source'?publishedLiquidClientBoot(boot):boot} initialThemeOnServer={Boolean(initialThemeHtml)}>{children}</StorefrontGate><B2BStorefrontBridge/></></body></html>;
}
