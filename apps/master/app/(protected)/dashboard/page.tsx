'use client';
import { useEffect, useState } from 'react';
import { useMasterSession } from '@/app/components/MasterSession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/common/container';

export default function Dashboard(){const{request}=useMasterSession();const[data,setData]=useState<any>(null);useEffect(()=>{request('/superadmin/dashboard').then(setData).catch(()=>setData({}))},[request]);const metrics=data?.metrics||{};return <Container><div className="mb-6"><h1 className="text-2xl font-semibold">Genel Bakış</h1><p className="mt-1 text-sm text-muted-foreground">Ticarti platformunun temel durumunu tek ekrandan izleyin.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[['Mağaza',metrics.tenants],['Aktif mağaza',metrics.activeTenants],['Üyelik',metrics.users],['Ürün',metrics.products]].map(([label,value])=><Card key={String(label)}><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{value??'—'}</div></CardContent></Card>)}</div></Container>}
