'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {AlertTriangle,LockKeyhole} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const PLANS='/account/billing/plans';
type Decision={restricted:boolean;reason:string;kind:'trial'|'paid';warning:boolean;daysRemaining:number|null;graceActive:boolean};
export function SubscriptionGate({children}:{children:React.ReactNode}){
  const {session,refreshSession}=useAdminSession();const pathname=usePathname();
  const [decision,setDecision]=useState<Decision|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!session)return;
    let active=true;let busy=false;
    const read=async()=>{
      if(busy)return;busy=true;
      try{
        const request=(token:string)=>fetch(`${API}/admin/billing/account`,{cache:'no-store',credentials:'include',headers:{authorization:`Bearer ${token}`,'x-tenant-id':session.tenantId}});
        let response=await request(session.accessToken);
        if(response.status===401){const refreshed=await refreshSession();if(!refreshed)throw Error('SESSION_EXPIRED');response=await request(refreshed.accessToken)}
        if(!response.ok)throw Error('ABONELIK_DURUMU_ALINAMADI');
        const data=await response.json();if(!data?.restriction)throw Error('RESTRICTION_MISSING');
        if(active){setDecision(data.restriction);setFailed(false)}
      }catch{if(active){setFailed(true);setDecision(null)}}finally{busy=false}
    };
    void read();const timer=setInterval(()=>void read(),60000);
    return()=>{active=false;clearInterval(timer)};
  },[session?.tenantId,session?.accessToken,refreshSession]);
  const recovery=pathname.startsWith('/account/billing')||pathname.startsWith('/account/profile')||pathname.startsWith('/support')||pathname==='/setup';
  const locked=!recovery&&(failed||!decision||decision.restricted);
  if(locked){return <div className="relative min-h-[75vh] overflow-hidden bg-background">
    <div aria-hidden="true" className="pointer-events-none select-none blur-[8px] opacity-35 p-6">
      <div className="h-10 w-40 rounded bg-muted mb-6"/><div className="grid grid-cols-3 gap-4">{[0,1,2].map(i=><div key={i} className="h-28 rounded-xl bg-muted"/>)}</div>
      <div className="mt-6 h-80 rounded-xl bg-muted"/>
    </div>
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/65 p-4" role="dialog" aria-modal="true" aria-label="Abonelik erişimi">
      <div className="w-full max-w-md rounded-xl border bg-background p-7 shadow-2xl text-center">
        <LockKeyhole className="mx-auto mb-4 size-9 text-primary"/>
        <h2 className="text-xl font-semibold">{failed||!decision?'Abonelik kontrol ediliyor':'Abonelik süreniz sona erdi'}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{failed||!decision?'Durum doğrulanamadı. Güvenli işlemler için paketler sayfasını kullanabilirsiniz.':'Mağazanızın lisansını yenilemek veya paket seçmek için devam edin.'}</p>
        <Link href={PLANS} className="mt-6 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground">Paketleri Görüntüle</Link>
      </div>
    </div>
  </div>}
  return <>{decision?.warning&&!recovery&&<div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <span className="flex items-center gap-2"><AlertTriangle className="size-4"/>{decision.graceActive?'Ek kullanım süreniz devam ediyor.':`${decision.kind==='trial'?'Deneme':'Lisans'} süresinin bitmesine ${decision.daysRemaining??0} gün kaldı.`}</span>
    <Link className="underline font-semibold" href={PLANS}>Paketi Yenile</Link>
  </div>}{children}</>;
}