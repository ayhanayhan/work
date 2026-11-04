'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useAdminSession} from '@/app/components/AdminSession';
import {Crown,CalendarDays,ArrowRight} from 'lucide-react';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Subscription={status?:string;trialEndsAt?:string|null;currentPeriodEnd?:string|null;cancelAtPeriodEnd?:boolean;plan?:{name?:string}|null};
type Billing={subscription?:Subscription|null};
const statusLabels:Record<string,string>={ACTIVE:'Aktif',TRIAL:'Deneme',TRIALING:'Deneme',PAST_DUE:'Ödeme bekleniyor',CANCELLED:'İptal edildi'};
export function SubscriptionBanner(){
 const {session,refreshSession}=useAdminSession();
 const [billing,setBilling]=useState<Billing|null>(null);
 const [error,setError]=useState(false);
 useEffect(()=>{
  if(!session)return;
  let active=true;
  const run=async()=>{
   try{
    const request=(token:string)=>fetch(`${API}/admin/billing/account`,{credentials:'include',headers:{authorization:`Bearer ${token}`,'x-tenant-id':session.tenantId}});
    let response=await request(session.accessToken);
    if(response.status===401){const next=await refreshSession();if(!next)throw new Error('Oturum süresi doldu');response=await request(next.accessToken)}
    if(!response.ok)throw new Error('Abonelik alınamadı');
    const result=await response.json() as Billing;
    if(active)setBilling(result);
   }catch{if(active)setError(true)}
  };
  void run();return()=>{active=false};
 },[session,refreshSession]);
 const sub=billing?.subscription;
 const rawEnd=sub?.status==='TRIAL'||sub?.status==='TRIALING'?sub.trialEndsAt||sub.currentPeriodEnd:sub?.currentPeriodEnd;
 const end=rawEnd?new Date(rawEnd):null;
 const validEnd=end&&!Number.isNaN(end.getTime())?end:null;
 const days=validEnd?Math.max(0,Math.ceil((validEnd.getTime()-Date.now())/86400000)):null;
 return <section aria-label="Mağaza aboneliği" className="overflow-hidden rounded-xl border bg-card shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-5 p-5 lg:px-7 lg:py-6">
   <div className="flex min-w-0 items-start gap-4">
    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Crown className="size-5"/></div>
    <div className="grid gap-2">
     <h2 className="text-lg font-semibold text-foreground">Mağaza aboneliğiniz</h2>
     <p className="text-sm text-muted-foreground">Planınızı, abonelik sürenizi ve yükseltme seçeneklerini yönetin.</p>
     {error?<p className="text-sm text-muted-foreground">Abonelik bilgileri görüntülenemiyor.</p>:billing?<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <span className="font-medium">{sub?.plan?.name||'Plan bilgisi bulunamadı'}</span>
      {sub?.status&&<span className="text-muted-foreground">{statusLabels[sub.status]||sub.status}</span>}
      {validEnd&&<span className="inline-flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-4"/>{validEnd.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})} · {days} gün kaldı</span>}
      {sub?.cancelAtPeriodEnd&&<span className="text-muted-foreground">Dönem sonunda iptal edilecek</span>}
     </div>:<p className="text-sm text-muted-foreground">Abonelik bilgileri yükleniyor…</p>}
    </div>
   </div>
   <Link href="/account/billing/plans" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Planları görüntüle <ArrowRight className="size-4"/></Link>
  </div>
  <div className="border-t px-5 py-3 text-sm lg:px-7"><Link href="/account/billing/basic" className="font-medium text-primary hover:underline">Abonelik ve fatura ayrıntıları →</Link></div>
 </section>;
}
