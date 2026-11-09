import {NextResponse,type NextRequest} from 'next/server';
/** The original CSS selects classes on <html>; preserve them on first SSR paint. */
export function middleware(request:NextRequest){
  const forwarded=new Headers(request.headers);
  forwarded.delete('x-ticarti-help-host');
  const pathname=request.nextUrl.pathname;
  forwarded.set('x-marketing-page',pathname);
  // help.ticarti.com is served directly by the Marketing backend.
  // Its public root is the native /help page; category/article URLs stay clean.
  // Never issue a browser redirect or change the address bar.
  const candidates=[request.nextUrl.hostname,request.headers.get('host'),
    request.headers.get('x-forwarded-host'),request.headers.get('x-original-host'),
    request.headers.get('x-forwarded-server')]
    .filter(Boolean).flatMap(value=>String(value).split(','))
    .map(value=>value.trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,''));
  if(candidates.includes('help.ticarti.com')){
    forwarded.set('x-ticarti-help-host','1');
    const url=request.nextUrl.clone();
    if(pathname==='/'||pathname==='/help'||pathname==='/yardim')url.pathname='/help';
    else{
      const match=pathname.match(/^\/(kategori|makale)\/([a-z0-9-]+)\/?$/);
      if(match)url.pathname='/help/'+(match[1]==='kategori'?'category':'article')+'/'+match[2];
    }
    if(url.pathname!==pathname||pathname==='/')return NextResponse.rewrite(url,{request:{headers:forwarded}});
    return NextResponse.next({request:{headers:forwarded}});
  }
  // Keep the public Turkish URL while routing to English-named Next.js files.
  // This is an internal rewrite, never a client-visible 301/302 redirect.
  // Keep readable Turkish help URLs while using English directory names.
  const helpDetail=pathname.match(/^\/yardim\/(kategori|makale)\/([a-z0-9-]+)\/?$/);
  if(helpDetail){
    const url=request.nextUrl.clone();
    url.pathname='/help/'+(helpDetail[1]==='kategori'?'category':'article')+'/'+helpDetail[2];
    return NextResponse.rewrite(url,{request:{headers:forwarded}});
  }
  // Public Turkish help URL, native English-named Next.js route.
  if(pathname==='/yardim'||pathname==='/yardim/'){
    const url=request.nextUrl.clone();
    url.pathname='/help';
    return NextResponse.rewrite(url,{request:{headers:forwarded}});
  }
  const localized=pathname.match(/^\/(en|de|ru|ar|bg|uk|id|vi)\/iletisim\/?$/);
  if(pathname==='/iletisim'||pathname==='/iletisim/'||localized){
    const url=request.nextUrl.clone();
    url.pathname=localized?'/'+localized[1]+'/contact':'/contact';
    return NextResponse.rewrite(url,{request:{headers:forwarded}});
  }
  return NextResponse.next({request:{headers:forwarded}});
}
export const config={matcher:['/((?!_next/|assets/|api/|favicon.ico).*)']};
