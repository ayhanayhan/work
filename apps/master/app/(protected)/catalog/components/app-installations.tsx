'use client';

import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {LoaderCircle,Plus,RefreshCw,Search,Store} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Dialog,DialogBody,DialogContent,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';

type Installation={id:string;tenantId:string;appId:string;status:string;enabled:boolean;source:string;installedAt:string;installedPrice:any;currency?:string;tenant:{name:string;slug:string;id:string};app:{name:string;slug:string;id:string;category:string}};
type Result={items:Installation[];total:number;page:number;pages:number;limit:number};
type SelectRow={id:string;name:string;slug?:string};
const when=(date?:string)=>date?new Date(date).toLocaleString('tr-TR'):'—';
export default function AppInstallationsPage(){
  const {request,restoring}=useMasterSession();
  const [result,setResult]=useState<Result>({items:[],total:0,page:1,pages:1,limit:30});
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [query,setQuery]=useState(''),[submitted,setSubmitted]=useState(''),[page,setPage]=useState(1);
  const [grantOpen,setGrantOpen]=useState(false),[tenants,setTenants]=useState<SelectRow[]>([]),[apps,setApps]=useState<SelectRow[]>([]);
  const [tenantId,setTenantId]=useState(''),[appId,setAppId]=useState('');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const params=new URLSearchParams({page:String(page),limit:'30'});
      if(submitted)params.set('q',submitted);
      const response=await request('/superadmin/app-installations?'+params.toString());
      setResult(response);
    }catch(e:any){setError(e.message||'Kurulumlar yüklenemedi.')}
    finally{setLoading(false)}
  },[request,restoring,page,submitted]);
  useEffect(()=>{void load()},[load]);
  const update=async(row:Installation,enabled:boolean)=>{
    setBusy(row.id);setMessage('');setError('');
    try{
      await request('/superadmin/tenants/'+encodeURIComponent(row.tenantId)+'/apps/'+encodeURIComponent(row.appId),{method:'PATCH',body:JSON.stringify({enabled})});
      await load();setMessage('Uygulama durumu güncellendi.');
    }catch(e:any){setError(e.message||'Durum güncellenemedi.')}finally{setBusy(null)}
  };
  const openGrant=async()=>{
    setGrantOpen(true);setError('');
    try{const [t,a]=await Promise.all([request('/superadmin/tenants'),request('/superadmin/apps')]);setTenants(Array.isArray(t)?t:[]);setApps(Array.isArray(a)?a:[])}
    catch(e:any){setError(e.message||'Mağaza ve uygulama listesi alınamadı.')}
  };
  const grant=async()=>{
    if(!tenantId||!appId){setError('Mağaza ve uygulama seçin.');return}
    setBusy('grant');setError('');
    try{
      await request('/superadmin/tenants/'+encodeURIComponent(tenantId)+'/apps/'+encodeURIComponent(appId)+'/grant',{method:'POST',body:'{}'});
      setGrantOpen(false);setTenantId('');setAppId('');setPage(1);await load();setMessage('Uygulama seçili mağazaya tanımlandı.');
    }catch(e:any){setError(e.message||'Uygulama mağazaya tanımlanamadı.')}finally{setBusy(null)}
  };
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Uygulama Kurulumları</h1><ToolbarDescription>Mağazalardaki uygulamaları inceleyin, erişimlerini yönetin ve elle tanımlama yapın.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" asChild><Link href="/extensions/market">Kataloğa Dön</Link></Button><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="size-4"/>Yenile</Button><Button onClick={()=>void openGrant()}><Plus className="size-4"/>Mağazaya Uygulama Ekle</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><div className="text-xs text-muted-foreground">Toplam Kurulum</div><div className="mt-1 text-2xl font-semibold">{result.total}</div></div><div className="flex w-full max-w-lg gap-2"><Input value={query} placeholder="Mağaza veya uygulama ara" onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setPage(1);setSubmitted(query)}}}/><Button variant="outline" onClick={()=>{setPage(1);setSubmitted(query)}}><Search className="size-4"/>Ara</Button></div></CardContent></Card>
      {error&&!grantOpen?<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      {message?<p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>:null}
      <Card><CardHeader><CardHeading>Mağaza Kurulumları</CardHeading></CardHeader><CardContent className="overflow-x-auto p-0">
        {loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin"/></div>:<Table><TableHeader><TableRow><TableHead>Mağaza</TableHead><TableHead>Uygulama</TableHead><TableHead>Kaynak</TableHead><TableHead>Kurulum Tarihi</TableHead><TableHead>Durum</TableHead><TableHead>Etkin</TableHead></TableRow></TableHeader><TableBody>{result.items.map(row=><TableRow key={row.id}>
          <TableCell><div className="font-medium">{row.tenant?.name||row.tenantId}</div><div className="text-xs text-muted-foreground">{row.tenant?.slug}</div></TableCell>
          <TableCell><div className="font-medium">{row.app?.name||row.appId}</div><div className="text-xs text-muted-foreground">{row.app?.slug}</div></TableCell>
          <TableCell>{row.source||'—'}</TableCell><TableCell>{when(row.installedAt)}</TableCell>
          <TableCell><Badge appearance="light" variant={row.enabled?'success':'secondary'}>{row.status||'—'}</Badge></TableCell>
          <TableCell><Switch checked={row.enabled&&row.status!=='DISABLED'} disabled={busy===row.id} onCheckedChange={enabled=>void update(row,enabled)}/></TableCell>
        </TableRow>)}{!result.items.length?<TableRow><TableCell colSpan={6}><div className="grid justify-items-center gap-2 py-12 text-sm text-muted-foreground"><Store className="size-8"/>Kurulum bulunamadı.</div></TableCell></TableRow>:null}</TableBody></Table>}
      </CardContent></Card>
      <div className="flex items-center justify-end gap-3"><span className="text-sm text-muted-foreground">Sayfa {result.page} / {result.pages}</span><Button variant="outline" size="sm" disabled={loading||page<=1} onClick={()=>setPage(x=>Math.max(1,x-1))}>Önceki</Button><Button variant="outline" size="sm" disabled={loading||page>=result.pages} onClick={()=>setPage(x=>x+1)}>Sonraki</Button></div>
    </Container>
    <Dialog open={grantOpen} onOpenChange={setGrantOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Mağazaya Uygulama Tanımla</DialogTitle></DialogHeader><DialogBody className="grid gap-4">
      {error?<p className="text-sm text-destructive">{error}</p>:null}
      <label className="grid gap-2 text-sm font-medium">Mağaza<Select value={tenantId} onValueChange={setTenantId}><SelectTrigger><SelectValue placeholder="Mağaza seçin"/></SelectTrigger><SelectContent>{tenants.map(row=><SelectItem key={row.id} value={row.id}>{row.name} · {row.slug}</SelectItem>)}</SelectContent></Select></label>
      <label className="grid gap-2 text-sm font-medium">Uygulama<Select value={appId} onValueChange={setAppId}><SelectTrigger><SelectValue placeholder="Uygulama seçin"/></SelectTrigger><SelectContent>{apps.map(row=><SelectItem key={row.id} value={row.id}>{row.name} · {row.slug}</SelectItem>)}</SelectContent></Select></label>
      <p className="text-xs text-muted-foreground">Superadmin üzerinden yapılan tanımlama, ilgili mağazaya uygulama erişimi verir; otomatik ödeme oluşturmaz.</p>
    </DialogBody><DialogFooter><Button variant="outline" onClick={()=>setGrantOpen(false)}>İptal</Button><Button disabled={!tenantId||!appId||busy==='grant'} onClick={()=>void grant()}>{busy==='grant'?<LoaderCircle className="size-4 animate-spin"/>:null}Erişim Ver</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
