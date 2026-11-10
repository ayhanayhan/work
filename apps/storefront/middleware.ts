import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_DOMAIN='ticarti.com';

/** Public corporate routes served by Marketing without cross-backend middleware rewrites. */
const MARKETING_PAGES=new Set([
  '/','/index.html','/robots.txt','/sitemap.xml',
  '/paketler','/paketler.html','/iletisim','/yardim','/yardim/','/contacto.html','/login.html','/register.html',
  '/kvkk.html','/gizlilik-politikasi.html','/uyelik-sozlesmesi.html',
  '/companies/enterprise.html','/success-stories','/success-stories/',
  '/success-stories/index.html','/success-stories/crowdy.html',
  '/blog','/blog/','/blog/index.html'
]);
function marketingPage(pathname:string){
  if(MARKETING_PAGES.has(pathname))return true;
  if(/^\/(?:tr|en|de|ru|ar|bg|uk|id|vi)\/paketler(?:\.html)?\/?$/.test(pathname))return true;
  if(/^\/yardim(?:\/|$)/.test(pathname))return true;
  // Calculator articles live in Marketing, including their localized routes.
  // Match only /araclar and /<locale>/araclar to avoid intercepting tenant pages.
  if(/^\/(?:tr|en|de|ru|ar|bg|uk|id|vi)\/araclar(?:\/|$)/.test(pathname)||
     /^\/araclar(?:\/|$)/.test(pathname))return true;
  return pathname.startsWith('/assets/')||
    pathname.startsWith('/blog/')||
    pathname.startsWith('/en/')||pathname==='/en'||
    pathname.startsWith('/pt/')||pathname==='/pt'||
    pathname.startsWith('/ru/')||pathname==='/ru';
}
function proxyMarketing(req:NextRequest){
  const url=req.nextUrl.clone();
  url.pathname='/ticarti-marketing-proxy'+(url.pathname==='/'?'':url.pathname);
  return NextResponse.rewrite(url);
}


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
  // Only true infrastructure endpoints bypass the Marketing proxy.
  // A missing .html page is still a site page and must show Ticarti's 404,
  // not the bare Storefront/Next.js 404.
  return path.startsWith('/_next/')||path.startsWith('/api/')||
    path==='/favicon.ico'||path==='/robots.txt'||path==='/sitemap.xml';
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
    // Preserve authenticated APIs, tenant creation and dynamic package checkout.
    if(path.startsWith('/api/')||path.startsWith('/__proxy-api/')||path.startsWith('/ticarti-platform'))return NextResponse.next();
    if(path==='/paketler'||path.startsWith('/paketler/')||
       path==='/ucretsiz-dene'||path.startsWith('/ucretsiz-dene/')||
       path==='/magaza-ac'||path.startsWith('/magaza-ac/')){
      return internal(req,'/ticarti-platform','platform');
    }
    if(marketingPage(path))return proxyMarketing(req);
    if(assetOrApi(path))return NextResponse.next();
    // Public corporate URLs belong to Marketing. Unknown paths should reach
    // Marketing's branded 404 rather than the bare Platform 404.
    // Preserve internal and account surfaces on the existing Platform backend.
    if(path.startsWith('/ticarti-')||path==='/admin'||path.startsWith('/admin/')||
       path==='/account'||path.startsWith('/account/')||
       path==='/checkout'||path.startsWith('/checkout/')) {
      return internal(req,'/ticarti-platform','platform');
    }
    return proxyMarketing(req);
  }

  if(path==='/admin'||path==='/admin/') return redirectToAdminRoot(req);
  if(path.startsWith('/admin/')) return proxyTenantAdmin(req,host);
  if(req.nextUrl.searchParams.get('ticarti_design')==='1'){
    const headers=new Headers(req.headers);
    headers.set('x-ticarti-design-preview','1');
    headers.set('x-ticarti-design-source',String(req.nextUrl.searchParams.get('ticarti_source')||'edit'));
    headers.set('x-ticarti-design-skin',String(req.nextUrl.searchParams.get('ticarti_skin')||''));
    return NextResponse.next({request:{headers}});
  }
  return NextResponse.next();
}

export const config={matcher:['/:path*']};
