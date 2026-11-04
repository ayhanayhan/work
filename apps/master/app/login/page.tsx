'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMasterSession } from '@/app/components/MasterSession';

const API='/api/v1';
export default function LoginPage(){
  const router=useRouter();const{token,restoring}=useMasterSession();const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  useEffect(()=>{if(!restoring&&token)router.replace('/dashboard')},[restoring,token,router]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const r=await fetch(API+'/superadmin-auth/login',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'superadmin'},body:JSON.stringify({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')})});const j=await r.json().catch(()=>({}));if(!r.ok||!j?.accessToken)throw new Error(j?.message||'E-posta veya şifre hatalı.');window.location.replace('/dashboard');}catch(err:any){setError(err?.message||'Giriş yapılamadı.')}finally{setBusy(false)}}
  return <main className="min-h-screen w-full bg-muted/30 flex items-center justify-center p-5"><div className="w-full max-w-[420px]"><div className="mb-8 flex justify-center"><img src="/brand/ticarti-logo.svg" alt="Ticarti" className="h-7"/></div><Card><CardHeader className="block py-6"><CardTitle className="text-xl">Ticarti Master</CardTitle><CardDescription className="mt-2">Platform yönetim paneline giriş yapın.</CardDescription></CardHeader><CardContent><form className="space-y-5" onSubmit={submit}><label className="block space-y-2 text-sm font-medium">E-posta<Input name="email" type="email" autoComplete="username" required variant="lg"/></label><label className="block space-y-2 text-sm font-medium">Şifre<Input name="password" type="password" autoComplete="current-password" required variant="lg"/></label>{error&&<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}<Button className="w-full" size="lg" disabled={busy}>{busy?'Giriş yapılıyor…':'Giriş yap'}</Button></form></CardContent></Card></div></main>;
}
