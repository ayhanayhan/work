'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {LoaderCircle,Plus,RefreshCw,Search,Trash2} from 'lucide-react';
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

type Translation={title:string;slug:string;description:string;seoTitle:string;seoDescription:string};
type Category={id:string;parentId:string|null;isActive:boolean;sortOrder:number;translations:Record<string,Translation>};
type Snapshot={version:number;posts:any[];categories:Category[]};

const blank=():Translation=>({title:'',slug:'',description:'',seoTitle:'',seoDescription:''});
const newCategory=():Category=>({id:'cat-'+Date.now().toString(36),parentId:null,isActive:true,sortOrder:0,translations:{}});
const categoryTitle=(c:Category)=>Object.values(c.translations||{}).find(x=>x.title)?.title||'İsimsiz kategori';

export default function WebsiteBlogCategories(){
  const {request,restoring,locales,localesLoading,localesError,reloadLocales}=useMasterSession();
  const [data,setData]=useState<Snapshot>({version:0,posts:[],categories:[]});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [query,setQuery]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [edit,setEdit]=useState<Category|null>(null),[lang,setLang]=useState('');
  useEffect(()=>{if(locales.length)setLang(old=>locales.some(x=>x.locale===old)?old:(locales.find(x=>x.isDefault)?.locale||locales[0].locale))},[locales]);
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const result=await request('/superadmin/website/blog') as Snapshot;
      setData({...result,categories:Array.isArray(result.categories)?result.categories:[]});
    }catch(e:any){setError(e?.message||'Kategoriler alınamadı.')}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);

  const rows=useMemo(()=>data.categories.filter(c=>(
    [categoryTitle(c),...Object.values(c.translations||{}).map(v=>v.slug)].join(' ').toLocaleLowerCase('tr')
      .includes(query.toLocaleLowerCase('tr'))
  )),[data.categories,query]);

  const save=async(categories:Category[])=>{
    setSaving(true);setError('');setMessage('');
    try{
      const result=await request('/superadmin/website/blog',{method:'PATCH',body:JSON.stringify({
        version:data.version,posts:data.posts,categories
      })}) as Snapshot;
      setData({...result,categories:result.categories||[]});
      setMessage('Kategoriler kaydedildi.');
      return true;
    }catch(e:any){setError(e?.message||'Kaydedilemedi. Veriler değişmişse yenileyin.');return false}
    finally{setSaving(false)}
  };
  const store=async()=>{
    if(!edit||localesLoading||localesError||!locales.length)return;
    if(!Object.entries(edit.translations||{}).some(([code,t])=>locales.some(l=>l.locale===code)&&t.title.trim())){
      setError('En az bir dilde kategori adı zorunlu.');return;
    }
    if(edit.parentId===edit.id){setError('Kategori kendisine bağlanamaz.');return;}
    const categories=data.categories.some(x=>x.id===edit.id)?
      data.categories.map(x=>x.id===edit.id?edit:x):[...data.categories,edit];
    if(await save(categories))setEdit(null);
  };
  const remove=async(category:Category)=>{
    if(data.categories.some(x=>x.parentId===category.id)){setError('Önce alt kategorileri taşıyın veya kaldırın.');return;}
    if(!window.confirm('Kategori silinsin mi? Mevcut yazılardaki kategori metinleri korunacaktır.'))return;
    await save(data.categories.filter(x=>x.id!==category.id));
  };
  const field=(key:keyof Translation,value:string)=>setEdit(old=>old?({
    ...old,translations:{...old.translations,[lang]:{...blank(),...(old.translations?.[lang]||{}),[key]:value}}
  }):old);
  const value=(key:keyof Translation)=>edit?.translations?.[lang]?.[key]||'';
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Blog Kategorileri</h1>
      <ToolbarDescription>Ticarti.com blogunun çok dilli kategorilerini ve SEO alanlarını yönetin.</ToolbarDescription>
    </ToolbarHeading><ToolbarActions><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="size-4"/>Yenile</Button>
      <Button disabled={localesLoading||!!localesError||!locales.length} onClick={()=>{setEdit(newCategory());setLang(locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'');setError('')}}><Plus className="size-4"/>Yeni Kategori</Button>
    </ToolbarActions></Toolbar></Container>
    <Container className="pb-10">
      {localesError?<p role="alert" className="mb-4 text-sm text-destructive">{localesError} <Button variant="outline" size="sm" onClick={()=>void reloadLocales()}>Yenile</Button></p>:null}
      {error?<p role="alert" className="mb-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>:null}
      {message?<p className="mb-4 text-sm text-foreground">{message}</p>:null}
      <Card><CardHeader><CardHeading>Blog Kategorileri</CardHeading>
        <div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
          <Input className="w-72 ps-9" placeholder="Kategori ara" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      </CardHeader><CardContent className="grid gap-2 p-4">
        {loading?<div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin"/></div>:rows.map(c=>
          <div key={c.id} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="min-w-0 flex-1"><b>{categoryTitle(c)}</b>
              <div className="text-xs text-muted-foreground">/{c.translations?.tr?.slug||'kategori'} · Üst kategori: {data.categories.find(x=>x.id===c.parentId)?categoryTitle(data.categories.find(x=>x.id===c.parentId)!):'—'}</div>
            </div>
            <Badge appearance="light" variant={c.isActive?'success':'secondary'}>{c.isActive?'Aktif':'Pasif'}</Badge>
            <Button variant="outline" onClick={()=>{setEdit(structuredClone(c));setLang(locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'');setError('')}}>Düzenle</Button>
            <Button variant="outline" size="icon" disabled={saving} onClick={()=>void remove(c)}><Trash2 className="size-4"/></Button>
          </div>)}
        {!loading&&!rows.length?<p className="py-10 text-center text-sm text-muted-foreground">Henüz kategori bulunmuyor.</p>:null}
      </CardContent></Card>
    </Container>
    {edit?<Dialog open onOpenChange={open=>{if(!open)setEdit(null)}}><DialogContent className="sm:max-w-4xl">
      <DialogHeader><DialogTitle>{data.categories.some(c=>c.id===edit.id)?'Kategori Düzenle':'Yeni Kategori'}</DialogTitle></DialogHeader>
      <DialogBody className="grid max-h-[75vh] gap-5 overflow-y-auto">
        {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Üst kategori
            <select className="h-10 rounded-md border bg-background px-3" value={edit.parentId||''} onChange={e=>setEdit(x=>x?{...x,parentId:e.target.value||null}:x)}>
              <option value="">Üst kategori yok</option>{data.categories.filter(x=>x.id!==edit.id).map(x=><option key={x.id} value={x.id}>{categoryTitle(x)}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={edit.isActive} onCheckedChange={v=>setEdit(x=>x?{...x,isActive:v}:x)}/>Aktif kategori</label>
        </div>
        <div className="flex flex-wrap gap-2 border-b pb-3">{locales.map(x=><Button key={x.locale} size="sm" variant={lang===x.locale?'primary':'outline'} onClick={()=>setLang(x.locale)}>{x.label}</Button>)}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Kategori adı<Input value={value('title')} onChange={e=>field('title',e.target.value)}/></label>
          <label className="grid gap-2 text-sm font-medium">SEO URL / Slug<Input value={value('slug')} onChange={e=>field('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-'))}/></label>
        </div>
        <label className="grid gap-2 text-sm font-medium">Açıklama<Textarea rows={3} value={value('description')} onChange={e=>field('description',e.target.value)}/></label>
        <label className="grid gap-2 text-sm font-medium">SEO başlığı<Input value={value('seoTitle')} onChange={e=>field('seoTitle',e.target.value)}/></label>
        <label className="grid gap-2 text-sm font-medium">Meta açıklama<Textarea rows={3} value={value('seoDescription')} onChange={e=>field('seoDescription',e.target.value)}/></label>
      </DialogBody><DialogFooter><Button variant="outline" onClick={()=>setEdit(null)}>İptal</Button>
        <Button disabled={saving} onClick={()=>void store()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button>
      </DialogFooter>
    </DialogContent></Dialog>:null}
  </>;
}
