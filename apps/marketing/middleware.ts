import {NextResponse,type NextRequest} from 'next/server';
/** The original CSS selects classes on <html>; preserve them on first SSR paint. */
export function middleware(request:NextRequest){
  const forwarded=new Headers(request.headers);
  forwarded.set('x-marketing-page',request.nextUrl.pathname);
  return NextResponse.next({request:{headers:forwarded}});
}
export const config={matcher:['/((?!_next/|assets/|api/|favicon.ico).*)']};
