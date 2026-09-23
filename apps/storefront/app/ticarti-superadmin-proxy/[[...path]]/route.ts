import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPERADMIN_ORIGIN=(process.env.SUPERADMIN_ORIGIN||'https://commerce-superadmin--wedidit-64fae.europe-west4.hosted.app').replace(/\/$/,'');
const BODYLESS=new Set(['GET','HEAD']);
const RESPONSE_DROP=['connection','content-length','content-encoding','transfer-encoding'];
const FORWARD_HEADERS=['accept','accept-language','authorization','cache-control','content-type','cookie','if-modified-since','if-none-match','next-router-prefetch','next-router-segment-prefetch','next-router-state-tree','next-url','origin','pragma','range','referer','rsc','sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','sec-fetch-dest','sec-fetch-mode','sec-fetch-site','sec-fetch-user','user-agent','x-requested-with','x-auth-client'];

function upstreamHeaders(req:NextRequest){
  const headers=new Headers();
  for(const name of FORWARD_HEADERS){const value=req.headers.get(name);if(value)headers.set(name,value)}
  headers.set('accept-encoding','identity');
  headers.set('x-ticarti-surface','superadmin');
  return headers;
}

async function proxy(req:NextRequest,ctx:{params:Promise<{path?:string[]}>}){
  const {path=[]}=await ctx.params;
  const target=new URL(SUPERADMIN_ORIGIN);
  target.pathname='/' + path.map(segment=>encodeURIComponent(segment)).join('/');
  target.search=req.nextUrl.search;
  const init:RequestInit={method:req.method,headers:upstreamHeaders(req),redirect:'manual',cache:'no-store'};
  if(!BODYLESS.has(req.method))init.body=await req.arrayBuffer();
  const upstream=await fetch(target,init);
  const responseHeaders=new Headers(upstream.headers);
  for(const name of RESPONSE_DROP)responseHeaders.delete(name);
  responseHeaders.set('cache-control','private, no-store, max-age=0');
  responseHeaders.set('x-ticarti-superadmin-proxy','clean-upstream-headers');
  const location=responseHeaders.get('location');
  if(location){
    try{const resolved=new URL(location,SUPERADMIN_ORIGIN);if(resolved.origin===new URL(SUPERADMIN_ORIGIN).origin)responseHeaders.set('location',`https://superadmin.ticarti.com${resolved.pathname}${resolved.search}${resolved.hash}`)}catch{}
  }
  return new Response(req.method==='HEAD'?null:upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:responseHeaders});
}
export const GET=proxy;export const HEAD=proxy;export const POST=proxy;export const PUT=proxy;export const PATCH=proxy;export const DELETE=proxy;export const OPTIONS=proxy;
