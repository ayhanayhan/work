'use client';
import {useCallback,useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,LoaderCircle,Plus,RefreshCw,Save,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Card,CardContent} from '@/components/ui/card';
import {MediaField} from '@/app/(protected)/catalog/components/catalog-fields';

type Localized=Record<string,string>;
type Section={id:string;kind:'text'|'list'|'steps'|'notice';title:Localized;body:Localized;image:string};
type FAQ={id:string;question:Localized;answer:Localized};
type Tool={id:string;sortOrder:number;status:'DRAFT'|'PUBLISHED';image:string;
 fields:Record<string,Localized>;sections:Section[];faqs:FAQ[]};
type Snapshot={version:number;tools:Tool[]};
const names:Record<string,string>={
 'qr-kod-olusturucu':'QR Kod Oluşturucu','ean13-barkod-olusturucu':'EAN-13 Barkod Oluşturucu','kdv-hesaplama':'KDV Hesaplama',
 'trendyol-komisyon-hesaplama':'Trendyol Komisyon Hesaplama',
 'amazon-komisyon-hesaplama':'Amazon Komisyon Hesaplama',
 'hepsiburada-komisyon-hesaplama':'Hepsiburada Komisyon Hesaplama',
 'n11-komisyon-hesaplama':'n11 Komisyon Hesaplama',
 'ciceksepeti-komisyon-hesaplama':'ÇiçekSepeti Komisyon Hesaplama',
 'pazarama-komisyon-hesaplama':'Pazarama Komisyon Hesaplama',
 'maas-hesaplama':'Net-Brüt Maaş Hesaplama',
 'gumruk-vergisi-hesaplama':'Gümrük Vergisi Hesaplama',
 'desi-hesaplama':'Desi Hesaplama'
};
const sections=[
 {title:'Sayfa başlangıcı',fields:[['title','Başlık'],['subtitle','Alt başlık'],['intro','Giriş açıklaması']]},
 {title:'Hesaplama alanı',fields:[['calculatorTitle','Hesaplayıcı başlığı'],['calculatorDescription','Hesaplayıcı açıklaması']]},
 {title:'Açıklama ve kullanım',fields:[['description','Detaylı açıklama'],['howItWorksTitle','Nasıl kullanılır başlığı'],['howItWorks','Nasıl kullanılır metni'],
  ['exampleTitle','Örnek başlığı'],['example','Örnek hesaplama açıklaması']]},
 {title:'SSS ve alt CTA',fields:[['faqTitle','SSS başlığı'],['ctaTitle','CTA başlığı'],['ctaText','CTA açıklaması'],
  ['ctaButton','CTA buton metni'],['ctaUrl','CTA bağlantısı'],['disclaimer','Bilgilendirme / yasal not']]},
 {title:'SEO',fields:[['seoTitle','SEO başlığı'],['seoDescription','Meta açıklaması'],['imageAlt','Görsel alt metni']]}
] as const;
const longFields=new Set(['intro','description','howItWorks','example','ctaText','disclaimer','calculatorDescription']);
const uid=(prefix:string)=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
export default function ToolsEditor(){
 const {request,restoring,locales,localesLoading,localesError}=useMasterSession();
 const [data,setData]=useState<Snapshot|null>(null),[draft,setDraft]=useState<Snapshot|null>(null);
 const [id,setId]=useState('qr-kod-olusturucu'),[lang,setLang]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(locales.length)setLang(prev=>locales.some(l=>l.locale===prev)?prev:locales.find(l=>l.isDefault)?.locale||locales[0].locale)},[locales]);
 const locale=lang||locales.find(l=>l.isDefault)?.locale||'tr';
 const load=useCallback(async()=>{
  if(restoring)return;
  setLoading(true);setError('');
  try{
   const response=await request('/superadmin/website/tools') as Snapshot;
   if(!Array.isArray(response?.tools))throw Error('Araç içerikleri okunamadı.');
   setData(response);setDraft(clone(response));
  }catch(e:any){setError(e?.message||'Araçlar alınamadı.');}
  finally{setLoading(false)}
 },[request,restoring]);
 useEffect(()=>{void load()},[load]);
 const current=draft?.tools.find(x=>x.id===id);
 const changed=!!data&&!!draft&&JSON.stringify(data.tools)!==JSON.stringify(draft.tools);
 const edit=(fn:(x:Tool)=>Tool)=>setDraft(prev=>prev?{...prev,tools:prev.tools.map(x=>x.id===id?fn(x):x)}:prev);
 const field=(key:string,value:string)=>edit(x=>({...x,fields:{...x.fields,
  [key]:{...(x.fields[key]||{}),[locale]:value}}}));
 const move=(list:'sections'|'faqs',i:number,offset:number)=>edit(x=>{
  const items=[...x[list]],to=i+offset;
  if(to<0||to>=items.length)return x;
  [items[i],items[to]]=[items[to],items[i]];
  return {...x,[list]:items};
 });
 const editSection=(sectionId:string,key:'title'|'body'|'image'|'kind',value:string)=>edit(x=>({...x,
  sections:x.sections.map(section=>section.id!==sectionId?section:{
   ...section,[key]:key==='image'||key==='kind'?value:{...section[key],[locale]:value}
  })}));
 const editFaq=(faqId:string,key:'question'|'answer',value:string)=>edit(x=>({...x,
  faqs:x.faqs.map(faq=>faq.id!==faqId?faq:{...faq,[key]:{...faq[key],[locale]:value}})
 }));
 const add=(type:'sections'|'faqs')=>edit(x=>type==='sections'?{...x,sections:[...x.sections,{id:uid('section'),kind:'text',title:{},body:{},image:''}]}:
  {...x,faqs:[...x.faqs,{id:uid('faq'),question:{},answer:{}}]});
 const remove=(type:'sections'|'faqs',rowId:string)=>edit(x=>({...x,
  [type]:x[type].filter(row=>row.id!==rowId)}));
 const choose=(next:string)=>{if(changed&&!window.confirm('Kaydedilmemiş değişiklikler var. Değişikliklerden vazgeçilsin mi?'))return;
  setDraft(data?clone(data):null);setId(next);setError('');setNotice('')};
 const chooseLocale=(next:string)=>{if(changed&&!window.confirm('Kaydedilmemiş değişiklikler var. Değişikliklerden vazgeçilsin mi?'))return;
  setDraft(data?clone(data):null);setLang(next);setError('');setNotice('')};
 const save=async()=>{
  if(!draft||saving)return;
  setSaving(true);setError('');setNotice('');
  try{
   const result=await request('/superadmin/website/tools',{method:'PATCH',body:JSON.stringify(draft)}) as Snapshot;
   if(!result?.tools||typeof result.version!=='number')throw Error('Kaydetme yanıtı geçersiz.');
   setData(result);setDraft(clone(result));setNotice('Araç içerikleri kaydedildi.');
  }catch(e:any){setError(e?.message||'Kaydedilemedi.');}
  finally{setSaving(false)}
 };
 return <Container className="grid gap-5 pb-12">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-semibold">Araçlar · İçerik Yönetimi</h1>
    <p className="mt-1 text-sm text-muted-foreground">Ticarti.com'un mevcut tasarımını değiştirmeden 12 araç sayfasının tüm içeriğini yönetin.</p></div>
   <div className="flex gap-2">
    <Button variant="outline" onClick={()=>void load()} disabled={loading||saving}><RefreshCw className="size-4"/>Yenile</Button>
    <Button onClick={()=>void save()} disabled={!draft||saving||loading}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button>
   </div>
  </div>
  {error?<p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>:null}
  {notice?<p role="status" className="rounded-md border p-3 text-sm">{notice}</p>:null}
  {localesError?<p role="alert" className="text-sm text-destructive">{localesError}</p>:null}
  <div className="rounded-lg border bg-card p-4">
   <b className="text-sm">İçerik dili</b>
   <div className="mt-3 flex flex-wrap gap-2">
    {locales.map(l=><Button key={l.locale} variant={locale===l.locale?'primary':'outline'} size="sm" disabled={saving}
     onClick={()=>chooseLocale(l.locale)}>{l.label||l.locale}</Button>)}
   </div>
   {localesLoading?<span className="text-xs text-muted-foreground">Diller yükleniyor…</span>:null}
  </div>
  {loading?<div className="p-10 text-center">İçerikler yükleniyor…</div>:draft&&current?
  <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
   <nav aria-label="Araç sayfaları" className="sticky top-20 grid gap-1 rounded-lg border bg-card p-3">
    <b className="px-2 pb-2 text-sm">Araçlar</b>
    {draft.tools.map(x=><button type="button" key={x.id} onClick={()=>choose(x.id)}
     className={'rounded-md px-3 py-2 text-left text-sm '+(x.id===id?'bg-primary text-primary-foreground':'hover:bg-muted')}>
     {names[x.id]||x.id}<span className="mt-1 block text-xs opacity-70">{x.status==='PUBLISHED'?'Yayında':'Taslak'}</span>
    </button>)}
   </nav>
   <div className="grid min-w-0 gap-4">
    <Card><CardContent className="grid gap-3 p-5">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">{names[id]}</h2><p className="text-xs text-muted-foreground">/araclar/{id}</p></div>
      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={current.status}
       onChange={e=>edit(x=>({...x,status:e.target.value as Tool['status']}))}>
       <option value="DRAFT">Taslak</option><option value="PUBLISHED">Yayında</option>
      </select>
     </div>
     <p className="text-xs text-muted-foreground">Hesaplama motoru Marketing üzerinde çalışır. Bu ekrandan çok dilli içerikleri, SSS ve SEO alanlarını yönetebilirsiniz.</p>
     <MediaField label="Öne çıkan görsel" value={current.image||''}
      onChange={image=>edit(x=>({...x,image}))}/>
    </CardContent></Card>
    {sections.map(group=><Card key={group.title}><CardContent className="grid gap-3 p-5">
     <h3 className="font-semibold">{group.title}</h3>
     <div className="grid gap-3">
      {group.fields.map(([key,label])=><label className="grid gap-1 text-sm" key={key}>
       {label}
       {longFields.has(key)?<Textarea rows={3} value={current.fields?.[key]?.[locale]||''}
        onChange={e=>field(key,e.target.value)}/>:
       <Input value={current.fields?.[key]?.[locale]||''} onChange={e=>field(key,e.target.value)}/>}
      </label>)}
     </div>
    </CardContent></Card>)}
    <Card><CardContent className="grid gap-4 p-5">
     <div className="flex justify-between gap-2"><h3 className="font-semibold">İçerik bölümleri ({current.sections.length})</h3>
      <Button variant="outline" size="sm" onClick={()=>add('sections')}><Plus className="size-4"/>Bölüm Ekle</Button></div>
     {current.sections.map((section,index)=><details key={section.id} className="rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">{section.title?.[locale]||'Bölüm '+(index+1)}</summary>
      <div className="mt-3 grid gap-3">
       <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={index===0} onClick={()=>move('sections',index,-1)}><ArrowUp className="size-4"/></Button>
        <Button size="sm" variant="outline" disabled={index===current.sections.length-1} onClick={()=>move('sections',index,1)}><ArrowDown className="size-4"/></Button>
        <Button size="sm" variant="outline" onClick={()=>remove('sections',section.id)}><Trash2 className="size-4"/></Button>
       </div>
       <label className="grid gap-1 text-sm">Bölüm türü
        <select className="h-10 rounded-md border bg-background px-3" value={section.kind||'text'}
         onChange={e=>editSection(section.id,'kind',e.target.value)}>
         <option value="text">Açıklama</option>
         <option value="list">Madde işaretli liste</option>
         <option value="steps">Numaralı adımlar</option>
         <option value="notice">Bilgilendirme notu</option>
        </select>
       </label>
       <label className="grid gap-1 text-sm">Başlık
        <Input value={section.title?.[locale]||''} onChange={e=>editSection(section.id,'title',e.target.value)}/></label>
       <label className="grid gap-1 text-sm">Metin
        <Textarea rows={5} value={section.body?.[locale]||''} onChange={e=>editSection(section.id,'body',e.target.value)}/></label>
       <MediaField label="Bölüm görseli" value={section.image||''} onChange={image=>editSection(section.id,'image',image)}/>
      </div>
     </details>)}
    </CardContent></Card>
    <Card><CardContent className="grid gap-4 p-5">
     <div className="flex justify-between gap-2"><h3 className="font-semibold">Sıkça Sorulan Sorular ({current.faqs.length})</h3>
      <Button variant="outline" size="sm" onClick={()=>add('faqs')}><Plus className="size-4"/>Soru Ekle</Button></div>
     {current.faqs.map((faq,index)=><details key={faq.id} className="rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">{faq.question?.[locale]||'Soru '+(index+1)}</summary>
      <div className="mt-3 grid gap-3">
       <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={index===0} onClick={()=>move('faqs',index,-1)}><ArrowUp className="size-4"/></Button>
        <Button size="sm" variant="outline" disabled={index===current.faqs.length-1} onClick={()=>move('faqs',index,1)}><ArrowDown className="size-4"/></Button>
        <Button size="sm" variant="outline" onClick={()=>remove('faqs',faq.id)}><Trash2 className="size-4"/></Button>
       </div>
       <label className="grid gap-1 text-sm">Soru
        <Input value={faq.question?.[locale]||''} onChange={e=>editFaq(faq.id,'question',e.target.value)}/></label>
       <label className="grid gap-1 text-sm">Cevap
        <Textarea rows={3} value={faq.answer?.[locale]||''} onChange={e=>editFaq(faq.id,'answer',e.target.value)}/></label>
      </div>
     </details>)}
    </CardContent></Card>
    <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}>
     {saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Tüm Araç İçeriklerini Kaydet</Button></div>
   </div>
  </div>:null}
 </Container>;
}
