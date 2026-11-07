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
import {MediaField} from '@/app/(protected)/catalog/components/catalog-fields';
import {readWebsiteBlog,saveWebsiteBlog} from '../../components/website-blog-resource';
type Translation={name:string;bio:string;seoTitle:string;seoDescription:string};
type Author={id:string;slug:string;avatar:string;isActive:boolean;socials:Record<string,string>;translations:Record<string,Translation>};
type Snapshot={version:number;posts:any[];categories:any[];authors:Author[]};
const empty=():Translation=>({name:'',bio:'',seoTitle:'',seoDescription:''});
const slugify=(v:string)=>v.toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const socialLinks=['website','linkedin','instagram','x','facebook','youtube'] as const;
export default function BlogAuthors(){
  const {request,restoring,locales,localesLoading,localesError}=useMasterSession();
  const [data,setData]=useState<Snapshot>({version:0,posts:[],categories:[],authors:[]});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [edit,setEdit]=useState<Author|null>(null),[lang,setLang]=useState(''),[query,setQuery]=useState(''),[error,setError]=useState('');
  useEffect(()=>{if(locales.length)setLang(x=>locales.some(l=>l.locale===x)?x:(locales.find(l=>l.isDefault)?.locale||locales[0].locale))},[locales]);
  const load=useCallback(async()=>{
    if(restoring)return;setLoading(true);setError('');
    try{const snapshot=await readWebsiteBlog<any,any>(request);setData({...snapshot,authors:(snapshot as Snapshot).authors||[]})}
    catch(e:any){setError(e.message||'Yazarlar alınamadı.')}finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const title=(a:Author)=>a.translations[lang]?.name||Object.values(a.translations||{}).find(t=>t.name)?.name||a.slug;
  const rows=useMemo(()=>data.authors.filter(x=>(title(x)+' '+x.slug).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))),[data.authors,query,lang]);
  const primary=locales.find(l=>l.isDefault)?.locale||locales[0]?.locale||'tr';
  const isExisting=(author:Author)=>data.authors.some(a=>a.id===author.id);
  const field=(key:keyof Translation,value:string)=>setEdit(prev=>{
    if(!prev)return prev;
    const translations={...prev.translations,[lang]:{...empty(),...(prev.translations[lang]||{}),[key]:value}};
    // Generate the public author slug from the default-language name only for new authors.
    // Do not change an existing author's URL when translating or renaming their profile.
    const slug=key==='name'&&lang===primary&&!isExisting(prev)?slugify(value):prev.slug;
    return {...prev,slug,translations};
  });
  const save=async(authors:Author[])=>{
    setSaving(true);setError('');
    try{
      const result=await saveWebsiteBlog(request,{version:data.version,posts:data.posts,categories:data.categories,authors} as any);
      setData({...result,authors:(result as Snapshot).authors||[]});return true;
    }catch(e:any){setError(e.message||'Yazar kaydedilemedi.');return false}finally{setSaving(false)}
  };
  const commit=async()=>{
    if(!edit||!locales.length)return;
    const firstName=edit.translations?.[primary]?.name||Object.values(edit.translations||{}).find(t=>t.name?.trim())?.name||'';
    const slug=edit.slug||slugify(firstName);
    if(!slug||!Object.entries(edit.translations||{}).some(([code,t])=>locales.some(l=>l.locale===code)&&t.name?.trim())){
      setError('En az bir aktif dilde geçerli bir yazar adı gerekli.');return;
    }
    if(data.authors.some(a=>a.id!==edit.id&&a.slug===slug)){
      setError('Bu isim için kullanılan URL zaten mevcut. Lütfen farklı bir yazar adı seçin.');return;
    }
    const normalized={...edit,slug};
    const authors=data.authors.some(a=>a.id===edit.id)?data.authors.map(a=>a.id===edit.id?normalized:a):[...data.authors,normalized];
    if(await save(authors))setEdit(null);
  };
  const create=()=>{setError('');setEdit({id:'author-'+Date.now().toString(36),slug:'',avatar:'',isActive:true,socials:{},translations:{}})};
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Blog Yazarları</h1><ToolbarDescription>Gerçek yazar profilleri, çok dilli biyografi ve SEO bilgileri</ToolbarDescription></ToolbarHeading>
      <ToolbarActions><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="size-4"/>Yenile</Button>
        <Button onClick={create} disabled={localesLoading||!!localesError}><Plus className="size-4"/>Yeni Yazar</Button></ToolbarActions></Toolbar></Container>
    <Container className="pb-10">
      {error?<p role="alert" className="mb-4 text-sm text-destructive">{error}</p>:null}
      {localesError?<p role="alert" className="mb-4 text-sm text-destructive">{localesError}</p>:null}
      <Card><CardHeader><CardHeading>Yazarlar</CardHeading><Input placeholder="Yazar ara" value={query} onChange={e=>setQuery(e.target.value)}/></CardHeader>
        <CardContent className="grid gap-2 p-4">
          {loading?<LoaderCircle className="animate-spin"/>:rows.map(a=><div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
            {a.avatar?<img src={a.avatar} alt="" className="size-12 rounded-full object-cover"/>:null}
            <div className="min-w-0 flex-1"><b>{title(a)}</b><div className="text-xs text-muted-foreground">/{a.slug}</div></div>
            <Badge appearance="light" variant={a.isActive?'success':'secondary'}>{a.isActive?'Aktif':'Pasif'}</Badge>
            <Button variant="outline" onClick={()=>{setError('');setEdit(structuredClone(a))}}>Düzenle</Button>
            <Button size="icon" variant="outline" disabled={saving} onClick={async()=>{
              if(!window.confirm('Yazar silinsin mi? Bu yazara bağlı yazılar varsa API işlemi reddeder.'))return;
              await save(data.authors.filter(x=>x.id!==a.id));
            }}><Trash2 className="size-4"/></Button>
          </div>)}
          {!loading&&!rows.length?<p className="py-10 text-center text-sm text-muted-foreground">Yazar bulunamadı.</p>:null}
        </CardContent></Card>
    </Container>
    {edit?<Dialog open onOpenChange={v=>{if(!v)setEdit(null)}}><DialogContent className="sm:max-w-4xl">
      <DialogHeader><DialogTitle>{data.authors.some(x=>x.id===edit.id)?'Yazarı Düzenle':'Yeni Yazar'}</DialogTitle></DialogHeader>
      <DialogBody className="grid max-h-[75vh] gap-5 overflow-y-auto">
        {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {locales.map(x=><Button key={x.locale} type="button" size="sm" variant={lang===x.locale?'primary':'outline'} onClick={()=>setLang(x.locale)}>{x.label}</Button>)}
        </div>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">Yazar adı
            <Input autoFocus value={edit.translations[lang]?.name||''} placeholder="Yazarın adı ve soyadı" onChange={e=>field('name',e.target.value)}/>
          </label>
          <label className="grid gap-2 text-sm font-medium">Biyografi
            <Textarea rows={4} value={edit.translations[lang]?.bio||''} placeholder="Yazar hakkında kısa bilgi" onChange={e=>field('bio',e.target.value)}/>
          </label>
        </div>
        <div className="grid gap-4 border-t pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <MediaField label="Yazar fotoğrafı" value={edit.avatar||''} onChange={avatar=>setEdit(x=>x?{...x,avatar:String(avatar)}:x)}/>
          <label className="flex items-center gap-2 pt-2 text-sm font-medium">
            <Switch checked={edit.isActive} onCheckedChange={v=>setEdit(x=>x?{...x,isActive:v}:x)}/>Aktif yazar
          </label>
        </div>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer select-none font-semibold">SEO ayarları</summary>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">SEO başlığı
              <Input value={edit.translations[lang]?.seoTitle||''} onChange={e=>field('seoTitle',e.target.value)}/>
            </label>
            <label className="grid gap-2 text-sm font-medium">Meta açıklama
              <Textarea rows={3} value={edit.translations[lang]?.seoDescription||''} onChange={e=>field('seoDescription',e.target.value)}/>
            </label>
            <label className="grid gap-2 text-sm font-medium">Yazar URL'si
              <Input readOnly value={edit.slug||slugify(edit.translations?.[primary]?.name||'')} className="bg-muted" aria-label="Otomatik oluşturulan yazar URL'si"/>
              <span className="text-xs font-normal text-muted-foreground">Yeni yazarlarda ana dildeki isimden otomatik oluşturulur. Kayıtlı yazarların URL'si korunur.</span>
            </label>
          </div>
        </details>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer select-none font-semibold">Sosyal medya bağlantıları</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {socialLinks.map(provider=><label key={provider} className="grid gap-2 text-sm font-medium">
              {({website:'Web sitesi',linkedin:'LinkedIn',instagram:'Instagram',x:'X',facebook:'Facebook',youtube:'YouTube'} as Record<string,string>)[provider]}
              <Input type="url" placeholder="https://" value={edit.socials?.[provider]||''}
                onChange={e=>setEdit(x=>x?{...x,socials:{...x.socials,[provider]:e.target.value}}:x)}/>
            </label>)}
          </div>
        </details>
      </DialogBody><DialogFooter><Button variant="outline" onClick={()=>setEdit(null)}>İptal</Button>
        <Button disabled={saving} onClick={()=>void commit()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button>
      </DialogFooter>
    </DialogContent></Dialog>:null}
  </>;
}
