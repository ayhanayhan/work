'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,GripVertical,Image,Layers3,LoaderCircle,Plus,RefreshCw,Save,Trash2,Upload} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {MediaField} from '@/app/(protected)/catalog/components/catalog-fields';

type Localized=Record<string,string>;
type Values=Record<string,Localized>;
type Entry={id:string;enabled:boolean;sortOrder?:number;fields:Values;assets:{image?:string;logo?:string};links:{href?:string};storeId?:string};
type LogoEntry={id:string;enabled:boolean;fields:{title:Localized};assets:{image:string};storeId?:string};
type Module={id:string;title:string;selector:string;enabled:boolean;sortOrder:number;fields:Values;items:Entry[];logos?:LogoEntry[];ctaEnabled?:boolean;categoryIds?:string[]};
type Snapshot={version:number;modules:Module[]};
const FIELD_LABELS:Record<string,string>={heading:'Başlık',description:'Açıklama',offer:'Kampanya metni',role:'Alt başlık',button:'Buton yazısı',question:'Soru',answer:'Yanıt',buttonUrl:'Buton URL',formButton:'CTA form butonu',consentText:'KVKK onay metni',consentLinkText:'KVKK bağlantı metni',phonePlaceholder:'Telefon alanı örnek metni',phoneEmpty:'Telefon zorunlu uyarısı',phoneInvalid:'Geçersiz telefon uyarısı',kvkkRequired:'KVKK onayı uyarısı',notConnected:'Gönderilmeyen form mesajı'};
const MODULE_FIELDS:Record<string,string[]>={hero:['heading','description','offer','button','buttonUrl','formButton','consentText','consentLinkText','phonePlaceholder','phoneEmpty','phoneInvalid','kvkkRequired','notConnected'],animated:['heading','description'],builder:[],radar:['heading','description'],channels:['heading','description'],showcase:['heading','description'],references:['heading'],bottomCta:['heading','offer'],blog:['heading','description'],faq:['heading','description','button','buttonUrl']};
const ENTRY_FIELDS:Record<string,string[]>={hero:['heading','description'],animated:['heading'],builder:['heading','description'],radar:['heading','description'],channels:['description','button'],showcase:['heading','role','description','button'],references:['heading','description'],faq:['question','answer']};
const errorText=(e:any)=>e?.message||'İşlem başarısız.';
const faqLocale=(item:Entry)=>/^faq-locale-([a-z]{2,3}(?:-[a-z]{2,4})?)-/.exec(item.id)?.[1]||'';
/** Old records held 5 translations per item. Split them into genuinely independent
 * locale records, preserving every localized question and answer and its original order.
 * The conversion is persisted only when the editor's Save action is used.
 */
const separateFaqLanguages=(items:Entry[]):Entry[]=>items.flatMap(entry=>{
  if(faqLocale(entry))return [entry];
  const keys=new Set([...Object.keys(entry.fields?.question||{}),...Object.keys(entry.fields?.answer||{})]);
  if(!keys.size)return [entry];
  return [...keys].sort().map(locale=>({
    ...entry,id:'faq-locale-'+locale+'-'+entry.id,
    fields:{...entry.fields,
      question:{[locale]:entry.fields?.question?.[locale]||''},
      answer:{[locale]:entry.fields?.answer?.[locale]||''}}
  }));
});
const belongsToFaqLanguage=(item:Entry,locale:string)=>{
  const own=faqLocale(item);
  if(own)return own===locale;
  return Object.prototype.hasOwnProperty.call(item.fields?.question||{},locale)
    ||Object.prototype.hasOwnProperty.call(item.fields?.answer||{},locale);
};
const newItem=():Entry=>({id:'item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),enabled:true,fields:{},assets:{image:'',logo:''},links:{href:''},storeId:''});

export default function HomepageEditor(){
  const {request,restoring,locales:languageList,localesLoading,localesError}=useMasterSession();
  const [data,setData]=useState<Snapshot|null>(null);
  const [active,setActive]=useState('');
  const [lang,setLang]=useState('');
  useEffect(()=>{if(languageList.length)setLang(old=>languageList.some(x=>x.locale===old)?old:(languageList.find(x=>x.isDefault)?.locale||languageList[0].locale))},[languageList]);

  const [working,setWorking]=useState<Module|null>(null);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const [dragged,setDragged]=useState<string|null>(null);
  const [blogCategories,setBlogCategories]=useState<Array<{id:string;isActive:boolean;translations:Record<string,{title?:string}>}>>([]);
  const [blogFeed,setBlogFeed]=useState<{published:number;draft:number;archived:number;scheduled:number;localized:number}|null>(null);


  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const home=await request('/superadmin/website/home');
      setData(home);
      setActive(prev=>home.modules.some((x:Module)=>x.id===prev)?prev:(home.modules[0]?.id||''));
    }catch(e){setError(errorText(e))}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(active!=='blog'||restoring)return;
    let cancelled=false;
    void (async()=>{
      try{
        const snapshot=await request('/superadmin/website/blog');
        const now=Date.now();
        const posts=Array.isArray(snapshot?.posts)?snapshot.posts:[];
         if(!cancelled)setBlogCategories(Array.isArray(snapshot?.categories)?snapshot.categories:[]);
        const activeLocale=lang||languageList.find(x=>x.isDefault)?.locale||'tr';
        const valid=(p:any)=>{const t=p?.translations?.[activeLocale];return t?.enabled!==false&&!!t?.title?.trim()&&!!t?.content?.trim()};
        if(!cancelled)setBlogFeed({
          published:posts.filter((p:any)=>p.status==='PUBLISHED'&&(!p.scheduledAt||Date.parse(p.scheduledAt)<=now)).length,
          draft:posts.filter((p:any)=>p.status==='DRAFT').length,
          archived:posts.filter((p:any)=>p.status==='ARCHIVED').length,
          scheduled:posts.filter((p:any)=>p.status==='PUBLISHED'&&p.scheduledAt&&Date.parse(p.scheduledAt)>now).length,
          localized:posts.filter((p:any)=>p.status==='PUBLISHED'&&(!p.scheduledAt||Date.parse(p.scheduledAt)<=now)&&valid(p)).length
        });
      }catch(e){if(!cancelled)setError('Blog yayın durumu okunamadı: '+errorText(e))}
    })();
    return ()=>{cancelled=true};
  },[active,lang,languageList,request,restoring]);
  useEffect(()=>{
    const selected=data?.modules?.find(x=>x.id===active);
    if(selected?.id==='faq'){
      const normalized=JSON.parse(JSON.stringify(selected)) as Module;
      normalized.items=separateFaqLanguages(normalized.items);
      setWorking(normalized);
    }else setWorking(selected?JSON.parse(JSON.stringify(selected)):null);
  },[data,active]);
  const patch=(updates:Partial<Module>)=>setWorking(x=>x?{...x,...updates}:x);
  const patchField=(key:string,value:string)=>setWorking(x=>x?{...x,fields:{...x.fields,[key]:{...(x.fields[key]||{}),[lang]:value}}}:x);
  const patchItem=(id:string,change:(item:Entry)=>Entry)=>setWorking(x=>x?{...x,items:x.items.map(item=>item.id===id?change(item):item)}:x);
  const patchLogo=(id:string,change:(entry:LogoEntry)=>LogoEntry)=>setWorking(x=>x?{...x,logos:(x.logos||[]).map(item=>item.id===id?change(item):item)}:x);
  const addLogo=()=>setWorking(x=>x?{...x,logos:[...(x.logos||[]),{id:'logo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),enabled:true,fields:{title:{}},assets:{image:''},storeId:''}]}:x);
  const moveVisible=(from:number,to:number)=>{
    if(!working||from===to)return;
    if(working.id!=='faq'){move(from,to);return;}
    const local=working.items.filter(item=>belongsToFaqLanguage(item,lang));
    if(to<0||to>=local.length||from<0||from>=local.length)return;
    const changed=[...local];
    const [selected]=changed.splice(from,1);changed.splice(to,0,selected);
    let index=0;
    patch({items:working.items.map(item=>belongsToFaqLanguage(item,lang)?changed[index++]:item)});
  };
  const move=(from:number,to:number)=>{
    setWorking(x=>{if(!x||to<0||to>=x.items.length||from===to)return x;const items=[...x.items];const [item]=items.splice(from,1);items.splice(to,0,item);return {...x,items}});
  };
  const reorderModules=async(from:number,to:number)=>{
    if(!data||saving||to<0||to>=data.modules.length||from===to)return;
    const currentlySaved=!working||JSON.stringify(data.modules.find(x=>x.id===working.id))===JSON.stringify(working);
    if(!currentlySaved){setError('Önce mevcut modüldeki değişiklikleri kaydedin.');return;}
    setSaving(true);setError('');setMessage('');
    try{
      const modules=[...data.modules];
      const [moved]=modules.splice(from,1);modules.splice(to,0,moved);
      const result=await request('/superadmin/website/home-order',{
        method:'PATCH',body:JSON.stringify({version:data.version,ids:modules.map(x=>x.id)})
      }) as Snapshot;
      setData(result);
      setMessage('Modül sırası veritabanına kaydedildi.');
    }catch(e){setError('Modül sıralaması kaydedilemedi: '+errorText(e))}
    finally{setSaving(false)}
  };
  const save=async()=>{
    if(!working||!data||localesLoading||localesError||!languageList.length)return;
    setSaving(true);setError('');setMessage('');
    try{
      // Read the newest CMS version: saving another module should not invalidate
      // the current editor, but concurrent changes to this same module must be protected.
      const latest=await request('/superadmin/website/home') as Snapshot;
      const previous=data.modules.find(x=>x.id===working.id);
      const remote=latest.modules.find(x=>x.id===working.id);
      if(!remote||JSON.stringify(remote)!==JSON.stringify(previous)){
        throw new Error('Bu modül başka bir oturumda değişmiş. Yazdıkların ekranda korunuyor; önce diğer değişiklikleri kontrol et.');
      }
      const response=await request('/superadmin/website/home/'+encodeURIComponent(working.id),{
        method:'PATCH',body:JSON.stringify({version:latest.version,enabled:working.enabled,fields:working.fields,items:working.items,ctaEnabled:working.ctaEnabled!==false,logos:working.logos||[],categoryIds:working.categoryIds||[]})
      });
      setData({...latest,version:response.version,modules:latest.modules.map(x=>x.id===working.id?response.module:x)});
      if(working.id==='faq'){
        try{
          const publicFaq=await request('/public/website/faq?lang='+encodeURIComponent(lang));
          const valid=(Array.isArray(publicFaq.items)?publicFaq.items:[]).filter((item:any)=>
            item.enabled!==false&&String(item.fields?.question?.[lang]||'').trim()&&String(item.fields?.answer?.[lang]||'').trim());
          setMessage('SSS kaydedildi. '+lang.toUpperCase()+' dilinde yayına hazır soru sayısı: '+(publicFaq.enabled?valid.length:0)+
            '. '+(!publicFaq.enabled?'SSS modülü pasif.':valid.length===0?'Aktif sorular için bu dilde hem soru hem cevap doldurulmalı.':'Bu sorular anasayfada gösterilmelidir.'));
        }catch(e:any){setMessage('SSS kaydedildi ancak yayın API kontrolü başarısız: '+(e?.message||'Bilinmeyen hata'));}
      }else setMessage('Modül kaydedildi.');
    }catch(e){setError('Modül kaydedilemedi: '+errorText(e))}
    finally{setSaving(false)}
  };
  const importFile=async(file:File)=>{
    setSaving(true);setError('');setMessage('');
    try{
      const raw=JSON.parse(await file.text());
      if(!Array.isArray(raw?.modules)||raw.modules.length<1)throw new Error('Geçerli anasayfa içerik dosyası seçin.');
      const known=new Set(Object.keys(MODULE_FIELDS));
      const modules=raw.modules.filter((x:any)=>known.has(x?.id));
      if(!modules.length)throw new Error('İçe aktarılacak bilinen modül bulunamadı.');
      const faqOnly=modules.length===1&&modules[0].id==='faq';
      if(raw?.type==='ticarti-faq-import-v1'&&!faqOnly)
        throw new Error('SSS dosyasında yalnızca FAQ modülü bulunmalı.');
      const dataNow=await request('/superadmin/website/home');
      if(dataNow.version>0&&!faqOnly&&!window.confirm('Mevcut anasayfa içerikleri var. Arşivdeki verilerle değiştirmek istiyor musunuz?')){setSaving(false);return}
      await request('/superadmin/website/home-import',{method:'PATCH',body:JSON.stringify({version:dataNow.version,modules})});
      await load();setMessage(faqOnly?'SSS soru ve cevapları beş dilde içe aktarıldı. Diğer modüller korunuyor.':'Anasayfa içerikleri içe aktarıldı.');
    }catch(e){setError(errorText(e))}
    finally{setSaving(false)}
  };
  const fields=working?MODULE_FIELDS[working.id]||[]:[];
  const entries=working?ENTRY_FIELDS[working.id]||[]:[];
  const hasImage=['hero','builder','showcase','references'].includes(working?.id||'');
  const hasLink=['hero','showcase','references'].includes(working?.id||'');
  const visibleItems=working?.id==='faq'?working.items.filter(item=>belongsToFaqLanguage(item,lang)):(working?.items||[]);
  const itemLabel=(x:Entry,i:number)=>x.fields?.heading?.[lang]||x.fields?.question?.[lang]||x.fields?.heading?.tr||x.fields?.question?.tr||'Kayıt '+(i+1);
  const unchanged=!!working&&!!data&&JSON.stringify(data.modules.find(x=>x.id===working.id))===JSON.stringify(working);
  const editorState=!working?'':saving?'Kaydediliyor':unchanged?'Kaydedildi':'Kaydedilmemiş değişiklikler';
  const stateText=data?.version===0?'Master içeriği henüz kaydedilmedi. Orijinal Next.js anasayfası kendi sabit içeriğiyle çalışır.':'İçerik sürümü: '+data?.version;
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Ticarti.com · Anasayfa</h1><ToolbarDescription>Anasayfa içerik ve sıralama yönetimi.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button><Button disabled={!working||saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Modülü Kaydet</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-5 py-4">
        <span className="text-sm font-medium">Anasayfa dili</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Anasayfa içerik dili">
          {languageList.map(x=><Button key={x.locale} type="button" size="sm" variant={lang===x.locale?'primary':'outline'}
            onClick={()=>setLang(x.locale)}>{x.label||x.locale}</Button>)}
        </div>
      </div>
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div><div className="font-medium">Anasayfa içerik yönetimi</div><p className="mt-1 text-sm text-muted-foreground">{stateText}</p><p className="mt-1 text-xs text-muted-foreground"></p></div>
        <Button size="sm" variant="outline" asChild><label className="cursor-pointer"><Upload className="size-4"/>Mevcut Site İçeriğini İçe Aktar<input type="file" hidden accept=".json,application/json" disabled={saving} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importFile(file)}}/></label></Button>
      </CardContent></Card>
      {localesError?<p role="alert" className="text-sm text-destructive">{localesError}</p>:null}
      {error?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
      {message?<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{message}</div>:null}
      {loading?<div className="grid min-h-64 place-items-center"><LoaderCircle className="animate-spin"/></div>:<div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card><CardHeader><CardHeading><Layers3 className="me-2 inline size-4"/>Anasayfa Modülleri</CardHeading></CardHeader><CardContent className="grid content-start gap-1 p-3">
          {(data?.modules||[]).map((m,i)=><div key={m.id} className={'flex items-center gap-1 rounded-lg px-2 py-1 '+(active===m.id?'bg-muted text-primary':'hover:bg-muted/50')}
            draggable={!saving}
            onDragStart={()=>setDragged(m.id)}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const from=data?.modules.findIndex(x=>x.id===dragged);setDragged(null);if(from!==undefined&&from>=0)void reorderModules(from,i)}}
            onDragEnd={()=>setDragged(null)}>
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground"/>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left" onClick={()=>{setActive(m.id);setError('');setMessage('')}}>
              <span className="text-xs text-muted-foreground">{String(i+1).padStart(2,'0')}</span>
              <span className="truncate text-sm font-medium">{m.title}</span>
              {m.enabled===false?<Badge appearance="light" variant="secondary">Pasif</Badge>:null}
            </button>
            <button aria-label={m.title+' yukarı'} title="Yukarı" type="button" disabled={saving||i===0}
              onClick={()=>void reorderModules(i,i-1)}><ArrowUp className="size-4"/></button>
            <button aria-label={m.title+' aşağı'} title="Aşağı" type="button" disabled={saving||i===(data?.modules.length||0)-1}
              onClick={()=>void reorderModules(i,i+1)}><ArrowDown className="size-4"/></button>
          </div>)}
        </CardContent></Card>
        {working?<Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardHeading>{working.title}</CardHeading><p className="mt-1 text-xs text-muted-foreground">{working.enabled?'Aktif':'Pasif'} · {editorState}</p><p className="mt-1 text-xs text-muted-foreground">Şablon: {working.selector}</p></div><label className="flex items-center gap-2 text-sm"><Switch checked={working.enabled!==false} onCheckedChange={enabled=>patch({enabled})}/>Aktif</label></div></CardHeader><CardContent className="grid gap-5">

          {fields.length?<details open className="rounded-lg border p-4"><summary className="cursor-pointer select-none font-semibold">Metinler ve bağlantılar</summary><div className="mt-4 grid gap-4">{fields.map(key=><label key={key} className="grid gap-2 text-sm"><span className="font-medium">{FIELD_LABELS[key]||key}</span>{(['description','answer'].includes(key)||(working.id==='hero'&&key==='heading'))?<Textarea rows={3} className="max-h-48 overflow-y-auto resize-y" value={working.fields?.[key]?.[lang]||''} onChange={e=>patchField(key,e.target.value)}/>:<Input value={working.fields?.[key]?.[lang]||''} onChange={e=>patchField(key,e.target.value)}/>}</label>)}</div></details>:null}
          {working.id==='hero'?<details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Telefon CTA formu</summary><div className="mt-4 grid gap-4">
            <label className="flex items-center justify-between gap-4 text-sm"><span>Telefon CTA formu açık</span><Switch checked={working.ctaEnabled!==false} onCheckedChange={v=>patch({ctaEnabled:v})}/></label>
            <div className="rounded-lg border p-3 text-xs text-muted-foreground">
              KVKK bağlantısı Master → Ayarlar → Sözleşme Eşleştirme üzerinden eşleştirilen KVKK sözleşmesinden okunur. Formdaki bağlantı yeni sekmede açılır. Yukarıdaki KVKK onay metni alanı bağlantının ardından gelen metni düzenler.
            </div>
          </div></details>:null}
          {working.id==='hero'?<details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Referans logoları ({(working.logos||[]).length})</summary><div className="mt-4 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold">Referansların altındaki logolar</h3><p className="text-xs text-muted-foreground">Her logo için dile özel başlık, görsel ve ileride bağlanacak mağaza alanı.</p></div>
              <Button size="sm" variant="outline" onClick={addLogo}><Plus className="size-4"/>Logo Ekle</Button>
            </div>
            {(working.logos||[]).map((logo,i)=><div key={logo.id} className="grid gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between"><b className="text-sm">Logo {i+1}</b><div className="flex gap-2"><Switch checked={logo.enabled!==false} onCheckedChange={v=>patchLogo(logo.id,x=>({...x,enabled:v}))}/><Button size="icon" variant="outline" onClick={()=>patch({logos:(working.logos||[]).filter(x=>x.id!==logo.id)})}><Trash2 className="size-4"/></Button></div></div>
              <label className="grid gap-2 text-sm">Başlık · {lang.toUpperCase()}<Input value={logo.fields?.title?.[lang]||''} onChange={e=>patchLogo(logo.id,x=>({...x,fields:{...x.fields,title:{...x.fields.title,[lang]:e.target.value}}}))}/></label>
              <MediaField label="Logo" value={logo.assets?.image||''} onChange={image=>patchLogo(logo.id,x=>({...x,assets:{...x.assets,image}}))}/>
              <label className="grid gap-2 text-sm">Mağaza seçimi (yakında bağlanacak)<select disabled className="h-10 rounded-md border bg-muted/50 px-3 text-sm"><option>Mağaza kaynağı daha sonra bağlanacak</option></select></label>
            </div>)}
          </div></details>:null}
          {entries.length?<details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{working.id==='faq'?'Sık Sorulan Sorular':'Tekrarlanan kayıtlar'} ({visibleItems.length})</summary><div className="mt-4 grid gap-4">
            <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{working.id==='faq'?'Sık Sorulan Sorular':working.id==='hero'?'Slider Referans Kartları':working.id==='references'?'Referans Görselleri':'Tekrarlanan İçerikler'}</h3><p className="mt-1 text-sm text-muted-foreground">{working.id==='faq'?'Soruları ve cevapları üstte seçtiğiniz anasayfa dili için düzenleyin.':'Yeni kayıt ekleyebilir, kaldırabilir veya sürükleyerek sıralayabilirsiniz. Mağaza eşleştirmesi sonraki aşamada açılacak.'}</p></div><Button size="sm" variant="outline" onClick={()=>patch({items:[...working.items,working.id==='faq'?{
              ...newItem(),id:'faq-locale-'+lang+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),
              fields:{question:{[lang]:''},answer:{[lang]:''}}
            }:newItem()]})}><Plus className="size-4"/>{working.id==='faq'?'Yeni Soru Ekle':'Yeni Kayıt'}</Button></div>
            {visibleItems.map((entry,i)=><details key={entry.id} draggable onDragStart={e=>{setDragged(entry.id);e.dataTransfer.effectAllowed='move'}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=visibleItems.findIndex(x=>x.id===dragged);if(from>=0)moveVisible(from,i);setDragged(null)}} onDragEnd={()=>setDragged(null)} className="rounded-lg border p-4">
              <summary className="cursor-pointer select-none py-1 text-sm font-semibold">{itemLabel(entry,i)}</summary>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2"><GripVertical className="size-4 cursor-grab text-muted-foreground"/><span className="min-w-0 truncate text-sm font-semibold">{itemLabel(entry,i)}</span></div>
                <div className="flex items-center gap-2"><Switch checked={entry.enabled!==false} onCheckedChange={enabled=>patchItem(entry.id,x=>({...x,enabled}))}/><Button size="icon" variant="outline" disabled={i===0} onClick={()=>moveVisible(i,i-1)}><ArrowUp className="size-4"/></Button><Button size="icon" variant="outline" disabled={i===visibleItems.length-1} onClick={()=>moveVisible(i,i+1)}><ArrowDown className="size-4"/></Button><Button size="icon" variant="outline" onClick={()=>patch({items:working.items.filter(x=>x.id!==entry.id)})}><Trash2 className="size-4"/></Button></div>
              </div>
              <div className="grid gap-4">{entries.map(key=><label key={key} className="grid gap-1.5 text-sm"><span className="font-medium">{FIELD_LABELS[key]||key} · {lang.toUpperCase()}</span>{['description','answer'].includes(key)?<Textarea rows={2} className="max-h-48 overflow-y-auto resize-y" value={entry.fields?.[key]?.[lang]||''} onChange={e=>patchItem(entry.id,x=>({...x,fields:{...x.fields,[key]:{...(x.fields?.[key]||{}),[lang]:e.target.value}}}))}/>:<Input value={entry.fields?.[key]?.[lang]||''} onChange={e=>patchItem(entry.id,x=>({...x,fields:{...x.fields,[key]:{...(x.fields?.[key]||{}),[lang]:e.target.value}}}))}/>}</label>)}
                {hasImage?<MediaField label="Görsel" value={entry.assets?.image||''} onChange={image=>patchItem(entry.id,x=>({...x,assets:{...x.assets,image}}))}/>:null}
                {['hero','references'].includes(working.id)?<MediaField label="Referans logosu" value={entry.assets?.logo||''} onChange={logo=>patchItem(entry.id,x=>({...x,assets:{...x.assets,logo}}))}/>:null}
                {['hero','references'].includes(working.id)?<label className="grid gap-2 text-sm">Mağaza seçimi (yakında bağlanacak)<select disabled className="h-10 rounded-md border bg-muted/50 px-3 text-sm"><option>Mağaza kaynağı daha sonra bağlanacak</option></select></label>:null}
                {hasLink?<label className="grid gap-2 text-sm"><span className="font-medium">Bağlantı adresi</span><Input value={entry.links?.href||''} placeholder="https:// veya sayfa bağlantısı" onChange={e=>patchItem(entry.id,x=>({...x,links:{...x.links,href:e.target.value}}))}/></label>:null}
              </div>
            </details>)}{!visibleItems.length?<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Henüz kayıt yok. Yeni Kayıt butonuyla ekleyebilir veya mevcut site verisini içe aktarabilirsiniz.</div>:null}
          </div></details>:null}
          {working.id==='faq'?<div className="rounded-lg border p-4 text-sm">
            <b>SEO / FAQPage</b>
            <p className="mt-1 text-muted-foreground">SSS içeriği ve SEO yapılandırması seçilen anasayfa diliyle eşleştirilir.</p>
            
          </div>:null}
          {working.id==='blog'?<div className="grid gap-3 rounded-lg border p-4">
            <h3 className="font-semibold">Anasayfada gösterilecek blog kategorileri</h3>
            <p className="text-xs text-muted-foreground">Hiçbiri seçili değilse tüm yayınlanmış kategorilerden içerik gelir. Seçim yaparsan yalnızca işaretli kategoriler gösterilir.</p>
            {blogCategories.filter(x=>x.isActive!==false).map(c=><label key={c.id} className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={(working.categoryIds||[]).includes(c.id)} onChange={e=>patch({categoryIds:e.target.checked?[...(working.categoryIds||[]),c.id]:(working.categoryIds||[]).filter(x=>x!==c.id)})}/>
              {c.translations?.[lang]?.title||c.translations?.tr?.title||c.id}
            </label>)}
            {!blogCategories.length?<p className="text-xs text-muted-foreground">Henüz blog kategorisi oluşturulmadı.</p>:null}
          </div>:null}
          {working.id==='blog'?<div className="rounded-lg border p-4 text-sm">
            <b>Blog içerikleri ayrı yönetilir.</b>
            <p className="mt-1 text-muted-foreground">Bu modül blog bölümünün başlığını düzenler. Kartlar yalnızca aktif dilde yayımlanmış yazılardan otomatik gelir.</p>
            {blogFeed?<p className="mt-2">Toplam: {blogFeed.published+blogFeed.draft+blogFeed.archived+blogFeed.scheduled} · Yayında: {blogFeed.published} · Taslak: {blogFeed.draft} · Zamanlanmış: {blogFeed.scheduled} · Arşiv: {blogFeed.archived} · <strong>{lang.toUpperCase()} dilinde anasayfada gösterilebilir: {blogFeed.localized}</strong></p>:<p className="mt-2">Yayın durumu yükleniyor…</p>}
            {blogFeed&&blogFeed.localized===0?<p className="mt-2 text-amber-700">Anasayfada yazı görünmesi için yazının Yayın durumunda olması, zamanının gelmesi ve bu dilde başlık ile içerik bulunması gerekir.</p>:null}
            <a href="/website/blog" className="mt-2 inline-block font-medium text-primary underline">Blog içeriklerini yönet</a>
          </div>:null}
          <div className="flex justify-end border-t pt-5"><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Modülü Kaydet</Button></div>
        </CardContent></Card>:null}
      </div>}
    </Container>
  </>;
}
