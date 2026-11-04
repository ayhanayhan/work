'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Demo1Layout } from '@/app/components/layouts/demo1/layout';
import { useMasterSession } from '@/app/components/MasterSession';

export default function ProtectedLayout({children}:{children:React.ReactNode}){
  const{token,restoring}=useMasterSession();const router=useRouter();
  useEffect(()=>{if(!restoring&&!token)router.replace('/login')},[restoring,token,router]);
  if(restoring)return <div className="flex min-h-screen w-full items-center justify-center text-sm text-muted-foreground">Yükleniyor…</div>;
  if(!token)return null;
  return <Demo1Layout>{children}</Demo1Layout>;
}
