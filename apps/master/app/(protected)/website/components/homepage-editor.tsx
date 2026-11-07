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
import originalFaq from './website-faq-original.json';

type Localized=Record<string,string>;
type Values=Record<string,Localized>;
type Entry={id:string;enabled:boolean;sortOrder?:number;fields:Values;assets:{image?:string};links:{href?:string}};
type Module={id:string;title:string;selector:string;enabled:boolean;sortOrder:number;fields:Values;items:Entry[]};
type Snapshot={version:number;modules:Module[]};
const FIELD_LABELS:Record<string,string>={heading:'Başlık',description:'Açıklama',offer:'Kampanya metni',role:'Alt başlık',button:'Buton yazısı',question:'Soru',answer:'Yanıt'};
const MODULE_FIELDS:Record<string,string[]>={hero:['heading','description','offer'],animated:['heading','description'],builder:[],radar:['heading','description'],channels:['heading','description'],showcase:['heading','description'],references:['heading'],bottomCta:['heading','offer'],blog:['heading','description'],faq:['heading','description']};
const ENTRY_FIELDS:Record<string,string[]>={animated:['heading'],builder:['heading','description'],radar:['heading','description'],channels:['description','button'],showcase:['heading','role','description','button'],references:['heading','description'],faq:['question','answer']};
const errorText=(e:any)=>e?.message||'İşlem başarısız.';
const newItem=():Entry=>({id:'item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),enabled:true,fields:{},assets:{image:''},links:{href:''}});

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
    setWorking(selected?JSON.parse(JSON.stringify(selected)):null);
  },[data,active]);
  const patch=(updates:Partial<Module>)=>setWorking(x=>x?{...x,...updates}:x);
  const patchField=(key:string,value:string)=>setWorking(x=>x?{...x,fields:{...x.fields,[key]:{...(x.fields[key]||{}),[lang]:value}}}:x);
  const patchItem=(id:string,change:(item:Entry)=>Entry)=>setWorking(x=>x?{...x,items:x.items.map(item=>item.id===id?change(item):item)}:x);
  const move=(from:number,to:number)=>{
    setWorking(x=>{if(!x||to<0||to>=x.items.length||from===to)return x;const items=[...x.items];const [item]=items.splice(from,1);items.splice(to,0,item);return {...x,items}});
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
        method:'PATCH',body:JSON.stringify({version:latest.version,enabled:working.enabled,fields:working.fields,items:working.items})
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
      const dataNow=await request('/superadmin/website/home');
      if(dataNow.version>0&&!window.confirm('Mevcut anasayfa içerikleri var. Arşivdeki verilerle değiştirmek istiyor musunuz?')){setSaving(false);return}
      await request('/superadmin/website/home-import',{method:'PATCH',body:JSON.stringify({version:dataNow.version,modules})});
      await load();setMessage('Orijinal anasayfa metinleri ve tüm tekrar eden kayıtlar içe aktarıldı. Görsel tasarım değişmedi.');
    }catch(e){setError(errorText(e))}
    finally{setSaving(false)}
  };
  const importOriginalFaq=()=>{
    if(!working||working.id!=='faq'||working.items.length)return;
    if(!window.confirm('Mevcut sitedeki 30 SSS kaydı Türkçe olarak düzenleme ekranına alınacak. Eski paket ve fiyat ifadelerini kontrol etmeden yayımlamayın. Devam edilsin mi?'))return;
    const items=originalFaq.items.map(row=>({
      id:row.id,enabled:true,sortOrder:0,
      fields:{question:{[originalFaq.locale]:row.question},answer:{[originalFaq.locale]:row.answer}},
      assets:{image:''},links:{href:''}
    }));
    patch({items});
    setMessage('Mevcut site soruları içe alındı. Metinleri gözden geçirdikten sonra Modülü Kaydet ile yayımlayabilirsiniz.');
  };
  const fields=working?MODULE_FIELDS[working.id]||[]:[];
  const entries=working?ENTRY_FIELDS[working.id]||[]:[];
  const hasImage=['builder','showcase','references'].includes(working?.id||'');
  const hasLink=['showcase','references'].includes(working?.id||'');
  const itemLabel=(x:Entry,i:number)=>x.fields?.heading?.[lang]||x.fields?.question?.[lang]||x.fields?.heading?.tr||x.fields?.question?.tr||'Kayıt '+(i+1);
  const stateText=data?.version===0?'Henüz yayına alınmış özel içerik yok; site kendi mevcut HTML içeriğini koruyor.':'İçerik sürümü: '+data?.version;
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Ticarti.com · Anasayfa</h1><ToolbarDescription>Orijinal tasarım korunarak modül bazlı içerik, dil ve sıralama yönetimi.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button><Button disabled={!working||saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Modülü Kaydet</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div><div className="font-medium">Anasayfa içerik yönetimi</div><p className="mt-1 text-sm text-muted-foreground">{stateText}</p><p className="mt-1 text-xs text-muted-foreground">Orijinal HTML, animasyonlar, butonlar ve CSS değişmez. İçe aktarma yalnızca içerik verilerini yükler.</p></div>
        <Button size="sm" variant="outline" asChild><label className="cursor-pointer"><Upload className="size-4"/>Mevcut Site İçeriğini İçe Aktar<input type="file" hidden accept=".json,application/json" disabled={saving} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importFile(file)}}/></label></Button>
      </CardContent></Card>
      {localesError?<p role="alert" className="text-sm text-destructive">{localesError}</p>:null}
      {error?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
      {message?<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{message}</div>:null}
      {loading?<div className="grid min-h-64 place-items-center"><LoaderCircle className="animate-spin"/></div>:<div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card><CardHeader><CardHeading><Layers3 className="me-2 inline size-4"/>Anasayfa Modülleri</CardHeading></CardHeader><CardContent className="grid content-start gap-1 p-3">
          {(data?.modules||[]).map((m,i)=><button key={m.id} className={'flex items-center justify-between rounded-lg px-3 py-3 text-left '+(active===m.id?'bg-muted text-primary':'hover:bg-muted/50')} type="button" onClick={()=>{setActive(m.id);setError('');setMessage('')}}><span className="flex min-w-0 items-center gap-3"><span className="text-xs text-muted-foreground">{String(i+1).padStart(2,'0')}</span><span className="truncate text-sm font-medium">{m.title}</span></span>{m.enabled===false?<Badge appearance="light" variant="secondary">Pasif</Badge>:null}</button>)}
        </CardContent></Card>
        {working?<Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardHeading>{working.title}</CardHeading><p className="mt-1 text-xs text-muted-foreground">Şablon: {working.selector} · Görünüm sınıfları değiştirilmez.</p></div><label className="flex items-center gap-2 text-sm"><Switch checked={working.enabled!==false} onCheckedChange={enabled=>patch({enabled})}/>Aktif</label></div></CardHeader><CardContent className="grid gap-5">
          <div className="flex flex-wrap gap-2 border-b pb-4">{languageList.map(x=><Button size="sm" variant={lang===x.locale?'primary':'outline'} onClick={()=>setLang(x.locale)} key={x.locale}>{x.label||x.locale}</Button>)}</div>
          {fields.length?<div className="grid gap-4">{fields.map(key=><label key={key} className="grid gap-2 text-sm"><span className="font-medium">{FIELD_LABELS[key]||key}</span>{['description','answer'].includes(key)?<Textarea rows={3} value={working.fields?.[key]?.[lang]||''} onChange={e=>patchField(key,e.target.value)}/>:<Input value={working.fields?.[key]?.[lang]||''} onChange={e=>patchField(key,e.target.value)}/>}<span className="text-xs text-muted-foreground">Dil: {lang.toUpperCase()} · Boşsa sitenin mevcut metni kullanılır.</span></label>)}</div>:null}
          {entries.length?<div className="grid gap-4 border-t pt-5">
            <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{working.id==='faq'?'Sık Sorulan Sorular':'Tekrarlanan İçerikler'}</h3><p className="mt-1 text-sm text-muted-foreground">{working.id==='faq'?'Soruları ve yanıtları aktif her dilde düzenleyin. Yalnızca iki alanı da dolu olan sorular sitede ve FAQPage yapılandırılmış verisinde gösterilir.':'Yeni kayıt ekleyebilir, kaldırabilir veya sürükleyerek sıralayabilirsiniz. JSON girmeniz gerekmez.'}</p></div><Button size="sm" variant="outline" onClick={()=>patch({items:[...working.items,newItem()]})}><Plus className="size-4"/>{working.id==='faq'?'Yeni Soru Ekle':'Yeni Kayıt'}</Button></div>
            {working.items.map((entry,i)=><div key={entry.id} draggable onDragStart={e=>{setDragged(entry.id);e.dataTransfer.effectAllowed='move'}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=working.items.findIndex(x=>x.id===dragged);if(from>=0)move(from,i);setDragged(null)}} onDragEnd={()=>setDragged(null)} className="rounded-lg border p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2"><GripVertical className="size-4 cursor-grab text-muted-foreground"/><span className="min-w-0 truncate text-sm font-semibold">{itemLabel(entry,i)}</span></div>
                <div className="flex items-center gap-2"><Switch checked={entry.enabled!==false} onCheckedChange={enabled=>patchItem(entry.id,x=>({...x,enabled}))}/><Button size="icon" variant="outline" disabled={i===0} onClick={()=>move(i,i-1)}><ArrowUp className="size-4"/></Button><Button size="icon" variant="outline" disabled={i===working.items.length-1} onClick={()=>move(i,i+1)}><ArrowDown className="size-4"/></Button><Button size="icon" variant="outline" onClick={()=>{if(window.confirm('Bu kaydı kaldırmak istiyor musunuz?'))patch({items:working.items.filter(x=>x.id!==entry.id)})}}><Trash2 className="size-4"/></Button></div>
              </div>
              <div className="grid gap-4">{entries.map(key=><label key={key} className="grid gap-1.5 text-sm"><span className="font-medium">{FIELD_LABELS[key]||key} · {lang.toUpperCase()}</span>{['description','answer'].includes(key)?<Textarea rows={2} value={entry.fields?.[key]?.[lang]||''} onChange={e=>patchItem(entry.id,x=>({...x,fields:{...x.fields,[key]:{...(x.fields?.[key]||{}),[lang]:e.target.value}}}))}/>:<Input value={entry.fields?.[key]?.[lang]||''} onChange={e=>patchItem(entry.id,x=>({...x,fields:{...x.fields,[key]:{...(x.fields?.[key]||{}),[lang]:e.target.value}}}))}/>}</label>)}
                {hasImage?<MediaField label="Görsel / logo" value={entry.assets?.image||''} onChange={image=>patchItem(entry.id,x=>({...x,assets:{...x.assets,image}}))}/>:null}
                {hasLink?<label className="grid gap-2 text-sm"><span className="font-medium">Bağlantı adresi</span><Input value={entry.links?.href||''} placeholder="https:// veya sayfa bağlantısı" onChange={e=>patchItem(entry.id,x=>({...x,links:{...x.links,href:e.target.value}}))}/></label>:null}
              </div>
            </div>)}{!working.items.length?<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Henüz kayıt yok. Yeni Kayıt butonuyla ekleyebilir veya mevcut site verisini içe aktarabilirsiniz.</div>:null}
          </div>:null}
          {working.id==='faq'&&!working.items.length?<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
            <div><b>Mevcut SSS içeriklerini taşı</b><p className="mt-1 text-muted-foreground">Sitedeki orijinal Türkçe 30 soru-cevap, yalnızca düzenlemeye alınır. Eski paket/fiyat bilgilerini mutlaka kontrol edin; otomatik yayımlanmaz.</p></div>
            <Button size="sm" variant="outline" onClick={importOriginalFaq}><Upload className="size-4"/>Mevcut SSS'yi İçe Aktar</Button>
          </div>:null}
          {working.id==='faq'?<div className="rounded-lg border p-4 text-sm">
            <b>SEO / FAQPage</b>
            <p className="mt-1 text-muted-foreground">Bu sayfanın açık olduğu dilde soru ve cevap alanları dolu olan aktif kayıtlar, anasayfanın sunucu HTML çıktısına ve aynı içerikli FAQPage JSON-LD şemasına eklenir. Eksik çeviriler başka bir dilden doldurulmaz.</p>
            <p className="mt-2 text-xs text-muted-foreground">Bu modülün yazılarını ve sırasını buradan yönetin. Eski HTML şablonundaki örnek sorular otomatik olarak sisteme aktarılmaz.</p>
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
