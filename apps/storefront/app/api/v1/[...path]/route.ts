import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_ORIGIN=(process.env.API_ORIGIN||'http://localhost:4000').replace(/\/$/,'');
const BODYLESS=new Set(['GET','HEAD']);
const RESPONSE_DROP=['connection','content-length','content-encoding','transfer-encoding'];

const FORWARD_HEADERS=[
  'accept','accept-language','authorization','cache-control','content-type','cookie',
  'if-modified-since','if-none-match','origin','pragma','range','referer',
  'sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','sec-fetch-dest','sec-fetch-mode',
  'sec-fetch-site','sec-fetch-user','user-agent','x-auth-client','x-requested-with',
  'x-store-id','x-tenant-id'
];

function cleanHost(raw:string|null){
  return String(raw||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'');
}

function upstreamHeaders(req:NextRequest){
  const headers=new Headers();
  for(const name of FORWARD_HEADERS){
    const value=req.headers.get(name);
    if(value)headers.set(name,value);
  }

  const host=
    cleanHost(req.headers.get('x-ticarti-tenant-host'))||
    cleanHost(req.headers.get('x-forwarded-host'))||
    cleanHost(req.headers.get('host'));

  if(host){
    const origin=`https://${host}`;
    headers.set('origin',origin);
    headers.set('referer',origin+'/');
    headers.set('x-forwarded-host',host);
  }

  headers.set('sec-fetch-site','same-origin');
  headers.set('accept-encoding','identity');
  return headers;
}

function appendSetCookies(target:Headers,upstream:Response){
  const getter=(upstream.headers as any).getSetCookie;
  const values=typeof getter==='function'?getter.call(upstream.headers):[];
  if(Array.isArray(values)&&values.length){
    target.delete('set-cookie');
    for(const value of values)target.append('set-cookie',value);
    return;
  }
  const single=upstream.headers.get('set-cookie');
  if(single){
    target.delete('set-cookie');
    target.append('set-cookie',single);
  }
}

async function proxy(req:NextRequest,ctx:{params:Promise<{path?:string[]}>}){
  const {path=[]}=await ctx.params;
  const target=new URL(API_ORIGIN);
  target.pathname='/v1/'+path.map(segment=>encodeURIComponent(segment)).join('/');
  target.search=req.nextUrl.search;

  const init:RequestInit={
    method:req.method,
    headers:upstreamHeaders(req),
    redirect:'manual',
    cache:'no-store',
  };
  if(!BODYLESS.has(req.method))init.body=await req.arrayBuffer();

  const upstream=await fetch(target,init);
  const responseHeaders=new Headers(upstream.headers);
  for(const name of RESPONSE_DROP)responseHeaders.delete(name);
  appendSetCookies(responseHeaders,upstream);
  responseHeaders.set('cache-control','private, no-store, max-age=0');
  responseHeaders.set('x-ticarti-api-proxy','same-origin-bff');

  return new Response(req.method==='HEAD'?null:upstream.body,{
    status:upstream.status,
    statusText:upstream.statusText,
    headers:responseHeaders,
  });
}

export const GET=proxy;
export const HEAD=proxy;
export const POST=proxy;
export const PUT=proxy;
export const PATCH=proxy;
export const DELETE=proxy;
export const OPTIONS=proxy;
