import {NextResponse,type NextRequest} from 'next/server';
/** The original CSS selects classes on <html>; preserve them on first SSR paint. */
export function middleware(request:NextRequest){
  const forwarded=new Headers(request.headers);
  const pathname=request.nextUrl.pathname;
  forwarded.set('x-marketing-page',pathname);
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
