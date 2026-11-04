'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const CENTRAL_LOGIN='https://login.ticarti.com';

function safeNext(raw:string|null){
  if(!raw||!raw.startsWith('/')||raw.startsWith('//'))return '/dashboard';
  if(raw.startsWith('/admin/'))return raw.slice('/admin'.length)||'/dashboard';
  if(raw==='/admin')return '/dashboard';
  return raw;
}

export default function AdminLoginBridge(){
  const router=useRouter();const[error,setError]=useState('');
  useEffect(()=>{void (async()=>{
    const sp=new URLSearchParams(window.location.search);const handoff=sp.get('handoff');const tenant=sp.get('tenant');const next=safeNext(sp.get('next'));
    try{
      if(handoff){
        if(tenant)try{localStorage.setItem('commerce-active-tenant',tenant)}catch{}
        const r=await fetch(API+'/merchant-auth/handoff',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-admin'},body:JSON.stringify({code:handoff})});
        const j=await r.json().catch(()=>({}));if(!r.ok||!j.accessToken)throw new Error(j?.message||'Giriş bağlantısının süresi dolmuş.');
        router.replace(next);return;
      }
      const r=await fetch(API+'/merchant-auth/refresh',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-admin'},body:'{}'});
      if(r.ok){router.replace('/dashboard');return;}
      window.location.replace(CENTRAL_LOGIN+'/?returnTo='+encodeURIComponent(window.location.origin+'/admin'));
    }catch(e:any){setError(e?.message||'Giriş tamamlanamadı.');}
  })()},[router]);
  return <div className="commerce-auth-screen"><div className="commerce-auth-card card"><div className="card-body commerce-auth-body"><h3>Mağaza yönetimi</h3><p className="text-muted">{error||'Güvenli oturum hazırlanıyor…'}</p>{error&&<a className="btn btn-primary w-100" href={CENTRAL_LOGIN}>login.ticarti.com ile tekrar giriş yap</a>}</div></div></div>;
}
