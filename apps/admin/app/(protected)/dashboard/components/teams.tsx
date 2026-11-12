'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {orderStatusLabel} from '@/lib/commerce-labels';

export function Teams({data}:{data:any}){
  const [query,setQuery]=useState('');
  const orders=Array.isArray(data?.recentOrders) ? data.recentOrders : [];
  const filtered=useMemo(()=>orders.filter((o:any)=>[o.number,o.customer?.firstName,o.customer?.lastName,o.customer?.email,o.status].join(' ').toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))),[orders,query]);
  const money=(value:any,currency:string)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:currency||'TRY'}).format(Number(value||0));
  return <Card className="h-full">
    <CardHeader className="py-3.5"><CardTitle>Son Siparişler</CardTitle><CardToolbar className="flex gap-2"><div className="relative"><Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2"/><Input placeholder="Sipariş ara..." value={query} onChange={e=>setQuery(e.target.value)} className="ps-9 w-44"/></div><Button variant="outline" size="sm" asChild><Link href="/orders">Tümünü Gör</Link></Button></CardToolbar></CardHeader>
    <CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="ps-5">Sipariş</TableHead><TableHead>Müşteri</TableHead><TableHead>Durum</TableHead><TableHead>Tutar</TableHead><TableHead className="pe-5">Tarih</TableHead></TableRow></TableHeader>
      <TableBody>{filtered.slice(0,8).map((o:any)=><TableRow key={o.id}><TableCell className="ps-5 font-medium whitespace-nowrap"><Link href={`/orders/${o.id}`} className="hover:text-primary">#{o.number||o.id}</Link></TableCell><TableCell>{[o.customer?.firstName,o.customer?.lastName].filter(Boolean).join(' ')||o.customer?.email||'Misafir'}</TableCell><TableCell><Badge appearance="light" variant={['DELIVERED','COMPLETED'].includes(String(o.status).toUpperCase())?'success':'secondary'}>{orderStatusLabel(o)}</Badge></TableCell><TableCell className="font-medium whitespace-nowrap">{money(o.grandTotal,o.currency||data?.currency)}</TableCell><TableCell className="pe-5 text-sm text-muted-foreground whitespace-nowrap">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('tr-TR') : '—'}</TableCell></TableRow>)}
      {!filtered.length&&<TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Sipariş bulunamadı.</TableCell></TableRow>}</TableBody>
    </Table></CardContent>
  </Card>;
}
