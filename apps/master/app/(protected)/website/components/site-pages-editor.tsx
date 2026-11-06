'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ImageIcon,LoaderCircle,RefreshCw,Save,Search,Type} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {MediaField} from '@/app/(protected)/catalog/components/catalog-fields';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import schema from './site-page-fields.json';

type I18n=Record<string,string>;
type CMSData={id:string;version:number;values:Record<string,I18n>};
type Field={id:string;label:string;type:'text'|'image';default:string};
const pages=schema.pages as {id:string;title:string;source:string;fields:Field[]}[];
export default function SitePagesEditor(){
  const {request,restoring}=useMasterSession();
  const [pageId,setPageId]=useState('home'),[locale,setLocale]=useState('tr');
  const [data,setData]=useState<CMSData|null>(null),[fields,setFields]=useState<Record<string,I18n>>({});
  const [langs,setLangs]=useState<{locale:string;label:string}[]>([{locale:'tr',label:'Türkçe'},{locale:'en',label:'English'},{locale:'pt',label:'Português'},{locale:'ru',label:'Русский'}]);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [q,setQ]=useState(''),[kind,setKind]=useState('all'),[limit,setLimit]=useState(40);
  const selected=pages.find(x=>x.id===pageId)||pages[0];
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');setNotice('');
    try{const result=await request('/superadmin/website/pages/'+encodeURIComponent(pageId));setData(result);setFields(result.values||{});}
    catch(e:any){setError(e?.message||'Sayfa içeriği yüklenemedi.')}finally{setLoading(false)}
  },[restoring,request,pageId]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{if(restoring)return;request('/superadmin/platform-locales').then((ls:any[])=>{
    if(!Array.isArray(ls))return;
    const seen=new Set<string>();const out=ls.map(x=>({locale:String(x.locale||'').split('-')[0].toLowerCase(),label:x.label||x.locale})).filter(x=>{if(!x.locale||seen.has(x.locale))return false;seen.add(x.locale);return true});
    if(out.length)setLangs(out);
  }).catch(()=>{})},[request,restoring]);
  const filtered=useMemo(()=>selected.fields.filter(f=>(kind==='all'||(kind==='image'?f.type==='image':kind==='heading'?f.label.toLowerCase().includes('başlık'):f.type==='text'))&&(!q.trim()||[f.id,f.label,f.default].join(' ').toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')))),[selected,q,kind]);
  const put=(id:string,value:string)=>setFields(old=>({...old,[id]:{...(old[id]||{}),[locale]:value}}));
  const dirty=!!data&&JSON.stringify(fields)!==JSON.stringify(data.values||{});
  const save=async()=>{
    if(!data)return;
    setSaving(true);setError('');setNotice('');
    try{const result=await request('/superadmin/website/pages/'+encodeURIComponent(pageId),{method:'PATCH',body:JSON.stringify({version:data.version,values:fields})});setData(result);setFields(result.values);setNotice('Sayfa metin ve görselleri kaydedildi. Mevcut HTML/CSS tasarımına dokunulmadı.')}
    catch(e:any){setError(e?.message||'Değişiklikler kaydedilemedi.')}finally{setSaving(false)}
  };
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Ticarti.com · Sayfa İçerikleri</h1><ToolbarDescription>Orijinal tasarım sabit; metin ve görseller çok dilli ve alan bazında düzenlenir.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="size-4"/>Yenile</Button><Button onClick={()=>void save()} disabled={!dirty||saving}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-4 pb-10">
      {error?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
      {notice?<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</div>:null}
      <Card><CardContent className="flex flex-wrap gap-2 p-4">{pages.map(p=><Button size="sm" key={p.id} variant={pageId===p.id?'primary':'outline'} onClick={()=>{if(dirty&&!window.confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?'))return;setPageId(p.id);setLimit(40);setQ('')}}>{p.title}</Button>)}</CardContent></Card>
      <Card><CardHeader><CardHeading>{selected.title} · {selected.fields.length} alan</CardHeading><p className="mt-1 text-sm text-muted-foreground">Boş bırakılan alanlarda sitenin orijinal içeriği kalır. HTML, CSS ve animasyonlar burada değiştirilmez.</p></CardHeader><CardContent className="grid gap-5">
        <div className="flex flex-wrap gap-2 border-b pb-3">{langs.map(x=><Button size="sm" key={x.locale} variant={locale===x.locale?'primary':'outline'} onClick={()=>setLocale(x.locale)}>{x.label}</Button>)}</div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]"><div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={q} onChange={e=>{setQ(e.target.value);setLimit(40)}} placeholder="Başlık, açıklama veya orijinal metinde ara"/></div><select className="rounded-md border bg-background px-3 text-sm" value={kind} onChange={e=>{setKind(e.target.value);setLimit(40)}}><option value="all">Tüm alanlar</option><option value="heading">Başlıklar</option><option value="image">Görseller</option><option value="text">Diğer metinler</option></select></div>
        {loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="size-5 animate-spin"/></div>:<div className="grid gap-4">{filtered.slice(0,limit).map(field=><label key={field.id} className="grid gap-2 rounded-lg border p-4 text-sm">
          <span className="flex items-center gap-2 font-medium">{field.type==='image'?<ImageIcon className="size-4"/>:<Type className="size-4"/>}{field.label} <span className="text-xs font-normal text-muted-foreground">{field.id}</span></span>
          <span className="line-clamp-2 text-xs text-muted-foreground">Mevcut: {field.default.slice(0,160)}</span>
          {field.type==='image'?<MediaField label="Görsel değiştir" value={fields[field.id]?.[locale]||''} onChange={value=>put(field.id,value)}/>:field.default.length>180?<Textarea rows={3} placeholder={field.default.slice(0,200)} value={fields[field.id]?.[locale]||''} onChange={e=>put(field.id,e.target.value)}/>:<Input placeholder={field.default.slice(0,160)} value={fields[field.id]?.[locale]||''} onChange={e=>put(field.id,e.target.value)}/>}
          <span className="text-xs text-muted-foreground">{locale.toUpperCase()} · Boş alan orijinal metni kullanır.</span>
        </label>)}{filtered.length>limit?<Button variant="outline" onClick={()=>setLimit(x=>x+40)}>40 alan daha göster ({filtered.length-limit} kaldı)</Button>:null}{!filtered.length?<p className="py-10 text-center text-sm text-muted-foreground">Aramanıza uygun düzenlenebilir alan bulunamadı.</p>:null}</div>}
        <div className="flex justify-end border-t pt-4"><Button disabled={!dirty||saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Değişiklikleri Kaydet</Button></div>
      </CardContent></Card>
    </Container>
  </>;
}
