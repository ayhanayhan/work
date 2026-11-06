'use client';

import {useCallback,useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,GripVertical,LoaderCircle,Plus,RefreshCw,Save,Search,Trash2,Upload} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Dialog,DialogBody,DialogContent,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {MediaField} from '@/app/(protected)/catalog/components/catalog-fields';

type Translation={title:string;excerpt:string;content:string;category:string;seoTitle:string;seoDescription:string};
type Post={id:string;slug:string;status:string;featuredImage:string;sortOrder:number;translations:Record<string,Translation>};
type Snapshot={version:number;posts:Post[]};
const blank=():Translation=>({title:'',excerpt:'',content:'',category:'',seoTitle:'',seoDescription:''});
const newPost=():Post=>({id:'post-'+Date.now().toString(36),slug:'',status:'DRAFT',featuredImage:'',sortOrder:0,translations:{tr:blank()}});
const errorText=(e:any)=>e?.message||'İşlem başarısız.';

export default function WebsiteBlogEditor(){
  const {request,restoring}=useMasterSession();
  const [data,setData]=useState<Snapshot>({version:0,posts:[]}),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[query,setQuery]=useState('');
  const [editId,setEditId]=useState<string|null>(null),[lang,setLang]=useState('tr'),[drag,setDrag]=useState<string|null>(null);
  const [locales,setLocales]=useState<Array<{locale:string;label:string}>>([{locale:'tr',label:'Türkçe'},{locale:'en',label:'English'}]);
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const [result,langs]=await Promise.all([request('/superadmin/website/blog'),request('/superadmin/platform-locales')]);
      setData(result);
      if(Array.isArray(langs)&&langs.length){const known=new Set<string>();setLocales(langs.filter((x:any)=>{const code=String(x.locale||'').split('-')[0].toLowerCase();if(!code||known.has(code))return false;known.add(code);return true}).map((x:any)=>({locale:String(x.locale).split('-')[0].toLowerCase(),label:x.label||x.locale})))}
    }catch(e){setError(errorText(e))}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const editing=data.posts.find(p=>p.id===editId)||null;
  const update=(id:string,fn:(p:Post)=>Post)=>setData(x=>({...x,posts:x.posts.map(p=>p.id===id?fn(p):p)}));
  const field=(key:keyof Translation,value:string)=>{if(!editing)return;update(editing.id,p=>({...p,translations:{...p.translations,[lang]:{...blank(),...(p.translations[lang]||{}),[key]:value}}}))};
  const value=(key:keyof Translation)=>editing?.translations?.[lang]?.[key]||'';
  const reorder=(from:number,to:number)=>setData(x=>{if(to<0||to>=x.posts.length||from===to)return x;const posts=[...x.posts];const [p]=posts.splice(from,1);posts.splice(to,0,p);return {...x,posts}});
  const save=async()=>{
    if(data.posts.some(x=>!x.slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug))){setError('Her yazının SEO URL kodu küçük harf, sayı ve tireden oluşmalıdır.');return}
    if(new Set(data.posts.map(x=>x.slug)).size!==data.posts.length){setError('Tekrarlanan blog URL kodu var.');return}
    setSaving(true);setError('');setMessage('');
    try{
      const result=await request('/superadmin/website/blog',{method:'PATCH',body:JSON.stringify(data)});
      setData(result);setMessage('Blog içerikleri kaydedildi. Yayındaki yazılar anasayfa carousel alanına bağlandı.');
      if(editId&&!result.posts.some((x:Post)=>x.id===editId))setEditId(null);
    }catch(e){setError(errorText(e))}
    finally{setSaving(false)}
  };
  const importFile=async(file:File)=>{
    try{
      const dataFile=JSON.parse(await file.text());
      if(!Array.isArray(dataFile.posts))throw new Error('Blog içerik dosyası geçersiz.');
      if(data.posts.length&&!window.confirm('Mevcut blog kayıtları arşiv içeriğiyle değiştirilsin mi?'))return;
      setData(old=>({...old,posts:dataFile.posts.map((x:any,i:number)=>({
        id:'legacy-'+String(x.slug),slug:String(x.slug),status:'PUBLISHED',sortOrder:i,
        featuredImage:typeof x.cover==='string'?'../assets/images/blog/'+x.cover+'.svg':'',
        translations:{tr:{...blank(),title:String(x.title||''),excerpt:String(x.excerpt||''),category:String(x.category||''),content:Array.isArray(x.paragraphs)?x.paragraphs.join('\n\n'):''}}
      }))}));setMessage('Mevcut blog içeriği hazır. Yayınlamak için Blogu Kaydet butonuna basın.');
    }catch(e){setError(errorText(e))}
  };
  const shown=data.posts.filter(x=>[x.slug,...Object.values(x.translations||{}).map(v=>v.title)].join(' ').toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Ticarti.com · Blog İçerikleri</h1><ToolbarDescription>Kurumsal blogu çok dilli olarak yönet. Bu içerikler mağazaların blogundan ayrıdır.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button><Button onClick={()=>{const p=newPost();setData(x=>({...x,posts:[...x.posts,p]}));setEditId(p.id)}}><Plus className="size-4"/>Yeni Yazı</Button><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Blogu Kaydet</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><div className="font-medium">Kurumsal blog</div><p className="text-sm text-muted-foreground">{data.posts.length} yazı · {data.posts.filter(p=>p.status==='PUBLISHED').length} yayında · dil, görsel ve SEO alanları ayrı ayrı yönetilir.</p></div><Button asChild variant="outline" size="sm"><label className="cursor-pointer"><Upload className="size-4"/>Mevcut Blogu İçe Aktar<input type="file" accept=".json,application/json" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importFile(file)}}/></label></Button></CardContent></Card>
      {error?<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      {message?<p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{message}</p>:null}
      <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardHeading>Blog Yazıları</CardHeading><div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="w-72 ps-9" placeholder="Başlık veya URL ara" value={query} onChange={e=>setQuery(e.target.value)}/></div></div></CardHeader><CardContent className="grid gap-2 p-4">
        {loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin"/></div>:shown.map(p=><div key={p.id} draggable onDragStart={()=>setDrag(p.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=data.posts.findIndex(x=>x.id===drag),to=data.posts.findIndex(x=>x.id===p.id);if(from>=0&&to>=0)reorder(from,to);setDrag(null)}} onDragEnd={()=>setDrag(null)} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <GripVertical className="size-4 cursor-grab text-muted-foreground"/>
          {p.featuredImage?<img src={p.featuredImage} alt="" className="h-14 w-20 rounded border object-contain"/>:null}
          <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.translations.tr?.title||Object.values(p.translations)[0]?.title||p.slug||'Yeni Yazı'}</div><div className="mt-0.5 text-xs text-muted-foreground">{p.slug||'URL belirlenmedi'}</div></div>
          <Badge appearance="light" variant={p.status==='PUBLISHED'?'success':'secondary'}>{p.status==='PUBLISHED'?'Yayında':'Taslak'}</Badge>
          <Button variant="outline" size="icon" disabled={data.posts.indexOf(p)===0} onClick={()=>reorder(data.posts.indexOf(p),data.posts.indexOf(p)-1)}><ArrowUp className="size-4"/></Button><Button variant="outline" size="icon" disabled={data.posts.indexOf(p)===data.posts.length-1} onClick={()=>reorder(data.posts.indexOf(p),data.posts.indexOf(p)+1)}><ArrowDown className="size-4"/></Button>
          <Button variant="outline" onClick={()=>{setEditId(p.id);setError('')}}>Düzenle</Button>
          <Button variant="outline" size="icon" onClick={()=>{if(window.confirm('Blog yazısı kaldırılsın mı?'))setData(x=>({...x,posts:x.posts.filter(row=>row.id!==p.id)}))}}><Trash2 className="size-4"/></Button>
        </div>)}{!loading&&!shown.length?<p className="py-12 text-center text-sm text-muted-foreground">Blog yazısı bulunamadı.</p>:null}
      </CardContent></Card>
    </Container>
    {editing?<Dialog open onOpenChange={v=>{if(!v)setEditId(null)}}><DialogContent className="sm:max-w-5xl"><DialogHeader><DialogTitle>Blog Yazısı · {editing.translations.tr?.title||'Yeni Yazı'}</DialogTitle></DialogHeader><DialogBody className="grid max-h-[77vh] gap-5 overflow-y-auto">
      <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-medium">SEO URL / Slug<Input value={editing.slug} placeholder="ornek-yazi" onChange={e=>update(editing.id,p=>({...p,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')}))}/></label><label className="flex items-center gap-2 text-sm"><Switch checked={editing.status==='PUBLISHED'} onCheckedChange={enabled=>update(editing.id,p=>({...p,status:enabled?'PUBLISHED':'DRAFT'}))}/>Yayında / taslak</label></div>
      <MediaField label="Kapak görseli" value={editing.featuredImage||''} onChange={featuredImage=>update(editing.id,p=>({...p,featuredImage}))}/>
      <div className="flex flex-wrap gap-2 border-b pb-3">{locales.map(x=><Button key={x.locale} size="sm" variant={lang===x.locale?'primary':'outline'} onClick={()=>setLang(x.locale)}>{x.label}</Button>)}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Yazı başlığı<Input value={value('title')} onChange={e=>field('title',e.target.value)}/></label>
        <label className="grid gap-2 text-sm font-medium">Kategori<Input value={value('category')} onChange={e=>field('category',e.target.value)}/></label>
      </div>
      <label className="grid gap-2 text-sm font-medium">Kısa açıklama<Textarea value={value('excerpt')} onChange={e=>field('excerpt',e.target.value)} rows={3}/></label>
      <label className="grid gap-2 text-sm font-medium">Yazı içeriği<Textarea value={value('content')} onChange={e=>field('content',e.target.value)} rows={10}/></label>
      <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-medium">SEO başlığı<Input value={value('seoTitle')} onChange={e=>field('seoTitle',e.target.value)}/></label><label className="grid gap-2 text-sm font-medium">SEO açıklaması<Textarea rows={2} value={value('seoDescription')} onChange={e=>field('seoDescription',e.target.value)}/></label></div>
      <p className="text-xs text-muted-foreground">Başlık ve içerikler seçilen dile kaydedilir. Sitenin mevcut blog kartı tasarımı değiştirilmez.</p>
    </DialogBody><DialogFooter><Button variant="outline" onClick={()=>setEditId(null)}>Kapat</Button><Button onClick={async()=>{await save();setEditId(null)}} disabled={saving}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button></DialogFooter></DialogContent></Dialog>:null}
  </>;
}
