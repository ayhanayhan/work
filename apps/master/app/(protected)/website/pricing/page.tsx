'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowLeft,LoaderCircle,Plus,Save,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
type Fields=Record<string,string>;
type Item={id:string;enabled:boolean;question:Fields;answer:Fields};
type PricingFaq={enabled:boolean;heading:Fields;description:Fields;items:Item[]};
const normalize=(data:any):PricingFaq=>({
 enabled:data?.enabled!==false,heading:data?.heading||{},description:data?.description||{},
 items:Array.isArray(data?.items)?data.items.map((x:any)=>({
  id:String(x.id||''),enabled:x.enabled!==false,question:x.question||{},answer:x.answer||{}
 })):[]
});
export function PricingFaqPage(){
 const {request,restoring,locales,localesLoading}=useMasterSession();
 const [data,setData]=useState<PricingFaq|null>(null);
 const [locale,setLocale]=useState('tr');
 const [saving,setSaving]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 useEffect(()=>{if(restoring)return;let active=true;
  void request('/superadmin/website/pricing-faq').then(x=>{if(active)setData(normalize(x))})
  .catch((e:any)=>{if(active)setError(e.message||'SSS içeriği yüklenemedi.')})
  .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false}
 },[request,restoring]);
 useEffect(()=>{if(locales.length&&!locales.some(x=>x.locale===locale))setLocale(locales.find(x=>x.isDefault)?.locale||locales[0].locale)},[locales,locale]);
 const patch=(field:'heading'|'description',value:string)=>{if(!data)return;setData({...data,[field]:{...data[field],[locale]:value}});setMessage('')};
 const itemPatch=(index:number,field:'question'|'answer'|'enabled',value:string|boolean)=>{if(!data)return;setData({...data,items:data.items.map((x,i)=>i!==index?x:field==='enabled'?{...x,enabled:value===true}:{...x,[field]:{...x[field],[locale]:value}})});setMessage('')};
 const add=()=>{if(!data||data.items.length>=40)return;setData({...data,items:[...data.items,{id:'pricing-faq-'+Date.now(),enabled:true,question:{},answer:{}}]})};
 const remove=(id:string)=>{if(!data)return;setData({...data,items:data.items.filter(x=>x.id!==id)})};
 const save=async()=>{if(!data)return;setSaving(true);setError('');setMessage('');
  try{const updated=await request('/superadmin/website/pricing-faq',{method:'PATCH',body:JSON.stringify(data)});setData(normalize(updated));setMessage('Paketler SSS kaydedildi. Yayındaki içerik API üzerinden güncellenecek.')}
  catch(e:any){setError(e.message||'SSS kaydedilemedi.')}finally{setSaving(false)}
 };
 return <>
  <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Paketler · Sık Sorulan Sorular</h1><ToolbarDescription>Ticarti.com Paketler sayfasındaki SSS içeriklerini aktif dillerde yönetin.</ToolbarDescription></ToolbarHeading>
   <ToolbarActions><Button variant="outline" asChild><Link href="/products"><ArrowLeft/>Paketler</Link></Button><Button disabled={saving||!data} onClick={()=>void save()}>{saving?<LoaderCircle className="animate-spin"/>:<Save/>}Kaydet</Button></ToolbarActions>
  </Toolbar></Container>
  <Container className="grid gap-4 pb-10">
   {error?<div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
   {message?<div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>:null}
   {loading||!data?<div className="flex min-h-60 items-center justify-center"><LoaderCircle className="animate-spin"/></div>:<>
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
     <label className="flex items-center gap-3 text-sm font-medium"><Switch checked={data.enabled} onCheckedChange={enabled=>setData({...data,enabled})}/>Paketler sayfasında SSS göster</label>
     <label className="flex items-center gap-3 text-sm font-medium">Düzenleme dili
      <Select value={locale} onValueChange={setLocale} disabled={localesLoading}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger>
       <SelectContent>{locales.map(l=><SelectItem key={l.locale} value={l.locale}>{l.label} · {l.locale.toUpperCase()}</SelectItem>)}</SelectContent>
      </Select>
     </label>
    </div>
    <Card><CardHeader><CardHeading>SSS başlığı ve açıklaması</CardHeading></CardHeader>
     <CardContent className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">Başlık<Input value={data.heading[locale]||''} onChange={e=>patch('heading',e.target.value)} placeholder="Sıkça sorulan sorular"/></label>
      <label className="grid gap-2 text-sm font-medium">Açıklama<Textarea rows={3} value={data.description[locale]||''} onChange={e=>patch('description',e.target.value)}/></label>
     </CardContent>
    </Card>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Sorular ({data.items.length})</h2><Button variant="outline" onClick={add} disabled={data.items.length>=40}><Plus/>Soru ekle</Button></div>
    {data.items.map((item,index)=><Card key={item.id}><CardHeader><div className="flex items-center justify-between gap-2"><CardHeading>{index+1}. Soru</CardHeading><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs"><Switch checked={item.enabled} onCheckedChange={enabled=>itemPatch(index,'enabled',enabled)}/>Aktif</label><Button size="icon" variant="ghost" aria-label="Soruyu sil" onClick={()=>remove(item.id)}><Trash2 className="size-4"/></Button></div></div></CardHeader>
     <CardContent className="grid gap-4"><label className="grid gap-2 text-sm font-medium">Soru<Input value={item.question[locale]||''} onChange={e=>itemPatch(index,'question',e.target.value)} placeholder="Soru metni"/></label>
      <label className="grid gap-2 text-sm font-medium">Cevap<Textarea rows={4} value={item.answer[locale]||''} onChange={e=>itemPatch(index,'answer',e.target.value)} placeholder="Açıklayıcı cevap"/></label>
     </CardContent></Card>)}
    <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="animate-spin"/>:<Save/>}Kaydet</Button></div>
   </>}
  </Container>
 </>;
}
