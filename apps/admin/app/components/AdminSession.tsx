'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export type StoreMembership={tenantId:string;tenantName:string;tenantStatus?:string;role:string;customRole?:any;subscription?:any;site:{id:string;name:string;slug:string;publicSlug:string;domain?:string|null;currency?:string}};
export type AdminSession = {accessToken:string;tenantId:string;tenantName:string;storeId:string;storeName:string;role:string;customRole?:any};
export type InstalledAppSummary={id:string;status:string;enabled:boolean;app:{slug:string;name:string;category:string;icon?:string|null;kind?:string|null}};

type SessionContextValue={
  session:AdminSession|null;
  restoring:boolean;
  installedApps:InstalledAppSummary[];
  appsLoaded:boolean;
  stores:StoreMembership[];
  refreshSession:()=>Promise<AdminSession|null>;
  refreshInstalledApps:()=>Promise<InstalledAppSummary[]>;
  switchStore:(tenantId:string)=>void;
  createStore:(name:string)=>Promise<AdminSession|null>;
  clearSession:()=>void;
  logout:()=>Promise<void>;
};

const Ctx=createContext<SessionContextValue|null>(null);
const PUBLIC_PATHS=['/login','/forgot-password','/reset-password','/admin/login','/admin/forgot-password','/admin/reset-password'];

function selectedMembership(rows:any[]):any{
  if(!rows?.length)return null;
  let preferred='';try{preferred=localStorage.getItem('commerce-active-tenant')||''}catch{}
  return rows.find((x:any)=>x.tenantId===preferred)||rows[0];
}
function toSession(accessToken:string,m:any):AdminSession|null{
  const st=m?.site;if(!accessToken||!m||!st)return null;
  return {accessToken,tenantId:m.tenantId,tenantName:m.tenantName,storeId:st.id,storeName:st.name,role:m.role,customRole:m.customRole};
}

export function AdminSessionProvider({children}:{children:ReactNode}){
  const pathname=usePathname();
  const[session,setSession]=useState<AdminSession|null>(null);
  const[stores,setStores]=useState<StoreMembership[]>([]);
  const[restoring,setRestoring]=useState(true);
  const[installedApps,setInstalledApps]=useState<InstalledAppSummary[]>([]);
  const[appsLoaded,setAppsLoaded]=useState(false);

  const refreshSession=useCallback(async()=>{
    try{
      const r=await fetch(API+'/merchant-auth/refresh',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-admin'},body:'{}'});
      if(!r.ok){setSession(null);setStores([]);setInstalledApps([]);setAppsLoaded(false);return null;}
      const j=await r.json();const rows=Array.isArray(j?.memberships)?j.memberships:[];setStores(rows);
      const m=selectedMembership(rows);const next=toSession(j.accessToken,m);setSession(next);return next;
    }catch{setSession(null);setStores([]);setInstalledApps([]);setAppsLoaded(false);return null;}
  },[]);

  const switchStore=useCallback((tenantId:string)=>{
    const m=stores.find(x=>x.tenantId===tenantId);if(!m||!session)return;
    try{localStorage.setItem('commerce-active-tenant',tenantId)}catch{}
    setSession(toSession(session.accessToken,m));setInstalledApps([]);setAppsLoaded(false);
  },[stores,session]);

  const createStore=useCallback(async(name:string)=>{
    if(!session)throw new Error('Oturum yok');
    const r=await fetch(API+'/admin/stores',{method:'POST',credentials:'include',headers:{'content-type':'application/json',authorization:`Bearer ${session.accessToken}`,'x-tenant-id':session.tenantId},body:JSON.stringify({name})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):(j.message||'Mağaza oluşturulamadı'));
    try{localStorage.setItem('commerce-active-tenant',String(j.id))}catch{}
    return refreshSession();
  },[session,refreshSession]);

  const refreshInstalledApps=useCallback(async()=>{
    if(!session){setInstalledApps([]);setAppsLoaded(false);return []}
    try{
      let active=session;
      const run=(s:AdminSession)=>fetch(API+'/admin/apps/installed',{credentials:'include',headers:{authorization:`Bearer ${s.accessToken}`,'x-tenant-id':s.tenantId}});
      let r=await run(active);if(r.status===401){const next=await refreshSession();if(!next){setInstalledApps([]);setAppsLoaded(true);return []}active=next;r=await run(next)}
      const j=await r.json().catch(()=>[]);const rows=Array.isArray(j)?j:[];setInstalledApps(rows);setAppsLoaded(true);return rows;
    }catch{setInstalledApps([]);setAppsLoaded(true);return []}
  },[session,refreshSession]);

  useEffect(()=>{let live=true;if(PUBLIC_PATHS.some(p=>pathname.startsWith(p))){setRestoring(false);return;}if(session){setRestoring(false);return;}setRestoring(true);void refreshSession().finally(()=>{if(live)setRestoring(false)});return()=>{live=false}},[pathname,session,refreshSession]);
  useEffect(()=>{if(!session){setInstalledApps([]);setAppsLoaded(false);return}setAppsLoaded(false);void refreshInstalledApps()},[session?.tenantId,session?.accessToken]);

  const clearSession=useCallback(()=>{setSession(null);setStores([]);setInstalledApps([]);setAppsLoaded(false)},[]);
  const logout=useCallback(async()=>{try{await fetch(API+'/merchant-auth/logout',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-admin'},body:'{}'})}catch{}setSession(null);setStores([]);setInstalledApps([]);setAppsLoaded(false)},[]);
  const value=useMemo(()=>({session,restoring,installedApps,appsLoaded,stores,refreshSession,refreshInstalledApps,switchStore,createStore,clearSession,logout}),[session,restoring,installedApps,appsLoaded,stores,refreshSession,refreshInstalledApps,switchStore,createStore,clearSession,logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminSession(){const value=useContext(Ctx);if(!value)throw new Error('AdminSessionProvider bulunamadı');return value;}
