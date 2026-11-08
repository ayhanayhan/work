'use client';
import {useCallback,useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,LoaderCircle,Plus,RefreshCw,Save,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card,CardContent} from '@/components/ui/card';
import {Switch} from '@/components/ui/switch';
type Localized=Record<string,string>;
type Link={id:string;label:Localized;url:string;enabled:boolean};
type Group={id:string;area:string;title:Localized;links:Link[]};
type Menu={version:number;groups:Group[]};
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const names:Record<string,string>={
 'header-companies-1':'Çözümler · İşletme ölçeği',
 'header-companies-2':'Çözümler · Ticaret operasyonları',
 'header-companies-3':'Çözümler · Satış ve büyüme',
 'header-companies-4':'Çözümler · Entegrasyon ve analiz',
 'header-resources-1':'Kaynaklar · Ürünü keşfet',
 'header-resources-2':'Kaynaklar · Rehberler',
 'header-resources-3':'Kaynaklar · Ticarti hakkında',
 'footer-1':'Footer · Ticarti','footer-2':'Footer · Kurumsal',
 'footer-3':'Footer · E-ticaret ve e-ihracat','footer-4':'Footer · Kaynaklar'
};
const id=()=> 'link-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
export default function NavigationEditor(){
 const {request,restoring,locales,localesError}=useMasterSession();
 const [saved,setSaved]=useState<Menu|null>(null),[draft,setDraft]=useState<Menu|null>(null);
 const [active,setActive]=useState('header-resources-2'),[locale,setLocale]=useState('tr');
 const [saving,setSaving]=useState(false),[loading,setLoading]=useState(true);
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(locales.length)setLocale(old=>locales.some(l=>l.locale===old)?old:(locales.find(l=>l.isDefault)?.locale||locales[0].locale));},[locales]);
 const load=useCallback(async()=>{
  if(restoring)return;
  setLoading(true);setError('');
  try{
   const result=await request('/superadmin/website/navigation') as Menu;
   if(!Array.isArray(result?.groups))throw Error('Menü verileri alınamadı.');
   setSaved(result);setDraft(clone(result));
  }catch(e:any){setError(e?.message||'Menüler alınamadı.')}
  finally{setLoading(false)}
 },[request,restoring]);
 useEffect(()=>{void load()},[load]);
 const dirty=!!draft&&!!saved&&JSON.stringify(draft.groups)!==JSON.stringify(saved.groups);
 const group=draft?.groups.find(x=>x.id===active);
 const setGroup=(fn:(group:Group)=>Group)=>setDraft(old=>old?{...old,groups:old.groups.map(g=>g.id===active?fn(g):g)}:old);
 const select=(next:string)=>{if(dirty&&!window.confirm('Kaydedilmemiş değişiklikler var. Vazgeçilsin mi?'))return;
  setDraft(saved?clone(saved):null);setActive(next);setMessage('');setError('')};
 const selectLocale=(next:string)=>{if(dirty&&!window.confirm('Kaydedilmemiş değişiklikler var. Vazgeçilsin mi?'))return;
  setDraft(saved?clone(saved):null);setLocale(next);setMessage('');setError('')};
 const changeLink=(linkId:string,fn:(item:Link)=>Link)=>setGroup(g=>({...g,
  links:g.links.map(link=>link.id===linkId?fn(link):link)}));
 const move=(index:number,delta:number)=>setGroup(g=>{
  const links=[...g.links],to=index+delta;
  if(to<0||to>=links.length)return g;
  [links[index],links[to]]=[links[to],links[index]];
  return {...g,links};
 });
 const save=async()=>{
  if(!draft||saving)return;
  setSaving(true);setError('');setMessage('');
  try{
   const result=await request('/superadmin/website/navigation',{method:'PATCH',body:JSON.stringify(draft)}) as Menu;
   if(!Array.isArray(result?.groups)||typeof result.version!=='number')throw Error('Kayıt doğrulanamadı.');
   setSaved(result);setDraft(clone(result));setMessage('Menüler kaydedildi. Ticarti.com üzerinde yeni içerik kullanılacak.');
  }catch(e:any){setError(e?.message||'Menü kaydedilemedi.');}
  finally{setSaving(false)}
 };
 return <Container className="grid gap-5 pb-12">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-semibold">Menü Yönetimi</h1>
    <p className="mt-1 text-sm text-muted-foreground">Ticarti.com masaüstü/mobil açılır menülerini ve footer bağlantılarını yönetin.</p></div>
   <div className="flex gap-2">
    <Button variant="outline" disabled={loading||saving} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button>
    <Button disabled={loading||saving||!draft} onClick={()=>void save()}>
     {saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button>
   </div>
  </div>
  {error?<p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>:null}
  {message?<p role="status" className="rounded-md border p-3 text-sm">{message}</p>:null}
  {localesError?<p className="text-sm text-destructive">{localesError}</p>:null}
  <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3">
   {locales.map(l=><Button key={l.locale} size="sm" variant={locale===l.locale?'primary':'outline'}
    onClick={()=>selectLocale(l.locale)}>{l.label||l.locale}</Button>)}
  </div>
  {loading?<div className="p-10 text-center text-sm">Menüler yükleniyor…</div>:draft?
   <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
    <nav aria-label="Menü grupları" className="sticky top-20 grid gap-1 rounded-lg border bg-card p-3">
     <div className="px-2 py-2 text-xs font-semibold text-muted-foreground">HEADER</div>
     {draft.groups.filter(g=>g.area==='header').map(g=><button key={g.id} type="button"
      onClick={()=>select(g.id)} className={'rounded-md px-3 py-2 text-left text-sm '+(active===g.id?'bg-primary text-primary-foreground':'hover:bg-muted')}>
      {names[g.id]||g.id}</button>)}
     <div className="px-2 pt-5 pb-2 text-xs font-semibold text-muted-foreground">FOOTER</div>
     {draft.groups.filter(g=>g.area==='footer').map(g=><button key={g.id} type="button"
      onClick={()=>select(g.id)} className={'rounded-md px-3 py-2 text-left text-sm '+(active===g.id?'bg-primary text-primary-foreground':'hover:bg-muted')}>
      {names[g.id]||g.id}</button>)}
    </nav>
    {group?<Card><CardContent className="grid gap-5 p-5">
     <div><h2 className="font-semibold">{names[group.id]||group.id}</h2>
      <p className="mt-1 text-xs text-muted-foreground">Buradaki bağlantılar orijinal Ticarti menü stilleriyle gösterilir. Değişiklikler tüm cihazlara uygulanır.</p></div>
     <label className="grid gap-2 text-sm">Sütun başlığı
      <Input value={group.title?.[locale]||''} onChange={e=>setGroup(g=>({...g,title:{...g.title,[locale]:e.target.value}}))}/>
     </label>
     <div className="flex justify-between gap-3">
      <h3 className="font-semibold">Bağlantılar ({group.links.length})</h3>
      <Button size="sm" variant="outline" disabled={group.links.length>=40}
       onClick={()=>setGroup(g=>({...g,links:[...g.links,{id:id(),label:{},url:'',enabled:true}]}))}>
       <Plus className="size-4"/>Bağlantı Ekle</Button>
     </div>
     {group.links.map((link,index)=><div key={link.id} className="grid gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <span className="text-xs text-muted-foreground">Bağlantı {index+1}</span>
       <div className="flex items-center gap-2">
        <Switch checked={link.enabled} onCheckedChange={value=>changeLink(link.id,item=>({...item,enabled:value}))}/>
        <Button variant="outline" size="sm" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp className="size-4"/></Button>
        <Button variant="outline" size="sm" disabled={index===group.links.length-1} onClick={()=>move(index,1)}><ArrowDown className="size-4"/></Button>
        <Button variant="outline" size="sm" onClick={()=>setGroup(g=>({...g,links:g.links.filter(x=>x.id!==link.id)}))}><Trash2 className="size-4"/></Button>
       </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
       <label className="grid gap-1 text-sm">Menü metni
        <Input value={link.label?.[locale]||''} onChange={e=>changeLink(link.id,item=>({...item,label:{...item.label,[locale]:e.target.value}}))}/></label>
       <label className="grid gap-1 text-sm">Bağlantı URL
        <Input value={link.url} placeholder="/araclar" onChange={e=>changeLink(link.id,item=>({...item,url:e.target.value}))}/></label>
      </div>
     </div>)}
     <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}><Save className="size-4"/>Menüyü Kaydet</Button></div>
    </CardContent></Card>:null}
   </div>:null}
 </Container>;
}
