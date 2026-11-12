'use client';

import {createContext,ReactNode,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {useAdminSession} from '@/app/components/AdminSession';

const API=process.env.NEXT_PUBLIC_API_URL||'';

export type AdminSalesChannel={
  id:string;
  key?:string|null;
  name:string;
  type:string;
  active:boolean;
  isSystem?:boolean;
  priceListId?:string|null;
  stockLocations?:Array<{warehouseId?:string;warehouse?:{id:string;name:string}}>; 
};

type SalesChannelContextValue={
  channels:AdminSalesChannel[];
  loading:boolean;
  selectedChannelId:string|null;
  selectedChannel:AdminSalesChannel|null;
  selectChannel:(id:string|null)=>void;
  refreshChannels:()=>Promise<AdminSalesChannel[]>;
};

const Ctx=createContext<SalesChannelContextValue|null>(null);

export function SalesChannelProvider({children}:{children:ReactNode}){
  const{session}=useAdminSession();
  const[channels,setChannels]=useState<AdminSalesChannel[]>([]);
  const[loading,setLoading]=useState(false);
  const[selectedChannelId,setSelectedChannelId]=useState<string|null>(null);

  const storageKey=session?.storeId?`commerce-active-sales-channel:${session.storeId}`:'';
  const headers=useCallback(()=>({authorization:`Bearer ${session?.accessToken||''}`,'x-tenant-id':session?.tenantId||''}),[session?.accessToken,session?.tenantId]);

  const refreshChannels=useCallback(async()=>{
    if(!session?.storeId){setChannels([]);return []}
    setLoading(true);
    try{
      const r=await fetch(`${API}/admin/advanced-commerce/channels?storeId=${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()});
      const j=await r.json().catch(()=>[]);
      const rows:Array<AdminSalesChannel>=r.ok&&Array.isArray(j)?j:[];
      setChannels(rows);
      return rows;
    }finally{setLoading(false)}
  },[session?.storeId,headers]);

  useEffect(()=>{
    if(!session?.storeId){setChannels([]);setSelectedChannelId(null);return}
    let saved='';try{saved=localStorage.getItem(storageKey)||''}catch{}
    setSelectedChannelId(saved||null);
    void refreshChannels().then(rows=>{
      if(saved&&!rows.some(x=>x.id===saved&&x.active!==false)){
        setSelectedChannelId(null);
        try{localStorage.removeItem(storageKey)}catch{}
      }
    });
  },[session?.storeId,storageKey,refreshChannels]);

  const selectChannel=useCallback((id:string|null)=>{
    setSelectedChannelId(id);
    if(!storageKey)return;
    try{id?localStorage.setItem(storageKey,id):localStorage.removeItem(storageKey)}catch{}
  },[storageKey]);

  const selectedChannel=useMemo(()=>selectedChannelId?channels.find(x=>x.id===selectedChannelId)||null:null,[channels,selectedChannelId]);
  const value=useMemo(()=>({channels,loading,selectedChannelId,selectedChannel,selectChannel,refreshChannels}),[channels,loading,selectedChannelId,selectedChannel,selectChannel,refreshChannels]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSalesChannel(){const value=useContext(Ctx);if(!value)throw new Error('SalesChannelProvider bulunamadı');return value}
