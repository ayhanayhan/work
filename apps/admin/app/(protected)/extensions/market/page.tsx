'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {LoaderCircle,Puzzle,Search,ArrowRight} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
export default function Page(){
 const {session,refreshSession}=useAdminSession();
 const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[category,setCategory]=useState('Tümü'),[error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!session?.accessToken)return;
  setLoading(true);setError('');
  try{
   const request=(token:string,tenant:string)=>fetch(`${API}/admin/apps/store`,{credentials:'include',cache:'no-store',headers:{authorization:`Bearer ${token}`,'x-tenant-id':tenant}});
   let r=await request(session.accessToken,session.tenantId);
   if(r.status===401){const next=await refreshSession();if(next)r=await request(next.accessToken,next.tenantId)}
   const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):j.message||'Modül marketi yüklenemedi');
   setItems(Array.isArray(j?.items)?j.items:[]);
  }catch(e:any){setError(e?.message||'Modül marketi yüklenemedi')}finally{setLoading(false)}
 },[session?.accessToken,session?.tenantId,refreshSession]);
 useEffect(()=>{void load()},[load]);
 const categories=useMemo(()=>['Tümü',...Array.from(new Set(items.map(x=>String(x.category||'Diğer'))))],[items]);
 const filtered=useMemo(()=>items.filter(x=>(category==='Tümü'||x.category===category)&&`${x.name} ${x.summary||''} ${x.developer||''}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))),[items,category,query]);
 return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold">Modül Marketi</h1><ToolbarDescription>Mağazanız için uygulamaları keşfedin ve inceleyin.</ToolbarDescription></ToolbarHeading></Toolbar></Container>
 <Container className="grid gap-5">
 {error&&<div role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}</div>}
 <Tabs value={category} onValueChange={setCategory}><TabsList className="h-auto flex-wrap">{categories.map(c=><TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}</TabsList></Tabs>
 <div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Modül ara..."/></div>
 {loading?<div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin"/></div>:<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
 {filtered.map(a=><Link key={a.id} href={'/extensions/market/'+encodeURIComponent(a.slug)} className="group rounded-xl border bg-background p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
  <div className="flex gap-3"><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border">{a.marketplace?.logoUrl?<img src={a.marketplace.logoUrl} alt="" className="size-full object-contain"/>:<Puzzle className="size-5 text-primary"/>}</div>
   <div className="min-w-0 grow"><div className="flex items-center gap-2"><b className="truncate">{a.name}</b>{a.isFeatured&&<Badge appearance="light" variant="success">Önerilen</Badge>}</div>
    <div className="mt-1 text-xs text-muted-foreground">{a.category} · {a.developer||'Ticarti'}</div><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.summary}</p>
    <div className="mt-3 flex items-center justify-between gap-3"><Badge appearance="light" variant={a.installed?'success':'secondary'}>{a.installed?'Kurulu':a.price>0?`${a.price} ${a.currency||'TRY'}`:'Ücretsiz'}</Badge><span className="inline-flex items-center gap-1 text-sm font-medium text-primary">İncele <ArrowRight className="size-4"/></span></div>
   </div></div></Link>)}
 {!filtered.length&&<div className="col-span-full rounded-xl border p-10 text-center text-sm text-muted-foreground">Aramanıza uygun uygulama bulunamadı.</div>}
 </div>}</Container></>;
}
