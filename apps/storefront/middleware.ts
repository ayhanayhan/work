import { NextRequest, NextResponse } from 'next/server';
import {resolvePublicUrl} from './lib/seo-route-contract';

const PLATFORM_DOMAIN='ticarti.com';

function cleanHost(raw:string|null|undefined){
  return String(raw||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'');
}
function originalHost(req:NextRequest){
  const candidates=[
    cleanHost(req.headers.get('host')),
    cleanHost(req.headers.get('x-forwarded-host')),
    cleanHost(req.headers.get('x-original-host')),
    cleanHost(req.nextUrl.hostname),
  ].filter(Boolean);

  const exact=candidates.find(h=>h===PLATFORM_DOMAIN||h.endsWith(`.${PLATFORM_DOMAIN}`));
  return exact||candidates[0]||'';
}
function assetOrApi(path:string){
  return path.startsWith('/_next/')||path.startsWith('/api/')||path==='/favicon.ico'||path==='/robots.txt'||path==='/sitemap.xml'||/\.[a-z0-9]{2,6}$/i.test(path);
}
function internal(req:NextRequest,prefix:string,surface?:string){
  const url=req.nextUrl.clone();
  url.pathname=prefix+(url.pathname==='/'?'':url.pathname);
  if(!surface)return NextResponse.rewrite(url);
  const headers=new Headers(req.headers);
  headers.set('x-ticarti-surface',surface);
  return NextResponse.rewrite(url,{request:{headers}});
}
function redirectLogin(req:NextRequest){
  const url=new URL('https://login.ticarti.com/');
  const requested=`${req.nextUrl.protocol}//${originalHost(req)}${req.nextUrl.pathname}${req.nextUrl.search}`;
  if(req.nextUrl.pathname==='/admin'||req.nextUrl.pathname.startsWith('/admin/'))url.searchParams.set('returnTo',requested);
  return NextResponse.redirect(url);
}
function redirectToAdminRoot(req:NextRequest){
  const url=req.nextUrl.clone();url.pathname='/admin/dashboard';url.search='';return NextResponse.redirect(url);
}
function proxyTenantAdmin(req:NextRequest,host:string){
  const url=req.nextUrl.clone();
  url.pathname='/ticarti-admin-proxy'+req.nextUrl.pathname;
  const headers=new Headers(req.headers);
  headers.set('x-ticarti-tenant-host',host);
  headers.set('x-ticarti-original-path',req.nextUrl.pathname);
  return NextResponse.rewrite(url,{request:{headers}});
}

export async function middleware(req:NextRequest){
  const host=originalHost(req);const path=req.nextUrl.pathname;

  // Firebase App Hosting'in varsayilan *.hosted.app origin'i public bir giris noktasi degildir.
  // Custom domain taleplerinde originalHost x-forwarded-host/x-original-host icinden ticarti.com
  // hostunu secer; yalniz origin dogrudan acildiginda bu redirect calisir.
  if(host.endsWith('.hosted.app')) return NextResponse.redirect(new URL('https://ticarti.com/'),308);

  if(host===`checkout.${PLATFORM_DOMAIN}`){
    const url=req.nextUrl.clone();
    url.pathname='/ticarti-checkout-proxy'+req.nextUrl.pathname;
    return NextResponse.rewrite(url,{
      request:{
        headers:new Headers(req.headers)
      }
    });
  }
  if(host===`superadmin.${PLATFORM_DOMAIN}`) return internal(req,'/ticarti-superadmin-proxy','superadmin');
  if(host===`dev.${PLATFORM_DOMAIN}`) return internal(req,'/__proxy-api');

  if(host===`login.${PLATFORM_DOMAIN}`){
    if(assetOrApi(path))return NextResponse.next();
    if(path.startsWith('/ticarti-login'))return NextResponse.next();
    return internal(req,'/ticarti-login','login');
  }


  if(host===`academy.${PLATFORM_DOMAIN}`){
    if(assetOrApi(path))return NextResponse.next();
    return NextResponse.redirect(new URL('https://ticarti.com/'),307);
  }

  if(host===`app.${PLATFORM_DOMAIN}`){
    if(assetOrApi(path))return NextResponse.next();
    if(path==='/admin'||path.startsWith('/admin/'))return redirectLogin(req);
    if(path.startsWith('/ticarti-app'))return NextResponse.next();
    return internal(req,'/ticarti-app','app-marketplace');
  }

  if(host===PLATFORM_DOMAIN||host===`www.${PLATFORM_DOMAIN}`){
    if(path.startsWith('/api/')||
       path.startsWith('/__proxy-api/')||
       path.startsWith('/ticarti-platform')||
       path.startsWith('/ticarti-marketing-proxy')){
      return NextResponse.next();
    }

    if(path==='/ucretsiz-dene'||
       path.startsWith('/ucretsiz-dene/')||
       path==='/magaza-ac'||
       path.startsWith('/magaza-ac/')||
       path==='/admin'||path.startsWith('/admin/')||
       path==='/account'||path.startsWith('/account/')||
       path==='/checkout'||path.startsWith('/checkout/')){
      return internal(req,'/ticarti-platform','platform');
    }

    const url=req.nextUrl.clone();
    url.pathname='/ticarti-marketing-proxy'+
      (path==='/'?'':path);

    return NextResponse.rewrite(url);
  }

  if(path==='/admin'||path==='/admin/') return redirectToAdminRoot(req);
  if(path.startsWith('/admin/')) return proxyTenantAdmin(req,host);
  if(req.nextUrl.searchParams.get('ticarti_design')==='1'){
    const headers=new Headers(req.headers);
    headers.set('x-ticarti-original-path',req.nextUrl.pathname);
    headers.set('x-ticarti-design-preview','1');
    headers.set('x-ticarti-design-source',String(req.nextUrl.searchParams.get('ticarti_source')||'edit'));
    headers.set('x-ticarti-tenant-host',host);
    headers.set('x-ticarti-surface','tenant');
    return NextResponse.next({request:{headers}});
  }

  // Public locale-prefixed URLs for tenant storefronts. Keep URL visible and let
  // Next render existing native pages with the original path stripped internally.
  const localeMatch=path.match(/^\/(en|ru|pt|es|tr)(?=\/|$)/i);
  if(localeMatch && !assetOrApi(path)){
    const locale=localeMatch[1].toLowerCase();
    const bare=path.slice(localeMatch[0].length)||'/';
    const url=req.nextUrl.clone();url.pathname=bare;
    const headers=new Headers(req.headers);
    headers.set('x-ticarti-tenant-host',host);
    headers.set('x-ticarti-surface','tenant');
    headers.set('x-ticarti-locale',locale);
    headers.set('x-ticarti-original-path',path);
    const response=NextResponse.rewrite(url,{request:{headers}});
    return response;
  }
  // Ticarti commerce canonical URLs. Old category aliases are permanent redirects,
  // not separate content routes. Collections remain a distinct resource.
  const oldCategory=path.match(/^\/(?:category|categories)\/(.+)\/?$/);
  if(oldCategory){
    const to=req.nextUrl.clone();to.pathname='/products/'+oldCategory[1].replace(/\/$/,'');
    return NextResponse.redirect(to,308);
  }
  // Apply a merchant's SEO paths as internal rewrites, never HTTP redirects.
  // Fail open to native routes if the settings endpoint is unavailable.
  const nativeRoot=new Set(['products','collections','categories','category','pages','blog','account','addresses','orders','returns','questions','reviews','wishlist','compare','cart','checkout','login','register','forgot-password','reset-password','verify-email','search']);
  const firstSegment=path.split('/').filter(Boolean)[0]||'';
  if(!assetOrApi(path)&&(!nativeRoot.has(firstSegment)||['addresses','orders','returns','questions','reviews'].includes(firstSegment))&&!path.startsWith('/ticarti-')&&!path.startsWith('/__')){
    try {
      const slug=host.endsWith('.ticarti.com')?host.slice(0,-'.ticarti.com'.length).split('.')[0]:host;
      const configuredOrigin=process.env.API_ORIGIN||process.env.API_URL||process.env.NEXT_PUBLIC_API_URL||'';
      const origin=String(/^https?:\/\//.test(configuredOrigin)?configuredOrigin:'https://dev.ticarti.com').replace(/\/v1\/?$/,'').replace(/\/$/,'');
      const r=await fetch(`${origin}/v1/storefront/${encodeURIComponent(slug)}/seo/config`,{cache:'no-store'});
      if(r.ok){const config=await r.json();const rawPieces=path.split('/').filter(Boolean);
        const locales=config?.urlRouting?.locales||{};
        const chosenLocale=Object.prototype.hasOwnProperty.call(locales,rawPieces[0])?rawPieces[0]:'';
        const routePath=chosenLocale?'/'+rawPieces.slice(1).join('/'):path;
        let actual=resolvePublicUrl(config.urlRouting,routePath,chosenLocale||config.defaultLocale||'tr',config.defaultLocale||'tr');
        const activeLocale=chosenLocale||config.defaultLocale||'tr';
        const lc=locales[activeLocale]||locales[String(activeLocale).split('-')[0]]||{};
        const blog=lc.blog||{};
        const pieces=routePath.split('/').filter(Boolean);
        // Root-level blog articles are resolved only when the article really exists.
        // Otherwise unrelated routes and content pages remain unaffected.
        if(!actual&&blog.articleMode==='root'&&pieces.length===1){
          const articleUrl=`${origin}/v1/storefront/${encodeURIComponent(slug)}/blog/posts/${encodeURIComponent(pieces[0])}`;
          const found=await fetch(articleUrl,{next:{revalidate:60}});
          if(found.ok)actual='/blog/'+encodeURIComponent(pieces[0]);
        }
        if(!actual&&blog.categoryMode==='root'&&pieces.length===1){
          const cats=await fetch(`${origin}/v1/storefront/${encodeURIComponent(slug)}/blog/categories`,{next:{revalidate:60}});
          if(cats.ok){const body=await cats.json();const rows=Array.isArray(body)?body:(body.items||[]);
            if(rows.some((x:any)=>x.slug===pieces[0]))actual='/blog?category='+encodeURIComponent(pieces[0]);
          }
        }
        // A prefix-free blog category is ambiguous with an article; check existence.
        if(blog.categoryMode==='directory'&&pieces.length===2&&pieces[0]===(blog.base||lc.paths?.blog||'blog')){
          const rCats=await fetch(`${origin}/v1/storefront/${encodeURIComponent(slug)}/blog/categories`,{next:{revalidate:60}});
          if(rCats.ok){const body=await rCats.json();const rows=Array.isArray(body)?body:(body.items||[]);
            if(rows.some((x:any)=>x.slug===pieces[1]))actual='/blog?category='+encodeURIComponent(pieces[1]);
          }
        }
        if(actual&&actual!==routePath){const url=req.nextUrl.clone();const [target,query]=actual.split('?');
          const accountTabs:Record<string,string>={'/addresses':'addresses','/orders':'orders','/returns':'returns','/questions':'questions','/reviews':'reviews'};
          url.pathname=accountTabs[target]?'/account':target;
          if(accountTabs[target])url.searchParams.set('tab',accountTabs[target]);
          if(query)for(const [k,v] of new URLSearchParams(query))url.searchParams.set(k,v);
          const headers=new Headers(req.headers);headers.set('x-ticarti-tenant-host',host);headers.set('x-ticarti-surface','tenant');
          if(chosenLocale)headers.set('x-ticarti-locale',chosenLocale);
          return NextResponse.rewrite(url,{request:{headers}});
        }
      }
    }catch{}
  }
  // Native account subpages render the existing account screen without changing the visible URL.
  const nativeAccountTabs:Record<string,string>={'/addresses':'addresses','/orders':'orders','/returns':'returns','/questions':'questions','/reviews':'reviews'};
  if(nativeAccountTabs[path]){
    const url=req.nextUrl.clone();url.pathname='/account';url.searchParams.set('tab',nativeAccountTabs[path]);
    const h=new Headers(req.headers);h.set('x-ticarti-tenant-host',host);h.set('x-ticarti-surface','tenant');
    return NextResponse.rewrite(url,{request:{headers:h}});
  }
  // Persist the canonical tenant host resolved by middleware. App Hosting may
  // rewrite Host/X-Forwarded-Host before the server layout executes.
  const headers=new Headers(req.headers);
  headers.set('x-ticarti-tenant-host',host);
  headers.set('x-ticarti-surface','tenant');
  headers.set('x-ticarti-original-path',req.nextUrl.pathname);
  // No locale override on prefix-free URLs: Storefront uses the shop's configured default.
  return NextResponse.next({request:{headers}});
}

export const config={matcher:['/:path*']};
