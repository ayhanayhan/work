'use client';

import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {ScreenLoader} from '@/components/common/screen-loader';
import {useAdminSession} from '@/app/components/AdminSession';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

export function OnboardingGate({children}:{children:React.ReactNode}){
 const{session}=useAdminSession();const pathname=usePathname();const router=useRouter();const[ready,setReady]=useState(pathname==='/setup');
 useEffect(()=>{let active=true;if(!session){return}if(pathname==='/setup'){setReady(true);return}setReady(false);fetch(`${API}/admin/onboarding?storeId=${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:{authorization:`Bearer ${session.accessToken}`,'x-tenant-id':session.tenantId}}).then(async r=>{const j=await r.json().catch(()=>({}));if(!active)return;if(r.ok&&j?.required&&!j?.completed){router.replace('/setup');return}setReady(true)}).catch(()=>{if(active)setReady(true)});return()=>{active=false}},[session,pathname,router]);
 return ready?<>{children}</>:<ScreenLoader/>;
}
