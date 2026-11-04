import { NextRequest } from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const API_ORIGIN=(process.env.API_ORIGIN||'https://commerce-api-612520357246.europe-west1.run.app').replace(/\/$/,'');
const BODYLESS=new Set(['GET','HEAD']);
const ACCESS_COOKIE='__Host-ticarti_superadmin_access';
const DROP_RESPONSE=['connection','content-length','content-encoding','transfer-encoding'];

function parseCookie(raw:string,name:string){
  for(const part of String(raw||'').split(';')){
    const [key,...rest]=part.trim().split('=');
    if(key===name)return decodeURIComponent(rest.join('='));
  }
  return '';
}

function requestHeaders(req:NextRequest){
  const h=new Headers();
  for(const name of [
    'accept','accept-language','authorization','cache-control','content-type','cookie',
    'if-modified-since','if-none-match','pragma','range','user-agent','x-requested-with'
  ]){
    const value=req.headers.get(name);
    if(value)h.set(name,value);
  }
  h.set('x-auth-client','superadmin');
  h.set('sec-fetch-site','same-origin');
  h.set('accept-encoding','identity');

  const auth=String(h.get('authorization')||'').trim();
  if(!auth || /^Bearer\s*$/i.test(auth)){
    h.delete('authorization');
    const token=parseCookie(h.get('cookie')||'',ACCESS_COOKIE);
    if(token)h.set('authorization',`Bearer ${token}`);
  }
  return h;
}

function accessCookie(token:string){
  return `${ACCESS_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=900`;
}
function clearAccessCookie(){
  return `${ACCESS_COOKIE}=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0`;
}

async function callRefresh(cookie:string){
  if(!cookie)return {ok:false,token:'',cookies:[] as string[]};
  const h=new Headers({
    'content-type':'application/json',
    'cookie':cookie,
    'x-auth-client':'superadmin',
    'sec-fetch-site':'same-origin',
    'accept-encoding':'identity'
  });
  const r=await fetch(API_ORIGIN+'/v1/superadmin-auth/refresh',{
    method:'POST',headers:h,body:'{}',cache:'no-store',redirect:'manual'
  });
  const cookies=(r.headers as any).getSetCookie?.()||[];
  const body=await r.json().catch(()=>({}));
  return {ok:r.ok,token:String(body?.accessToken||''),cookies};
}

function appendCookies(headers:Headers,cookies:string[]){
  headers.delete('set-cookie');
  for(const c of cookies)headers.append('set-cookie',c);
}

async function authProxy(req:NextRequest,target:URL,headers:Headers,pathname:string){
  const init:RequestInit={method:req.method,headers,redirect:'manual',cache:'no-store'};
  if(!BODYLESS.has(req.method))init.body=await req.arrayBuffer();

  const upstream=await fetch(target,init);
  const responseHeaders=new Headers(upstream.headers);
  for(const name of DROP_RESPONSE)responseHeaders.delete(name);
  responseHeaders.set('cache-control','private, no-store, max-age=0');
  responseHeaders.set('x-ticarti-superadmin-api-proxy','v26.7.26');

  const upstreamCookies=(upstream.headers as any).getSetCookie?.()||[];
  const text=await upstream.text();
  let body:any={};
  try{body=JSON.parse(text||'{}')}catch{}

  const cookies=[...upstreamCookies];
  if(upstream.ok && body?.accessToken){
    cookies.push(accessCookie(String(body.accessToken)));
  }
  if(pathname==='superadmin-auth/logout'){
    cookies.push(clearAccessCookie());
  }
  appendCookies(responseHeaders,cookies);

  return new Response(text,{
    status:upstream.status,
    statusText:upstream.statusText,
    headers:responseHeaders
  });
}

async function proxy(req:NextRequest,ctx:{params:Promise<{path?:string[]}>}){
  const {path=[]}=await ctx.params;
  const pathname=path.join('/');
  const target=new URL(API_ORIGIN);
  target.pathname='/v1/'+path.map(x=>encodeURIComponent(x)).join('/');
  target.search=req.nextUrl.search;

  const headers=requestHeaders(req);
  const isAuth=pathname.startsWith('superadmin-auth/');
  const forceSuperadminAuthHeader = (h: Headers) => { if(isAuth) h.set('x-auth-client','superadmin'); return h; };

  if(isAuth){
    const response=await authProxy(req,target,headers,pathname);
    if(pathname==='superadmin-auth/refresh' && !response.ok){
      const h=new Headers(response.headers);
      h.append('set-cookie',clearAccessCookie());
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
    }
    return response;
  }

  let refreshCookies:string[]=[];
  if(!headers.get('authorization')){
    const repaired=await callRefresh(headers.get('cookie')||'');
    refreshCookies=[...refreshCookies,...repaired.cookies];
    if(repaired.token){
      headers.set('authorization',`Bearer ${repaired.token}`);
      refreshCookies.push(accessCookie(repaired.token));
    }else if(!repaired.ok){
      refreshCookies.push(clearAccessCookie());
    }
  }

  const init:RequestInit={method:req.method,headers,redirect:'manual',cache:'no-store'};
  if(!BODYLESS.has(req.method))init.body=await req.arrayBuffer();

  let upstream=await fetch(target,init);

  if(upstream.status===401){
    const repaired=await callRefresh(headers.get('cookie')||'');
    refreshCookies=[...refreshCookies,...repaired.cookies];
    if(repaired.token){
      headers.set('authorization',`Bearer ${repaired.token}`);
      refreshCookies.push(accessCookie(repaired.token));
      upstream=await fetch(target,init);
    }else{
      refreshCookies.push(clearAccessCookie());
    }
  }

  const responseHeaders=new Headers(upstream.headers);
  for(const name of DROP_RESPONSE)responseHeaders.delete(name);
  responseHeaders.set('cache-control','private, no-store, max-age=0');
  responseHeaders.set('x-ticarti-superadmin-api-proxy','v26.7.26');

  const upstreamCookies=(upstream.headers as any).getSetCookie?.()||[];
  if(upstream.status===401)refreshCookies.push(clearAccessCookie());
  appendCookies(responseHeaders,[...refreshCookies,...upstreamCookies]);

  return new Response(req.method==='HEAD'?null:upstream.body,{
    status:upstream.status,statusText:upstream.statusText,headers:responseHeaders
  });
}

export const GET=proxy;
export const HEAD=proxy;
export const POST=proxy;
export const PUT=proxy;
export const PATCH=proxy;
export const DELETE=proxy;
export const OPTIONS=proxy;
