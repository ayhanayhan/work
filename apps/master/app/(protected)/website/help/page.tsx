'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {ChevronDown,ChevronUp,ExternalLink,LoaderCircle,Plus,RefreshCw,Save,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';

type Article={id:string;slug:string;question:string;answer:string;enabled:boolean;sortOrder:number};
type Topic={id:string;slug?:string;title:string;summary:string;enabled:boolean;sortOrder:number;questions:Article[]};
type Snapshot={version:number;topics:Topic[]};
const clone=<T,>(data:T):T=>JSON.parse(JSON.stringify(data));
const slug=(value:string)=>value.toLocaleLowerCase('tr')
 .replace(/[çğıöşü]/g,c=>({ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'} as Record<string,string>)[c]||c)
 .replace(/[^a-z0-9]+/g,'-').replace(/^-|-+$/g,'').slice(0,100);
const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
function Field({label,children,help}:{label:string;children:React.ReactNode;help?:string}){
 return <label className="grid gap-2 text-sm"><span className="font-medium">{label}</span>{children}
  {help?<span className="text-xs text-muted-foreground">{help}</span>:null}</label>;
}
function move<T,>(items:T[],index:number,by:number){
 const next=[...items],target=index+by;
 if(target<0||target>=next.length)return next;
 const [item]=next.splice(index,1);next.splice(target,0,item);return next;
}
export default function HelpContentEditor(){
 const {request,restoring}=useMasterSession();
 const [saved,setSaved]=useState<Snapshot|null>(null),[draft,setDraft]=useState<Snapshot|null>(null);
 const [active,setActive]=useState<string>(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[success,setSuccess]=useState('');
 const load=useCallback(async()=>{
  if(restoring)return;
  setLoading(true);setError('');
  try{
   const result=await request('/superadmin/website/help') as Snapshot;
   if(!Array.isArray(result?.topics))throw new Error('Yardım içerikleri alınamadı. API güncellendi mi?');
   setSaved(result);setDraft(clone(result));
   setActive(current=>result.topics.some(x=>x.id===current)?current:result.topics[0]?.id||'');
  }catch(e:any){setError(e.message||'Yardım içerikleri yüklenemedi.')}
  finally{setLoading(false)}
 },[request,restoring]);
 useEffect(()=>{void load()},[load]);
 const dirty=!!saved&&!!draft&&JSON.stringify(saved.topics)!==JSON.stringify(draft.topics);
 const patchTopic=(key:string,change:Partial<Topic>)=>setDraft(old=>old?{
  ...old,topics:old.topics.map(t=>t.id===key?{...t,...change}:t)
 }:old);
 const patchArticle=(topicId:string,articleId:string,change:Partial<Article>)=>setDraft(old=>old?{
  ...old,topics:old.topics.map(t=>t.id===topicId?{...t,questions:t.questions.map(a=>a.id===articleId?{...a,...change}:a)}:t)
 }:old);
 const addTopic=()=>{
  const nextId='kategori-'+id();
  setDraft(old=>old?{...old,topics:[...old.topics,{id:nextId,slug:nextId,title:'Yeni kategori',summary:'',enabled:false,sortOrder:old.topics.length,questions:[]}]}:old);
  setActive(nextId);setSuccess('');
 };
 const addArticle=(topicId:string)=>{
  const newId='makale-'+id();
  setDraft(old=>old?{...old,topics:old.topics.map(t=>t.id===topicId?{
   ...t,questions:[...t.questions,{id:newId,slug:newId,question:'Yeni makale',answer:'Makalenin açıklamasını buraya yazın.',enabled:false,sortOrder:t.questions.length}]
  }:t)}:old);
 };
 const removeTopic=(topic:Topic)=>{
  if(!window.confirm('"'+topic.title+'" kategorisi ve içindeki tüm makaleler silinsin mi?'))return;
  setDraft(old=>old?{...old,topics:old.topics.filter(x=>x.id!==topic.id)}:old);
  if(active===topic.id)setActive('');
 };
 const removeArticle=(topicId:string,article:Article)=>{
  if(!window.confirm('"'+article.question+'" makalesi silinsin mi?'))return;
  setDraft(old=>old?{...old,topics:old.topics.map(t=>t.id===topicId?{...t,questions:t.questions.filter(a=>a.id!==article.id)}:t)}:old);
 };
 const reorderTopic=(i:number,by:number)=>setDraft(old=>old?{...old,topics:move(old.topics,i,by)}:old);
 const reorderArticle=(topicId:string,i:number,by:number)=>setDraft(old=>old?{...old,topics:old.topics.map(t=>t.id===topicId?{...t,questions:move(t.questions,i,by)}:t)}:old);
 const save=async()=>{
  if(!draft||busy)return;
  setBusy(true);setError('');setSuccess('');
  try{
   const result=await request('/superadmin/website/help',{method:'PATCH',body:JSON.stringify(draft)}) as Snapshot;
   if(!Array.isArray(result?.topics))throw new Error('Kaydedilen veri doğrulanamadı.');
   setDraft(clone(result));setSaved(result);
   setSuccess('Yardım Merkezi içeriği kaydedildi ve yayın durumuna göre güncellendi.');
  }catch(e:any){setError(e.message||'Kaydetme başarısız.')}
  finally{setBusy(false)}
 };
 const totals=useMemo(()=>({categories:draft?.topics.filter(t=>t.enabled).length||0,
  articles:draft?.topics.filter(t=>t.enabled).reduce((n,t)=>n+t.questions.filter(a=>a.enabled).length,0)||0}),[draft]);
 return <Container className="grid gap-5 pb-12">
  <div className="flex flex-wrap justify-between gap-4 items-start">
   <div><h1 className="text-xl font-semibold">Yardım Merkezi</h1>
    <p className="mt-1 text-sm text-muted-foreground">help.ticarti.com kategorilerini ve makalelerini buradan yönetin.</p>
    <p className="mt-2 text-xs text-muted-foreground">Yayında: {totals.categories} kategori · {totals.articles} makale</p></div>
   <div className="flex flex-wrap gap-2">
    <Button variant="outline" asChild><a href="https://help.ticarti.com/" target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4"/>Siteyi aç</a></Button>
    <Button variant="outline" disabled={busy||loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button>
    <Button disabled={busy||loading||!dirty} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button>
   </div>
  </div>
  {error?<div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
  {success?<div role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">{success}</div>:null}
  {loading?<div className="flex justify-center p-12"><LoaderCircle className="animate-spin"/></div>:null}
  {!loading&&draft?<div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
   <aside className="flex flex-col gap-2 self-start rounded-xl border bg-card p-3">
    <div className="px-2 pt-2 pb-1 text-sm font-semibold">Kategoriler</div>
    {draft.topics.map((topic,i)=><div key={topic.id} className={`flex items-center gap-1 rounded-md ${active===topic.id?'bg-muted':''}`}>
     <button className="min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-sm" onClick={()=>setActive(topic.id)}>
      {topic.title||topic.id} {!topic.enabled?<span className="text-xs text-muted-foreground">(Taslak)</span>:null}
     </button>
     <button title="Yukarı taşı" disabled={i===0} className="p-1 disabled:opacity-30" onClick={()=>reorderTopic(i,-1)}><ChevronUp className="size-4"/></button>
     <button title="Aşağı taşı" disabled={i===draft.topics.length-1} className="p-1 disabled:opacity-30" onClick={()=>reorderTopic(i,1)}><ChevronDown className="size-4"/></button>
    </div>)}
    <Button variant="outline" className="mt-3" onClick={addTopic}><Plus className="size-4"/>Kategori ekle</Button>
   </aside>
   <section className="min-w-0">
    {draft.topics.filter(t=>t.id===active).map(topic=><div key={topic.id} className="grid gap-5">
     <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap justify-between gap-3">
       <h2 className="font-semibold">Kategori bilgileri</h2>
       <div className="flex items-center gap-2 text-sm"><Switch checked={topic.enabled} onCheckedChange={enabled=>patchTopic(topic.id,{enabled})}/>Yayında</div>
      </div>
      <div className="grid gap-4">
       <Field label="Kategori başlığı"><Input value={topic.title} maxLength={220} onChange={e=>patchTopic(topic.id,{title:e.target.value})}/></Field>
       <Field label="Bağlantı (slug)" help="Kategori bağlantısı değişirse eski bağlantı çalışmaz. Sadece küçük harf, rakam ve tire.">
        <Input value={topic.slug||topic.id} maxLength={100} onChange={e=>patchTopic(topic.id,{slug:slug(e.target.value)})}/></Field>
       <Field label="Kategori açıklaması"><Textarea rows={3} value={topic.summary} maxLength={1500} onChange={e=>patchTopic(topic.id,{summary:e.target.value})}/></Field>
      </div>
      <Button variant="outline" className="mt-4" onClick={()=>removeTopic(topic)}><Trash2 className="size-4"/>Kategoriyi sil</Button>
     </div>
     <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
       <div><h2 className="font-semibold">Makaleler</h2><p className="text-xs text-muted-foreground">Makale başlığını değiştirmek bağlantıyı değiştirmez.</p></div>
       <Button variant="outline" onClick={()=>addArticle(topic.id)}><Plus className="size-4"/>Makale ekle</Button>
      </div>
      <div className="grid gap-4">{topic.questions.map((article,i)=><details key={article.id} className="rounded-lg border p-4" open={undefined}>
       <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{article.question}</span>
        {!article.enabled?<span className="text-xs text-muted-foreground">Taslak</span>:null}
       </summary>
       <div className="mt-4 grid gap-4 border-t pt-4">
        <div className="flex items-center justify-between gap-2">
         <label className="flex items-center gap-2 text-sm"><Switch checked={article.enabled} onCheckedChange={enabled=>patchArticle(topic.id,article.id,{enabled})}/>Yayında</label>
         <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={i===0} onClick={()=>reorderArticle(topic.id,i,-1)}><ChevronUp className="size-4"/>Yukarı</Button>
          <Button variant="ghost" size="sm" disabled={i===topic.questions.length-1} onClick={()=>reorderArticle(topic.id,i,1)}><ChevronDown className="size-4"/>Aşağı</Button>
         </div>
        </div>
        <Field label="Makale başlığı"><Input value={article.question} maxLength={300} onChange={e=>patchArticle(topic.id,article.id,{question:e.target.value})}/></Field>
        <Field label="Bağlantı (slug)" help="İlk yayından önce değiştirilebilir; yayınlandıktan sonra değiştirmeyin.">
         <Input value={article.slug} maxLength={100} onChange={e=>patchArticle(topic.id,article.id,{slug:slug(e.target.value)})}/></Field>
        <Field label="Makale içeriği" help="Satır sonları korunur. Bu alan düz metin editörüdür.">
         <Textarea rows={9} value={article.answer} maxLength={30000} onChange={e=>patchArticle(topic.id,article.id,{answer:e.target.value})}/></Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
         <a className="text-sm underline" href={'https://help.ticarti.com/makale/'+article.slug} target="_blank" rel="noopener noreferrer">Makaleyi görüntüle</a>
         <Button variant="outline" onClick={()=>removeArticle(topic.id,article)}><Trash2 className="size-4"/>Sil</Button>
        </div>
       </div>
      </details>)}
      {!topic.questions.length?<div className="py-5 text-center text-sm text-muted-foreground">Bu kategoride henüz makale bulunmuyor.</div>:null}
      </div>
     </div>
    </div>)}
   </section>
  </div>:null}
 </Container>;
}
