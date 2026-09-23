import {NextRequest,NextResponse} from 'next/server';

const CHECKOUT_ORIGIN=(
  process.env.CHECKOUT_ORIGIN||
  'https://commerce-checkout--wedidit-64fae.europe-west4.hosted.app'
).replace(/\/$/,'');

async function proxy(req:NextRequest,ctx:{params:Promise<{path?:string[]}>}){
  const {path=[]}=await ctx.params;
  const pathname='/'+path.join('/');
  const upstream=new URL(pathname||'/',CHECKOUT_ORIGIN);

  req.nextUrl.searchParams.forEach((value,key)=>{
    upstream.searchParams.append(key,value);
  });

  const headers=new Headers(req.headers);
  headers.delete('host');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-proto');
  headers.delete('content-length');

  const init:RequestInit={
    method:req.method,
    headers,
    redirect:'manual',
  };

  if(!['GET','HEAD'].includes(req.method)){
    init.body=await req.arrayBuffer();
  }

  const response=await fetch(upstream,init);

  const responseHeaders=new Headers(response.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('content-encoding');
  responseHeaders.set('x-ticarti-checkout-proxy','central-checkout');

  const location=responseHeaders.get('location');
  if(location){
    try{
      const u=new URL(location,CHECKOUT_ORIGIN);
      if(u.origin===CHECKOUT_ORIGIN){
        responseHeaders.set(
          'location',
          'https://checkout.ticarti.com'+u.pathname+u.search+u.hash
        );
      }
    }catch{}
  }

  return new NextResponse(response.body,{
    status:response.status,
    statusText:response.statusText,
    headers:responseHeaders,
  });
}

export const GET=proxy;
export const POST=proxy;
export const PUT=proxy;
export const PATCH=proxy;
export const DELETE=proxy;
export const OPTIONS=proxy;
export const HEAD=proxy;

export const dynamic='force-dynamic';
