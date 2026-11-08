'use client';

import {useCallback,useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,GripVertical,LoaderCircle,Plus,RefreshCw,Save,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Button} from '@/components/ui/button';
import {Card,CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {MediaField} from '@/app/(protected)/catalog/components/catalog-fields';

type LangMap=Record<string,string>;
type Values=Record<string,LangMap>;
type Entry={id:string;enabled:boolean;sortOrder?:number;fields:Values;assets?:{image?:string;logo?:string};links?:{href?:string};storeId?:string};
type Logo={id:string;enabled:boolean;fields:{title:LangMap};assets:{image:string};storeId?:string};
type Module={id:string;title:string;selector:string;enabled:boolean;sortOrder:number;configured?:boolean;fields:Values;items:Entry[];logos?:Logo[];ctaEnabled?:boolean;categoryIds?:string[]};
type Snapshot={version:number;modules:Module[]};
type Locale={locale:string;label:string;isDefault:boolean};
const MODULE_FIELDS:Record<string,string[]>={
 hero:['heading','description','offer','button','buttonUrl','formButton','consentText','consentLinkText','phonePlaceholder','phoneEmpty','phoneInvalid','kvkkRequired','notConnected'],
 animated:['heading','description'],builder:[],radar:['heading','description'],channels:['heading','description'],
 showcase:['heading','description'],references:['heading'],bottomCta:['heading','offer'],
 blog:['heading','description'],faq:['heading','description','button','buttonUrl']
};
const ITEM_FIELDS:Record<string,string[]>={
 hero:['heading','description'],animated:['heading'],builder:['heading','description'],
 radar:['heading','description'],channels:['description','button'],
 showcase:['heading','role','description','button'],references:['heading','description'],
 faq:['question','answer']
};
const LABELS:Record<string,string>={
 heading:'Başlık',description:'Açıklama',offer:'Kampanya metni',role:'Alt başlık',
 button:'Buton metni',buttonUrl:'Buton bağlantısı',formButton:'Form butonu',
 consentText:'KVKK metni',consentLinkText:'KVKK bağlantı metni',
 phonePlaceholder:'Telefon örnek metni',phoneEmpty:'Telefon boş uyarısı',
 phoneInvalid:'Geçersiz telefon uyarısı',kvkkRequired:'KVKK onay uyarısı',
 notConnected:'Form gönderim mesajı',question:'Soru',answer:'Cevap'
};
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
const newEntry=(locale:string,faq=false):Entry=>({
 id:(faq?'faq-locale-'+locale+'-':'item-')+uid(),enabled:true,
 fields:faq?{question:{[locale]:''},answer:{[locale]:''}}:{},
 assets:{image:'',logo:''},links:{href:''},storeId:''
});
const deepCopy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const localeFaq=(x:Entry,locale:string)=>x.id.startsWith('faq-locale-'+locale+'-')||
  (!x.id.startsWith('faq-locale-')&&(
  Object.prototype.hasOwnProperty.call(x.fields?.question||{},locale)||
  Object.prototype.hasOwnProperty.call(x.fields?.answer||{},locale)));
const localText=(x:Entry,key:string,locale:string)=>x.fields?.[key]?.[locale]||'';

export default function HomepageEditor(){
 const {request,restoring,locales,localesLoading,localesError}=useMasterSession();
 const [lang,setLang]=useState('');
 const [saved,setSaved]=useState<Snapshot|null>(null);
 const [draft,setDraft]=useState<Snapshot|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [blogCategories,setBlogCategories]=useState<Array<{id:string;isActive:boolean;translations:Record<string,{title?:string}>}>>([]);
 const [faqDrag,setFaqDrag]=useState<string|null>(null);
 const [activeModule,setActiveModule]=useState('hero');
 const activeLocale=lang||locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'tr';
 useEffect(()=>{
  if(locales.length)setLang(previous=>locales.some(x=>x.locale===previous)?previous:
   (locales.find(x=>x.isDefault)?.locale||locales[0].locale));
 },[locales]);
 const refresh=useCallback(async()=>{
  if(restoring)return;
  setLoading(true);setError('');
  try{
   const home=await request('/superadmin/website/home') as Snapshot;
   setSaved(home);setDraft(deepCopy(home));
   try{
    const blog=await request('/superadmin/website/blog');
    setBlogCategories(Array.isArray(blog?.categories)?blog.categories:[]);
   }catch{setBlogCategories([])}
  }catch(e:any){setError(e?.message||'İçerikler okunamadı.')}
  finally{setLoading(false)}
 },[request,restoring]);
 useEffect(()=>{void refresh()},[refresh]);
 const changed=!!saved&&!!draft&&JSON.stringify(saved.modules)!==JSON.stringify(draft.modules);
 const patchModule=(id:string,fn:(m:Module)=>Module)=>
  setDraft(current=>current?{...current,modules:current.modules.map(m=>m.id===id?fn(m):m)}:current);
 const patchField=(id:string,key:string,value:string)=>patchModule(id,m=>({
  ...m,fields:{...m.fields,[key]:{...(m.fields?.[key]||{}),[activeLocale]:value}}
 }));
 const patchEntry=(id:string,entryId:string,fn:(x:Entry)=>Entry)=>
  patchModule(id,m=>({...m,items:m.items.map(x=>x.id===entryId?fn(x):x)}));
 const changeEntryField=(id:string,entryId:string,key:string,value:string)=>
  patchEntry(id,entryId,x=>({...x,fields:{...x.fields,
   [key]:{...(x.fields?.[key]||{}),[activeLocale]:value}}}));
 const visibleEntries=(m:Module)=>m.id==='faq'?
  m.items.filter(x=>localeFaq(x,activeLocale)):m.items;
 const reorderEntries=(m:Module,from:number,to:number)=>{
  const visible=visibleEntries(m);
  if(from<0||to<0||from>=visible.length||to>=visible.length||from===to)return;
  const reordered=[...visible], [moved]=reordered.splice(from,1);
  reordered.splice(to,0,moved);
  let i=0;
  patchModule(m.id,prev=>({...prev,items:prev.items.map(entry=>
   (m.id==='faq'?localeFaq(entry,activeLocale):true)?reordered[i++]:entry)}));
 };
 const reorderModules=(from:number,to:number)=>{
  if(!draft||from===to||to<0||to>=draft.modules.length)return;
  const modules=[...draft.modules];
  const [item]=modules.splice(from,1);modules.splice(to,0,item);
  setDraft({...draft,modules:modules.map((m,i)=>({...m,sortOrder:i}))});
 };
 const addEntry=(m:Module)=>patchModule(m.id,prev=>({...prev,
  items:[...prev.items,newEntry(activeLocale,m.id==='faq')]}));
 const removeEntry=(m:Module,entryId:string)=>patchModule(m.id,prev=>({...prev,
  items:prev.items.filter(x=>x.id!==entryId)}));
 const save=async()=>{
  if(!saved||!draft||saving)return;
  setSaving(true);setError('');setMessage('');
  try{
   // Only the language chosen above is written; other locales remain untouched.
   const modules=draft.modules.map(m=>m.id!=='faq'?m:{
    ...m,items:visibleEntries(m).map(entry=>({
      ...entry,
      id:entry.id.startsWith('faq-locale-'+activeLocale+'-')?entry.id:
        'faq-locale-'+activeLocale+'-'+entry.id,
      fields:{question:{[activeLocale]:entry.fields?.question?.[activeLocale]||''},
        answer:{[activeLocale]:entry.fields?.answer?.[activeLocale]||''}}
    }))
   });
   const result=await request('/superadmin/website/home-locale/'+encodeURIComponent(activeLocale),{
    method:'PATCH',body:JSON.stringify({version:saved.version,modules})
   }) as Snapshot;
   if(!result||!Array.isArray(result.modules)||typeof result.version!=='number')
    throw new Error('Sunucu kaydı doğrulamadı. Veriler güncellenmedi.');
   setSaved(result);setDraft(deepCopy(result));
   setMessage(activeLocale.toUpperCase()+' anasayfa içeriği kaydedildi.');
  }catch(e:any){setError(e?.message||'Kaydedilemedi.')}
  finally{setSaving(false)}
 };
 const addAllFaq=async()=>{
  if(saving||!saved)return;
  if(changed){setError('Önce bu dildeki değişiklikleri kaydet.');return;}
  setSaving(true);setError('');setMessage('');
  try{
   const result=await request('/superadmin/website/faq/import-improved',{method:'POST',body:'{}'});
   const home=await request('/superadmin/website/home') as Snapshot;
   setSaved(home);setDraft(deepCopy(home));
   setMessage(result.alreadyImported?'Sorular zaten ekli.':'5 dilde 30’ar soru ve cevap kaydedildi.');
  }catch(e:any){setError(e?.message||'Sorular eklenemedi.')}
  finally{setSaving(false)}
 };
 return <Container className="grid gap-5 pb-12">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-semibold">Ticarti.com · Anasayfa</h1>
    <p className="mt-1 text-sm text-muted-foreground">Dili ve soldaki modülü seçerek içeriği düzenle.</p>
   </div>
   <div className="flex items-center gap-2">
    <Button variant="outline" disabled={loading||saving} onClick={()=>void refresh()}>
     <RefreshCw className="size-4"/>Yenile</Button>
    <Button disabled={loading||saving||!draft} onClick={()=>void save()}>
     {saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Bu Dili Kaydet
    </Button>
   </div>
  </div>
  <div className="rounded-lg border bg-card p-5">
   <div className="mb-3 text-sm font-semibold">Anasayfa dili</div>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Anasayfa düzenleme dili">
    {locales.map(x=><Button key={x.locale} size="sm" type="button" disabled={saving}
      variant={activeLocale===x.locale?'primary':'outline'}
      onClick={()=>{if(changed&&!window.confirm('Kaydedilmemiş değişiklikler var. Dili değiştirmek istiyor musunuz?'))return;
       setDraft(saved?deepCopy(saved):null);setLang(x.locale);setMessage('');setError('')}}>{x.label||x.locale}</Button>)}
   </div>
  </div>
  {localesError?<p role="alert" className="text-sm text-destructive">{localesError}</p>:null}
  {error?<p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>:null}
  {message?<p className="rounded-md border p-3 text-sm">{message}</p>:null}
  {loading?<div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin"/></div>:null}
  {draft&&!loading?<>
   <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
    <nav className="sticky top-20 grid gap-1 rounded-lg border bg-card p-3" aria-label="Anasayfa modülleri">
     <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground">Modüller</div>
     {draft.modules.map((module,index)=><div key={module.id} className="flex items-center gap-1">
      <button type="button" onClick={()=>{setActiveModule(module.id);setError('');setMessage('')}}
       className={'min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm '+(activeModule===module.id?'bg-primary text-primary-foreground':'hover:bg-muted')}>
       <span className="block truncate">{module.title}</span>
      </button>
      <button type="button" aria-label={module.title+' yukarı taşı'} disabled={index===0}
       className="rounded p-1 disabled:opacity-30" onClick={()=>reorderModules(index,index-1)}>
       <ArrowUp className="size-3.5"/></button>
      <button type="button" aria-label={module.title+' aşağı taşı'} disabled={index===draft.modules.length-1}
       className="rounded p-1 disabled:opacity-30" onClick={()=>reorderModules(index,index+1)}>
       <ArrowDown className="size-3.5"/></button>
     </div>)}
    </nav>
    <div className="min-w-0">
   {draft.modules.filter(module=>module.id===activeModule).map(m=>{
    const index=draft.modules.findIndex(module=>module.id===m.id);
    const entries=visibleEntries(m);
    return <Card key={m.id}>
     <CardContent className="grid gap-4 p-5" >
      <div id={'home-section-'+m.id} className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3">
       <div className="flex items-center gap-3">
        <GripVertical className="size-4 text-muted-foreground" aria-hidden="true"/>
        <div><h2 className="text-base font-semibold">{m.title}</h2>
         <span className="text-xs text-muted-foreground">{activeLocale.toUpperCase()} · Bölüm {index+1}</span>
        </div>
       </div>
       <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" disabled={index===0} onClick={()=>reorderModules(index,index-1)}
         aria-label="Modülü yukarı taşı"><ArrowUp className="size-4"/></Button>
        <Button size="icon" variant="outline" disabled={index===draft.modules.length-1}
         onClick={()=>reorderModules(index,index+1)} aria-label="Modülü aşağı taşı"><ArrowDown className="size-4"/></Button>
        <Switch checked={m.enabled!==false} onCheckedChange={enabled=>patchModule(m.id,prev=>({...prev,enabled}))}/>
       </div>
      </div>
      {MODULE_FIELDS[m.id]?.length?<div className="grid gap-3">
       <div className="text-sm font-semibold">İçerik</div>
       <div className="grid gap-3 md:grid-cols-2">
        {MODULE_FIELDS[m.id].filter(key=>!['consentText','consentLinkText','phonePlaceholder','phoneEmpty','phoneInvalid','kvkkRequired','notConnected'].includes(key)).map(key=><label key={key} className="grid gap-2 text-sm">
         <span>{LABELS[key]||key}</span>
         {['description','consentText'].includes(key)?
          <Textarea rows={3} value={m.fields?.[key]?.[activeLocale]||''}
           onChange={e=>patchField(m.id,key,e.target.value)}/>:
          <Input value={m.fields?.[key]?.[activeLocale]||''}
           onChange={e=>patchField(m.id,key,e.target.value)}/>}
        </label>)}
       </div>
       {m.id==='hero'?<details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Gelişmiş form metinleri</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
         {MODULE_FIELDS.hero.filter(key=>['consentText','consentLinkText','phonePlaceholder','phoneEmpty','phoneInvalid','kvkkRequired','notConnected'].includes(key)).map(key=><label key={key} className="grid gap-1 text-sm">
          {LABELS[key]||key}
          <Input value={m.fields?.[key]?.[activeLocale]||''}
           onChange={e=>patchField(m.id,key,e.target.value)}/>
         </label>)}
        </div>
       </details>:null}
      </div>:null}
      {m.id==='hero'?<div className="flex items-center gap-2 text-sm">
       <Switch checked={m.ctaEnabled!==false} onCheckedChange={ctaEnabled=>patchModule(m.id,prev=>({...prev,ctaEnabled}))}/>
       Telefon CTA formu
      </div>:null}
      {m.id==='hero'?<details className="rounded-md border p-4">
       <summary className="cursor-pointer text-sm font-semibold">Referans logoları ({m.logos?.length||0})</summary>
       <div className="mt-4 grid gap-3">
        <Button size="sm" variant="outline" onClick={()=>patchModule(m.id,prev=>({...prev,logos:[...(prev.logos||[]),{
         id:'logo-'+uid(),enabled:true,fields:{title:{[activeLocale]:''}},assets:{image:''}
        }]}))}><Plus className="size-4"/>Logo Ekle</Button>
        {(m.logos||[]).map((logo,i)=><div key={logo.id} className="grid gap-3 rounded-md border p-3">
         <div className="flex justify-between"><b className="text-sm">Logo {i+1}</b>
          <Button size="icon" variant="outline" onClick={()=>patchModule(m.id,prev=>({...prev,logos:prev.logos?.filter(x=>x.id!==logo.id)}))}>
           <Trash2 className="size-4"/></Button></div>
         <Input placeholder="Başlık" value={logo.fields?.title?.[activeLocale]||''}
          onChange={e=>patchModule(m.id,prev=>({...prev,logos:prev.logos?.map(x=>x.id===logo.id?
           {...x,fields:{title:{...x.fields.title,[activeLocale]:e.target.value}}}:x)}))}/>
         <MediaField label="Logo" value={logo.assets?.image||''}
          onChange={image=>patchModule(m.id,prev=>({...prev,logos:prev.logos?.map(x=>x.id===logo.id?{...x,assets:{image}}:x)}))}/>
        </div>)}
       </div>
      </details>:null}
      {ITEM_FIELDS[m.id]?.length?<details open={m.id==='faq'} className="rounded-md border p-4">
       <summary className="cursor-pointer font-semibold text-sm">
        {m.id==='faq'?'Sıkça Sorulan Sorular':'Tekrarlanan içerikler'} ({entries.length})
       </summary>
       <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between">
         <span className="text-xs text-muted-foreground">{activeLocale.toUpperCase()} içeriği</span>
         <Button size="sm" variant="outline" onClick={()=>addEntry(m)}>
          <Plus className="size-4"/>{m.id==='faq'?'Soru Ekle':'Kayıt Ekle'}</Button>
        </div>
        {entries.map((entry,i)=><details key={entry.id} className="rounded-md border p-3"
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const from=entries.findIndex(x=>x.id===faqDrag);
           reorderEntries(m,from,i);setFaqDrag(null)}}>
         <summary className="cursor-pointer text-sm font-medium">
          {localText(entry,m.id==='faq'?'question':'heading',activeLocale)||'Kayıt '+(i+1)}
         </summary>
         <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
           <span draggable onDragStart={()=>setFaqDrag(entry.id)} onDragEnd={()=>setFaqDrag(null)}
             role="button" tabIndex={0} aria-label="Kaydı sürükleyerek sırala"
             className="inline-flex cursor-grab items-center">
            <GripVertical className="size-4" aria-hidden="true"/>
           </span>
           <Switch checked={entry.enabled!==false}
            onCheckedChange={enabled=>patchEntry(m.id,entry.id,x=>({...x,enabled}))}/>
           <Button size="icon" variant="outline" disabled={i===0} onClick={()=>reorderEntries(m,i,i-1)}>
            <ArrowUp className="size-4"/></Button>
           <Button size="icon" variant="outline" disabled={i===entries.length-1} onClick={()=>reorderEntries(m,i,i+1)}>
            <ArrowDown className="size-4"/></Button>
           <Button size="icon" variant="outline" onClick={()=>removeEntry(m,entry.id)}>
            <Trash2 className="size-4"/></Button>
          </div>
          {ITEM_FIELDS[m.id].map(key=><label key={key} className="grid gap-1 text-sm">
           {LABELS[key]||key}
           {['description','answer'].includes(key)?
            <Textarea rows={3} value={localText(entry,key,activeLocale)}
             onChange={e=>changeEntryField(m.id,entry.id,key,e.target.value)}/>:
            <Input value={localText(entry,key,activeLocale)}
             onChange={e=>changeEntryField(m.id,entry.id,key,e.target.value)}/>}
          </label>)}
          {['hero','builder','showcase','references'].includes(m.id)?
           <MediaField label="Görsel" value={entry.assets?.image||''}
            onChange={image=>patchEntry(m.id,entry.id,x=>({...x,assets:{...x.assets,image}}))}/>:null}
          {['hero','references'].includes(m.id)?
           <MediaField label="Logo" value={entry.assets?.logo||''}
            onChange={logo=>patchEntry(m.id,entry.id,x=>({...x,assets:{...x.assets,logo}}))}/>:null}
          {['hero','showcase','references'].includes(m.id)?
           <Input placeholder="Bağlantı" value={entry.links?.href||''}
            onChange={e=>patchEntry(m.id,entry.id,x=>({...x,links:{...x.links,href:e.target.value}}))}/>:null}
         </div>
        </details>)}
        {!entries.length?<p className="text-sm text-muted-foreground">Bu dilde henüz kayıt yok.</p>:null}
       </div>
      </details>:null}
      {m.id==='faq'?<div className="flex flex-wrap items-center justify-between gap-2">
       <Button size="sm" variant="outline" disabled={saving} onClick={()=>void addAllFaq()}>
        <Plus className="size-4"/>5 Dilde Soruları Ekle
       </Button>
      </div>:null}
      {m.id==='blog'?<div className="grid gap-2 rounded-md border p-3">
       <b className="text-sm">Anasayfa blog kategorileri</b>
       {blogCategories.filter(x=>x.isActive!==false).map(x=><label key={x.id} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={(m.categoryIds||[]).includes(x.id)}
         onChange={e=>patchModule(m.id,prev=>({...prev,categoryIds:e.target.checked?
          [...(prev.categoryIds||[]),x.id]:(prev.categoryIds||[]).filter(z=>z!==x.id)}))}/>
        {x.translations?.[activeLocale]?.title||x.translations?.tr?.title||x.id}
       </label>)}
       <a href="/website/blog" className="text-xs underline">Blog yazılarını yönet</a>
      </div>:null}
     </CardContent>
    </Card>;
   })}
   </div>
   </div>
   <div className="flex justify-end"><Button disabled={loading||saving||!draft} onClick={()=>void save()}>
    {saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}
    {activeLocale.toUpperCase()} Anasayfasını Kaydet
   </Button></div>
  </>:null}
 </Container>;
}
