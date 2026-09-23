import './globals.css';
import './core-commerce.css';
import type {Metadata} from 'next';
import {headers} from 'next/headers';
import StorefrontGate from '../components/StorefrontGate';

function cleanHost(raw:string|null){return String(raw||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
function platformHost(host:string){return ['ticarti.com','www.ticarti.com','login.ticarti.com','app.ticarti.com','academy.ticarti.com','superadmin.ticarti.com','dev.ticarti.com'].includes(host)}
function storeKey(host:string){if(host.endsWith('.ticarti.com'))return host.slice(0,-'.ticarti.com'.length).split('.')[0];return host}
async function storefrontBoot(host:string){if(!host||platformHost(host)||host.endsWith('.hosted.app'))return null;const origin=String(process.env.API_ORIGIN||process.env.API_URL||'https://dev.ticarti.com').replace(/\/$/,'');try{const r=await fetch(`${origin}/v1/storefront/${encodeURIComponent(storeKey(host))}`,{cache:'no-store'});return r.ok?await r.json():null}catch{return null}}

export async function generateMetadata():Promise<Metadata>{
  const h=await headers();const host=cleanHost(h.get('x-forwarded-host')||h.get('x-original-host')||h.get('host'));
  if(!host||platformHost(host)||host.endsWith('.hosted.app'))return {title:'Ticarti',description:'E-ticaret altyapısı'};
  const boot=await storefrontBoot(host);const store=boot?.store||{};const seo=store?.settings?.seoAdvanced||{};const technical=seo.technical||{};const social=seo.social||{};
  const title=String(seo.defaultTitle||store.seoTitle||store.name||'Ticarti');const description=String(seo.defaultDescription||store.seoDescription||'').trim()||undefined;
  const canonicalBase=String(technical.canonicalBase||`https://${host}`).replace(/\/$/,'');const robotsRaw=String(technical.robots||'index,follow').toLowerCase();
  const index=!robotsRaw.includes('noindex'),follow=!robotsRaw.includes('nofollow');
  const locales=Array.isArray(store.locales)?store.locales:[];const languages:Record<string,string>={};for(const l of locales){const locale=String(l?.locale||'').trim();if(locale)languages[locale]=canonicalBase;}
  return {
    title,description,
    alternates:{canonical:canonicalBase,...(Object.keys(languages).length?{languages}: {})},
    robots:{index,follow,googleBot:{index,follow}},
    openGraph:{type:'website',url:canonicalBase,siteName:store.name||title,title,description,images:social.ogImage?[{url:String(social.ogImage)}]:undefined},
    twitter:{card:social.twitterCard==='summary'?'summary':'summary_large_image',title,description,images:social.ogImage?[String(social.ogImage)]:undefined},
    icons:store.faviconUrl?{icon:String(store.faviconUrl)}:undefined,
  };
}

export default async function Layout({children}:{children:React.ReactNode}){
  const h=await headers();
  const surface=h.get('x-ticarti-surface');
  const hosts=[cleanHost(h.get('host')),cleanHost(h.get('x-forwarded-host')),cleanHost(h.get('x-original-host'))].filter(Boolean);
  const platform=surface==='platform'||surface==='login'||surface==='app-marketplace'||hosts.some(platformHost);
  const current=hosts.find(x=>!x.endsWith('.hosted.app'))||hosts[0]||'';const boot=platform?null:await storefrontBoot(current);const locale=String(boot?.store?.locale||'tr-TR');const rtl=locale.toLowerCase().startsWith('ar');const schema=boot?.store?.settings?.seoAdvanced?.schema||{};
  const organization=boot&&!platform?{ '@context':'https://schema.org','@type':'Organization',name:schema.organizationName||boot.store?.name,url:`https://${current}`,...(schema.logoUrl?{logo:schema.logoUrl}:{}),...(schema.phone?{telephone:schema.phone}:{}),...(schema.email?{email:schema.email}:{})}:null;
  return <html className="js" lang={locale.split('-')[0]||'tr'} dir={rtl?'rtl':'ltr'}><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Roboto:wght@300;400;500;700;900&family=Montserrat:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/><link rel="stylesheet" href="/signature-assets/signature-bundle.css"/><link rel="stylesheet" href="/signature-assets/swiper-bundle.min.css"/><script src="/signature-assets/swiper-bundle.min.js" defer></script><script src="/signature-assets/masonry.pkgd.min.js" defer></script></head><body>{organization&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization).replace(/</g,'\\u003c')}}/>}{platform?children:<StorefrontGate>{children}</StorefrontGate>}</body></html>;
}
