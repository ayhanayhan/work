'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {AlertTriangle} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const PLANS_PATH='/account/billing/plans';
type Notice={kind:'trial'|'paid';days:number;expired:boolean};

function getNotice(data:any):Notice|null {
  const sub=data?.subscription;
  const trial=sub?.status==='TRIAL'||(!sub&&data?.tenant?.status==='TRIAL');
  const date=trial?(sub?.trialEndsAt||data?.tenant?.trialEndsAt):sub?.currentPeriodEnd;
  if(!date)return null;
  const end=new Date(date).getTime();
  if(!Number.isFinite(end))return null;
  const days=Math.ceil((end-Date.now())/86400000);
  if(days>(trial?7:30))return null;
  return {kind:trial?'trial':'paid',days:Math.max(0,days),expired:end<=Date.now()};
}

export function SubscriptionGate({children}:{children:React.ReactNode}){
  const {session,refreshSession}=useAdminSession();
  const pathname=usePathname();
  const router=useRouter();
  const [notice,setNotice]=useState<Notice|null>(null);

  useEffect(()=>{
    if(!session)return;
    let active=true;
    setNotice(null);
    const request=(token:string)=>fetch(`${API}/admin/billing/account`,{
      credentials:'include',cache:'no-store',
      headers:{authorization:`Bearer ${token}`,'x-tenant-id':session.tenantId}
    });
    void (async()=>{
      try{
        let response=await request(session.accessToken);
        if(response.status===401){
          const next=await refreshSession();
          if(!next)return;
          response=await request(next.accessToken);
        }
        if(!response.ok)return;
        const data=await response.json();
        if(active)setNotice(getNotice(data));
      }catch{/* Billing API must not break other admin routes. */}
    })();
    return()=>{active=false};
  },[session?.tenantId,session?.accessToken,refreshSession]);

  const onBilling=pathname.startsWith('/account/billing');
  const onSetup=pathname==='/setup';
  useEffect(()=>{
    if(notice?.expired&&!onBilling&&!onSetup){
      router.replace(PLANS_PATH);
    }
  },[notice?.expired,onBilling,onSetup,router]);

  if(notice?.expired&&!onBilling&&!onSetup)return null;
  return <>
    {notice&&!onBilling&&!onSetup&&
      <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0"/>
          {notice.kind==='trial'
            ? `Deneme sürenizin bitmesine ${notice.days} gün kaldı.`
            : `Paket sürenizin bitmesine ${notice.days} gün kaldı.`}
        </span>
        <Link href={PLANS_PATH} className="font-semibold underline underline-offset-2">
          {notice.kind==='trial'?'Paket seç':'Paketi uzat veya yükselt'}
        </Link>
      </div>}
    {children}
  </>;
}
