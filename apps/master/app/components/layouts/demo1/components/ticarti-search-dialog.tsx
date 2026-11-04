'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Package, Search, ShoppingBag, UserRound, X, Loader2 } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAdminSession } from '@/app/components/AdminSession';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type SearchItem={type:'Sipariş'|'Ürün'|'Müşteri'|'Sayfa';title:string;meta:string;href:string};
const icons={Sipariş:ShoppingBag,Ürün:Package,Müşteri:UserRound,Sayfa:FileText};

export function TicartiSearchDialog({trigger}:{trigger:ReactNode}){
  const {session}=useAdminSession();
  const [query,setQuery]=useState('');
  const [items,setItems]=useState<SearchItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const headers=useMemo(()=>session?{authorization:`Bearer ${session.accessToken}`,'x-tenant-id':session.tenantId}:undefined,[session]);

  useEffect(()=>{
    const q=query.trim();
    if(!session||q.length<2){setItems([]);setError('');setLoading(false);return;}
    const ctrl=new AbortController();
    const timer=setTimeout(async()=>{
      setLoading(true);setError('');
      try{
        const r=await fetch(`${API}/admin/global-search?storeId=${encodeURIComponent(session.storeId)}&q=${encodeURIComponent(q)}`,{credentials:'include',headers,signal:ctrl.signal});
        const j=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(Array.isArray(j?.message)?j.message.join(', '):(j?.message||'Arama yapılamadı'));
        setItems(Array.isArray(j?.items)?j.items:[]);
      }catch(e:any){if(e?.name!=='AbortError')setError(e?.message||'Arama yapılamadı');}
      finally{if(!ctrl.signal.aborted)setLoading(false);}
    },220);
    return()=>{clearTimeout(timer);ctrl.abort();};
  },[query,session,headers]);

  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="lg:max-w-[680px] lg:top-[15%] lg:translate-y-0 p-0 [&_[data-slot=dialog-close]]:hidden"><DialogHeader className="border-b px-5 py-4"><DialogTitle className="sr-only">Ticarti Arama</DialogTitle><DialogDescription className="sr-only">Sipariş, ürün, müşteri ve içeriklerde gerçek zamanlı arama yapın.</DialogDescription><div className="flex items-center gap-3"><Search className="size-4.5 text-muted-foreground shrink-0"/><Input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Sipariş no, SKU, barkod, ürün, müşteri veya sayfa ara..." className="h-8 border-0 shadow-none ring-0! px-0 text-sm focus-visible:ring-0"/>{loading&&<Loader2 className="size-4 animate-spin text-muted-foreground"/>}{query&&<Button type="button" variant="ghost" mode="icon" size="sm" onClick={()=>setQuery('')}><X className="size-4"/></Button>}</div></DialogHeader><DialogBody className="p-0"><ScrollArea className="max-h-[470px]"><div className="p-3">{query.trim().length<2?<div className="py-12 text-center"><Search className="mx-auto size-8 text-muted-foreground/50"/><div className="mt-3 text-sm font-medium">Tüm mağazada ara</div><div className="mt-1 text-xs text-muted-foreground">En az 2 karakter yazın. Sipariş no, SKU, barkod, e-posta ve telefon desteklenir.</div></div>:error?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>:!loading&&!items.length?<div className="py-14 text-center"><Search className="mx-auto size-8 text-muted-foreground/50"/><div className="mt-3 text-sm font-medium">Sonuç bulunamadı</div><div className="mt-1 text-xs text-muted-foreground">Farklı bir sipariş no, SKU, ürün veya müşteri bilgisi deneyin.</div></div>:<div className="space-y-1">{items.map((item,index)=>{const Icon=icons[item.type]||FileText;return <Link key={`${item.type}-${item.href}-${index}`} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"><div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4"/></div><div className="min-w-0 grow"><div className="truncate text-sm font-medium">{item.title}</div><div className="truncate text-xs text-muted-foreground">{item.meta}</div></div><Badge variant="secondary" className="text-[11px] font-normal">{item.type}</Badge></Link>})}</div>}</div></ScrollArea><div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground"><span>Yetkiniz olan kayıt türlerinde arama yapılır</span><span>ESC ile kapat</span></div></DialogBody></DialogContent></Dialog>;
}
