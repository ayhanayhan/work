'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {BarChart3,Mail,Pause,Play,Plus,RefreshCw,Settings2,Users} from 'lucide-react';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarHeading} from '@/layouts/demo1/components/toolbar';
import {Card,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Dialog,DialogBody,DialogContent,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {useAdminSession} from '@/app/components/AdminSession';
import {FormField,FormSection} from '@/app/(protected)/components/marketing-form-ui';
import {VisualEmailBuilder,emailBlockDefault,type VisualEmailBlock} from '@/app/(protected)/components/visual-email-builder';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const fmt=(n:any)=>new Intl.NumberFormat('tr-TR').format(Number(n||0));
const trStatus=(s:string)=>({DRAFT:'Taslak',SCHEDULED:'Gönderimde',PAUSED:'Duraklatıldı',COMPLETED:'Tamamlandı',FAILED:'Hata'} as Record<string,string>)[s]||s;

const campaignBlocks=():VisualEmailBlock[]=>{
  const header=emailBlockDefault('HEADER');
  const heading=emailBlockDefault('HEADING');heading.content.text='Yeni kampanyamızı keşfedin';
  const text=emailBlockDefault('TEXT');text.content.text='Size özel seçtiğimiz ürünleri ve fırsatları inceleyin.';
  const products=emailBlockDefault('PRODUCT_GRID');
  const button=emailBlockDefault('BUTTON');button.content.text='Alışverişe başla';button.content.url='';
  const footer=emailBlockDefault('FOOTER');footer.content.showLogo=true;
  return [header,heading,text,products,button,footer];
};
const blank=()=>({id:'',name:'',subject:'',preheader:'',segmentId:'',domainId:'',senderLocal:'kampanya',blocks:campaignBlocks()});

export default function Page(){
  const{session}=useAdminSession();
  const[items,setItems]=useState<any[]>([]),[segments,setSegments]=useState<any[]>([]),[products,setProducts]=useState<any[]>([]),[categories,setCategories]=useState<any[]>([]),[pages,setPages]=useState<any[]>([]);
  const[emailSettings,setEmailSettings]=useState<any>(null),[store,setStore]=useState<any>(null),[usage,setUsage]=useState<any>(null),[policy,setPolicy]=useState<any>(null);
  const[open,setOpen]=useState(false),[form,setForm]=useState<any>(blank()),[error,setError]=useState(''),[busy,setBusy]=useState(''),[report,setReport]=useState<any>(null),[reportOpen,setReportOpen]=useState(false);

  const req=useCallback(async(path:string,init?:RequestInit)=>{
    if(!session)throw new Error('Oturum bulunamadı');
    const sep=path.includes('?')?'&':'?';
    const url=`${API}${path}${path.includes('storeId=')?'':`${sep}storeId=${encodeURIComponent(session.storeId)}`}`;
    const r=await fetch(url,{...init,credentials:'include',headers:{'content-type':'application/json',authorization:`Bearer ${session.accessToken}`,'x-tenant-id':session.tenantId,...(init?.headers||{})}});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):(j.message||`HTTP ${r.status}`));return j;
  },[session]);

  const load=useCallback(async()=>{
    if(!session)return;setError('');
    try{
      const results=await Promise.allSettled([
        req('/admin/email/campaigns'),req('/admin/growth/segments'),req('/admin/products?limit=200'),req('/admin/categories?limit=200'),req('/admin/pages'),req('/admin/email/settings'),req(`/admin/store-settings/${session.storeId}`),req('/admin/email/marketing/status'),req('/admin/email/marketing/usage'),
      ]);
      const val=(i:number,fallback:any)=>results[i].status==='fulfilled'?(results[i] as PromiseFulfilledResult<any>).value:fallback;
      const campaigns=val(0,[]),segs=val(1,{items:[]}),prods=val(2,[]),cats=val(3,[]),pgs=val(4,[]);
      setItems(Array.isArray(campaigns)?campaigns:campaigns?.items||[]);setSegments(segs?.items||[]);setProducts(Array.isArray(prods)?prods:prods?.items||[]);setCategories(Array.isArray(cats)?cats:cats?.items||[]);setPages(Array.isArray(pgs)?pgs:pgs?.items||[]);
      setEmailSettings(val(5,null));setStore(val(6,null));setPolicy(val(7,null));setUsage(val(8,null));
    }catch(e:any){setError(e?.message||'E-posta pazarlama verileri yüklenemedi.');}
  },[req,session]);
  useEffect(()=>{void load()},[load]);

  const marketingDomains=useMemo(()=>((emailSettings?.domains||[]) as any[]).filter(x=>x.purpose==='MARKETING'&&x.status==='VERIFIED'&&x.mktVerified),[emailSettings]);
  const totals=useMemo(()=>({campaigns:items.length,sent:items.reduce((n,x)=>n+Number(x.sentCount||0),0),clicks:items.reduce((n,x)=>n+Number(x.clickCount||0),0)}),[items]);

  const start=(row?:any)=>{
    if(row){setForm({id:row.id,name:row.name||'',subject:row.subject||'',preheader:row.preheader||'',segmentId:row.audience?.segmentId||'',domainId:row.domainId||'',senderLocal:row.senderLocal||'kampanya',blocks:Array.isArray(row.blocks)&&row.blocks.length?row.blocks:campaignBlocks()});}
    else setForm({...blank(),domainId:marketingDomains[0]?.id||''});
    setOpen(true);
  };
  const save=async()=>{
    const blocks=Array.isArray(form.blocks)?form.blocks:[];const firstButton=blocks.find((b:any)=>b.type==='BUTTON');const heading=blocks.find((b:any)=>b.type==='HEADING');
    const bodyText=blocks.map((b:any)=>b.content?.text||b.content?.left||b.content?.right||(Array.isArray(b.content?.items)?b.content.items.map((x:any)=>x.label).join(' '):'')).filter(Boolean).join('\n\n');
    if(!form.name.trim()||!form.subject.trim()){setError('Kampanya adı ve e-posta konusu zorunludur.');return;}
    setBusy('save');setError('');
    try{
      const body={name:form.name,subject:form.subject,preheader:form.preheader,headline:heading?.content?.text||form.subject,buttonText:firstButton?.content?.text||null,buttonUrl:firstButton?.content?.url||null,domainId:form.domainId||null,senderLocal:form.senderLocal||'kampanya',audience:form.segmentId?{segmentId:form.segmentId}:{},blocks,bodyText};
      await req(`/admin/email/campaigns${form.id?`/${form.id}`:''}`,{method:form.id?'PUT':'POST',body:JSON.stringify(body)});setOpen(false);setForm(blank());await load();
    }catch(e:any){setError(e?.message||'Kampanya kaydedilemedi.');}finally{setBusy('');}
  };
  const action=async(key:string,fn:()=>Promise<any>)=>{setBusy(key);setError('');try{await fn();await load()}catch(e:any){setError(e?.message||'İşlem başarısız.')}finally{setBusy('')}};
  const openReport=async(id:string)=>{setBusy(`report:${id}`);setError('');try{setReport(await req(`/admin/email/campaigns/${id}/report`));setReportOpen(true)}catch(e:any){setError(e?.message||'Rapor alınamadı.')}finally{setBusy('')}};

  return <>
    <Container><Toolbar><ToolbarHeading title="E-posta Pazarlama" description="Kampanya oluşturun, hedef kitleyi seçin, gönderimi yönetin ve sonuçları ölçün."/><ToolbarActions><Button variant="outline" asChild><Link href="/settings/email-sender"><Settings2 className="size-4"/>E-posta ayarları</Link></Button><Button onClick={()=>start()}><Plus className="size-4"/>Yeni kampanya</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5">
      {error?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Kampanya</span><Mail className="size-4"/></div><div className="mt-2 text-2xl font-semibold">{fmt(totals.campaigns)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Gönderilen</span><Users className="size-4"/></div><div className="mt-2 text-2xl font-semibold">{fmt(totals.sent)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Tıklama</span><BarChart3 className="size-4"/></div><div className="mt-2 text-2xl font-semibold">{fmt(totals.clicks)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Aylık kullanım</div><div className="mt-2 text-2xl font-semibold">{usage?`${fmt(usage.used)} / ${fmt(usage.limit)}`:'—'}</div><div className="mt-1 text-xs text-muted-foreground">Ek kredi: {usage?fmt(usage.extraCredits):'—'}</div></CardContent></Card>
      </div>
      {policy&&policy.approvalStatus!=='APPROVED'?<div className="rounded-lg border bg-muted/20 p-4 text-sm">Pazarlama gönderimi için hesabın onay durumu: <strong>{policy.approvalStatus||'Bekliyor'}</strong>. DNS ve gönderici ayarları Ayarlar &gt; E-posta bölümünden yönetilir.</div>:null}
      <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30"><th className="p-3 text-left">Kampanya</th><th className="p-3 text-left">Hedef kitle</th><th className="p-3 text-center">Durum</th><th className="p-3 text-center">Gönderilen</th><th className="p-3 text-center">Tıklama</th><th className="p-3"/></tr></thead><tbody>
        {items.map(x=><tr key={x.id} className="border-b"><td className="p-3"><div className="font-medium">{x.name}</div><div className="text-xs text-muted-foreground">{x.subject}</div></td><td className="p-3">{x.audience?.segmentId?(segments.find(s=>s.id===x.audience.segmentId)?.name||'Segment'):'Tüm izinli müşteriler'}</td><td className="p-3 text-center"><Badge appearance="light">{trStatus(x.status)}</Badge></td><td className="p-3 text-center">{fmt(x.sentCount)}</td><td className="p-3 text-center">{fmt(x.clickCount)}</td><td className="p-3"><div className="flex justify-end gap-2">{x.status==='DRAFT'?<><Button size="sm" variant="outline" onClick={()=>start(x)}>Düzenle</Button><Button size="sm" disabled={!!busy||!x.domainId} onClick={()=>void action(`send:${x.id}`,()=>req(`/admin/email/campaigns/${x.id}/schedule`,{method:'POST'}))}><Play className="size-4"/>Gönderime Al</Button></>:null}{x.status==='SCHEDULED'?<Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void action(`pause:${x.id}`,()=>req(`/admin/email/campaigns/${x.id}/pause`,{method:'POST'}))}><Pause className="size-4"/>Duraklat</Button>:null}{x.status!=='DRAFT'?<Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void openReport(x.id)}><BarChart3 className="size-4"/>Rapor</Button>:null}</div></td></tr>)}
        {!items.length?<tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Henüz e-posta kampanyası yok.</td></tr>:null}
      </tbody></table></CardContent></Card>
      <div className="flex justify-end"><Button variant="ghost" onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button></div>
    </Container>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-[96vw]"><DialogHeader><DialogTitle>{form.id?'Kampanyayı Düzenle':'Yeni E-posta Kampanyası'}</DialogTitle></DialogHeader><DialogBody className="grid max-h-[84vh] gap-5 overflow-y-auto">
      <FormSection title="Kampanya bilgileri"><div className="grid gap-4 md:grid-cols-2"><FormField label="Kampanya adı" required><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></FormField><FormField label="Hedef kitle"><Select value={form.segmentId||'ALL'} onValueChange={v=>setForm({...form,segmentId:v==='ALL'?'':v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Pazarlama izni olan tüm müşteriler</SelectItem>{segments.map(x=><SelectItem key={x.id} value={x.id}>{x.name} ({fmt(x.estimatedCount)})</SelectItem>)}</SelectContent></Select></FormField><FormField label="E-posta konusu" required><Input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></FormField><FormField label="Preheader"><Input value={form.preheader} onChange={e=>setForm({...form,preheader:e.target.value})}/></FormField><FormField label="Marketing gönderim alan adı"><Select value={form.domainId||'NONE'} onValueChange={v=>setForm({...form,domainId:v==='NONE'?'':v})}><SelectTrigger><SelectValue placeholder="Doğrulanmış domain seçin"/></SelectTrigger><SelectContent><SelectItem value="NONE">Domain seçilmedi</SelectItem>{marketingDomains.map(x=><SelectItem key={x.id} value={x.id}>{x.domain}</SelectItem>)}</SelectContent></Select></FormField><FormField label="Gönderen adresinin @ öncesi"><Input value={form.senderLocal} onChange={e=>setForm({...form,senderLocal:e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g,'')})}/></FormField></div><div className="mt-3 text-xs text-muted-foreground">Domain doğrulama, SES/IYS ve gönderici altyapısı <Link className="underline" href="/settings/email-sender">E-posta ayarlarından</Link> yönetilir.</div></FormSection>
      <VisualEmailBuilder value={form.blocks} onChange={blocks=>setForm({...form,blocks})} products={products} categories={categories} pages={pages} store={store?{name:store.name,logoUrl:store.logoUrl,currency:store.currency,email:store.email,phone:store.phone,companyName:store.companyName,addressText:store.addressText,mersisNo:store?.general?.invoice?.mersisNo||store?.settings?.general?.invoice?.mersisNo||''}:undefined}/>
    </DialogBody><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>İptal</Button><Button disabled={busy==='save'} onClick={()=>void save()}>{busy==='save'?'Kaydediliyor…':'Taslak Kaydet'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent><DialogHeader><DialogTitle>Kampanya Raporu</DialogTitle></DialogHeader><DialogBody>{report?<div className="grid grid-cols-2 gap-3"><Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Gönderilen</div><div className="text-xl font-semibold">{fmt(report.sent)}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tıklama</div><div className="text-xl font-semibold">{fmt(report.clicked)}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Atfedilen sipariş</div><div className="text-xl font-semibold">{fmt(report.attributedOrders)}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Atfedilen ciro</div><div className="text-xl font-semibold">{new Intl.NumberFormat('tr-TR',{style:'currency',currency:report.currency||'TRY'}).format(Number(report.attributedRevenue||0))}</div></CardContent></Card></div>:null}</DialogBody><DialogFooter><Button onClick={()=>setReportOpen(false)}>Kapat</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
