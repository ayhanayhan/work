'use client';

import {useCallback,useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {useMasterSession} from '@/app/components/MasterSession';

type Plan={id:string;name:string;trialDays:number};
type Sub={id:string;status:string;planId:string;trialEndsAt?:string|null;currentPeriodEnd?:string|null;plan?:Plan};
type Store={id:string;status:string;trialEndsAt?:string|null;subscriptions?:Sub[]};
const toDate=(value?:string|null)=>value?new Date(value).toLocaleDateString('tr-TR'):'—';
const dateInput=(v?:string|null)=>v?new Date(v).toISOString().slice(0,10):'';
const asIso=(v:string)=>v?new Date(v+'T23:59:59.999Z').toISOString():null;

export function StoreSubscriptionEditor(){
  const pathname=usePathname();
  const match=/^\/stores\/([0-9a-fA-F-]{36})\/?$/.exec(pathname);
  const tenantId=match?.[1]||'';
  const {request}=useMasterSession();
  const [store,setStore]=useState<Store|null>(null);
  const [plans,setPlans]=useState<Plan[]>([]);
  const [planId,setPlanId]=useState('');
  const [status,setStatus]=useState('ACTIVE');
  const [trialEnd,setTrialEnd]=useState('');
  const [periodEnd,setPeriodEnd]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  const load=useCallback(async()=>{
    if(!tenantId)return;
    try{
      const [tenant,catalog]=await Promise.all([
        request('/superadmin/tenants/'+encodeURIComponent(tenantId)),
        request('/superadmin/plans')
      ]);
      const row=(tenant?.subscriptions||[])[0] as Sub|undefined;
      const rows=Array.isArray(catalog)?catalog:(catalog?.plans||[]);
      setStore(tenant);
      setPlans(rows);
      setPlanId(row?.planId||rows[0]?.id||'');
      setStatus(row?.status||'TRIAL');
      setTrialEnd(dateInput(row?.trialEndsAt||tenant?.trialEndsAt));
      setPeriodEnd(dateInput(row?.currentPeriodEnd));
      setError('');
    }catch(e:any){setError(e?.message||'Abonelik bilgileri alınamadı.')}
  },[tenantId,request]);
  useEffect(()=>{void load()},[load]);
  if(!tenantId)return null;
  const current=store?.subscriptions?.[0];

  const save=async(action:'assign'|'update'|'extend')=>{
    if(!store)return;
    setBusy(true);setError('');setSuccess('');
    try{
      if(action==='assign'){
        if(!planId)throw Error('Önce paket seçin.');
        await request('/superadmin/tenants/'+tenantId+'/subscription',{
          method:'POST',body:JSON.stringify({planId,status})
        });
      }else{
        if(!current)throw Error('Önce abonelik oluşturun.');
        if(action==='extend'){
          const previous=current.status==='TRIAL'?current.trialEndsAt:current.currentPeriodEnd;
          const baseline=new Date(Math.max(Date.now(),previous?new Date(previous).getTime():0));
          baseline.setUTCDate(baseline.getUTCDate()+30);
          if(current.status==='TRIAL'){
            await request('/superadmin/tenants/'+tenantId,{method:'PATCH',body:JSON.stringify({trialEndsAt:baseline.toISOString()})});
            await request('/superadmin/subscriptions/'+current.id,{method:'PATCH',body:JSON.stringify({trialEndsAt:baseline.toISOString()})});
          }else{
            await request('/superadmin/subscriptions/'+current.id,{
              method:'PATCH',body:JSON.stringify({currentPeriodEnd:baseline.toISOString()})
            });
          }
        }else{
          await request('/superadmin/subscriptions/'+current.id,{
            method:'PATCH',body:JSON.stringify({status,currentPeriodEnd:asIso(periodEnd),trialEndsAt:asIso(trialEnd)})
          });
          await request('/superadmin/tenants/'+tenantId,{
            method:'PATCH',body:JSON.stringify({status:status==='TRIAL'?'TRIAL':status==='ACTIVE'?'ACTIVE':store.status,trialEndsAt:asIso(trialEnd)})
          });
        }
      }
      await load();
      setSuccess('Abonelik bilgileri güncellendi.');
    }catch(e:any){setError(e?.message||'Güncelleme başarısız.')}
    finally{setBusy(false);}
  };

  return <section className="mx-auto w-full max-w-[1280px] px-6 pb-8">
    <div className="rounded-xl border bg-background p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Abonelik ve paket yönetimi</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">Mağazanın paketini, deneme ve abonelik süresini yönetin.</p>
      {error&&<p role="alert" className="mb-3 rounded border border-red-300 p-3 text-sm text-red-600">{error}</p>}
      {success&&<p role="status" className="mb-3 text-sm text-green-700">{success}</p>}
      {!store?<p className="text-sm">Mağaza bilgileri yükleniyor…</p>:
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">Paket
          <select className="h-10 rounded-md border bg-background px-3" value={planId} onChange={e=>setPlanId(e.target.value)}>
            {plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Abonelik durumu
          <select className="h-10 rounded-md border bg-background px-3" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="TRIAL">Deneme</option><option value="ACTIVE">Aktif</option>
            <option value="PAST_DUE">Ödeme gecikmiş</option><option value="CANCELLED">İptal</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">Deneme bitiş tarihi
          <input type="date" className="h-10 rounded-md border bg-background px-3" value={trialEnd} onChange={e=>setTrialEnd(e.target.value)}/>
        </label>
        <label className="grid gap-1 text-sm">Paket bitiş tarihi
          <input type="date" className="h-10 rounded-md border bg-background px-3" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/>
        </label>
        <div className="md:col-span-2 text-sm text-muted-foreground">Mevcut paket: {current?.plan?.name||'Yok'} · Deneme: {toDate(current?.trialEndsAt)} · Paket: {toDate(current?.currentPeriodEnd)}</div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button disabled={busy||!planId} onClick={()=>void save('assign')} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Paketi ata / değiştir</button>
          <button disabled={busy||!current} onClick={()=>void save('update')} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Tarih ve durumu kaydet</button>
          <button disabled={busy||!current} onClick={()=>void save('extend')} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">30 gün uzat</button>
        </div>
      </div>}
    </div>
  </section>;
}
