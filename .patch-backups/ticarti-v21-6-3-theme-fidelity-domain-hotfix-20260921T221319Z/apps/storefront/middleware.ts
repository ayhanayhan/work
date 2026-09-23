import { NextRequest, NextResponse } from 'next/server';

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

export function middleware(req:NextRequest){
  const host=originalHost(req);const path=req.nextUrl.pathname;

  // Firebase App Hosting'in varsayilan *.hosted.app origin'i public bir giris noktasi degildir.
  // Custom domain taleplerinde originalHost x-forwarded-host/x-original-host icinden ticarti.com
  // hostunu secer; yalniz origin dogrudan acildiginda bu redirect calisir.
  if(host.endsWith('.hosted.app')) return NextResponse.redirect(new URL('https://ticarti.com/'),308);

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
    if(assetOrApi(path))return NextResponse.next();
    if(path.startsWith('/ticarti-platform'))return NextResponse.next();
    return internal(req,'/ticarti-platform','platform');
  }

  if(path==='/admin'||path==='/admin/') return redirectToAdminRoot(req);
  if(path.startsWith('/admin/')) return proxyTenantAdmin(req,host);
  return NextResponse.next();
}

export const config={matcher:['/:path*']};
