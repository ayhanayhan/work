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
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
type Installation={id:string;tenantId:string;themeId:string;status:string;source:string;installedAt:string;activatedAt?:string;tenant:{id:string;name:string;slug:string};theme:{id:string;name:string;slug:string;previewImageUrl?:string}};
type Result={items:Installation[];total:number;page:number;pages:number;limit:number};
type Row={id:string;name:string;slug:string};
export default function ThemeInstallationsPage(){
  const {request,restoring}=useMasterSession();
  const [data,setData]=useState<Result>({items:[],total:0,page:1,pages:1,limit:30});
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
  const [query,setQuery]=useState(''),[submitted,setSubmitted]=useState(''),[page,setPage]=useState(1);
  const [grantOpen,setGrantOpen]=useState(false),[tenants,setTenants]=useState<Row[]>([]),[themes,setThemes]=useState<Row[]>([]),[tenantId,setTenantId]=useState(''),[themeId,setThemeId]=useState('');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{const q=new URLSearchParams({page:String(page),limit:'30'});if(submitted)q.set('q',submitted);setData(await request('/superadmin/theme-installations?'+q.toString()))}
    catch(e:any){setError(e.message||'Tema kurulumları alınamadı.')}finally{setLoading(false)}
  },[request,restoring,page,submitted]);
  useEffect(()=>{void load()},[load]);
  const openGrant=async()=>{
    setGrantOpen(true);setError('');
    try{const [t,th]=await Promise.all([request('/superadmin/tenants'),request('/superadmin/themes')]);setTenants(Array.isArray(t)?t:[]);setThemes(Array.isArray(th)?th:[])}catch(e:any){setError(e.message||'Tanımlar alınamadı.')}
  };
  const grant=async()=>{
    if(!tenantId||!themeId){setError('Mağaza ve tema seçin.');return}
    setBusy(true);setError('');
    try{await request('/superadmin/tenants/'+encodeURIComponent(tenantId)+'/themes/'+encodeURIComponent(themeId)+'/grant',{method:'POST',body:'{}'});setGrantOpen(false);setTenantId('');setThemeId('');setPage(1);await load();setSuccess('Tema erişimi seçili mağazaya tanımlandı.')}
    catch(e:any){setError(e.message||'Tema erişimi oluşturulamadı.')}finally{setBusy(false)}
  };
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Tema Kurulumları</h1><ToolbarDescription>Mağazaların sahip olduğu tema paketlerini görüntüleyin ve manuel tema erişimi tanımlayın.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" asChild><Link href="/themes">Tema Kataloğu</Link></Button><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button><Button onClick={()=>void openGrant()}><Plus className="size-4"/>Mağazaya Tema Tanımla</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10"><Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><div className="text-xs text-muted-foreground">Toplam Tema Kurulumu</div><div className="mt-1 text-2xl font-semibold">{data.total}</div></div><div className="flex w-full max-w-lg gap-2"><Input value={query} placeholder="Mağaza veya tema ara" onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setPage(1);setSubmitted(query)}}}/><Button variant="outline" onClick={()=>{setPage(1);setSubmitted(query)}}><Search className="size-4"/>Ara</Button></div></CardContent></Card>
    {error&&!grantOpen?<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
    {success?<p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>:null}
    <Card><CardHeader><CardHeading>Kurulum Listesi</CardHeading></CardHeader><CardContent className="overflow-x-auto p-0">{loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin"/></div>:<Table><TableHeader><TableRow><TableHead>Mağaza</TableHead><TableHead>Tema Paketi</TableHead><TableHead>Kaynak</TableHead><TableHead>Durum</TableHead><TableHead>Kurulum</TableHead><TableHead>Aktivasyon</TableHead></TableRow></TableHeader><TableBody>{data.items.map(x=><TableRow key={x.id}>
      <TableCell><div className="font-medium">{x.tenant?.name||x.tenantId}</div><div className="text-xs text-muted-foreground">{x.tenant?.slug}</div></TableCell>
      <TableCell><div className="flex items-center gap-2">{x.theme?.previewImageUrl?<img src={x.theme.previewImageUrl} alt="" className="size-10 rounded border object-cover"/>:<Store className="size-5 text-muted-foreground"/>}<div><div className="font-medium">{x.theme?.name||x.themeId}</div><div className="text-xs text-muted-foreground">{x.theme?.slug}</div></div></div></TableCell>
      <TableCell>{x.source}</TableCell><TableCell><Badge appearance="light" variant={x.status==='ACTIVE'?'success':'secondary'}>{x.status}</Badge></TableCell>
      <TableCell>{new Date(x.installedAt).toLocaleString('tr-TR')}</TableCell><TableCell>{x.activatedAt?new Date(x.activatedAt).toLocaleString('tr-TR'):'—'}</TableCell>
    </TableRow>)}{!data.items.length?<TableRow><TableCell colSpan={6}><div className="py-12 text-center text-sm text-muted-foreground">Kurulum bulunamadı.</div></TableCell></TableRow>:null}</TableBody></Table>}</CardContent></Card>
    <div className="flex items-center justify-end gap-2 text-sm"><span>Sayfa {data.page} / {data.pages}</span><Button variant="outline" size="sm" disabled={loading||page<=1} onClick={()=>setPage(x=>Math.max(1,x-1))}>Önceki</Button><Button variant="outline" size="sm" disabled={loading||page>=data.pages} onClick={()=>setPage(x=>x+1)}>Sonraki</Button></div>
    </Container>
    <Dialog open={grantOpen} onOpenChange={setGrantOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Mağazaya Tema Erişimi Ver</DialogTitle></DialogHeader><DialogBody className="grid gap-4">
      {error?<p className="text-sm text-destructive">{error}</p>:null}
      <label className="grid gap-2 text-sm font-medium">Mağaza<Select value={tenantId} onValueChange={setTenantId}><SelectTrigger><SelectValue placeholder="Mağaza seçin"/></SelectTrigger><SelectContent>{tenants.map(x=><SelectItem key={x.id} value={x.id}>{x.name} · {x.slug}</SelectItem>)}</SelectContent></Select></label>
      <label className="grid gap-2 text-sm font-medium">Tema paketi<Select value={themeId} onValueChange={setThemeId}><SelectTrigger><SelectValue placeholder="Tema seçin"/></SelectTrigger><SelectContent>{themes.map(x=><SelectItem key={x.id} value={x.id}>{x.name} · {x.slug}</SelectItem>)}</SelectContent></Select></label>
      <p className="text-xs text-muted-foreground">Bu işlem tema erişimi verir; mağazanın aktif temasını otomatik değiştirmez veya ödeme almaz.</p>
    </DialogBody><DialogFooter><Button variant="outline" onClick={()=>setGrantOpen(false)}>İptal</Button><Button disabled={!tenantId||!themeId||busy} onClick={()=>void grant()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:null}Erişim Ver</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
