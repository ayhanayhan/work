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
import {WebsiteBlogMediaDropzone} from '../../components/website-blog-media-dropzone';
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
  const field=(key:keyof Translation,value:string)=>setEdit(prev=>prev?{...prev,
    translations:{...prev.translations,[lang]:{...empty(),...(prev.translations[lang]||{}),[key]:value}}}:prev);
  const save=async(authors:Author[])=>{
    setSaving(true);setError('');
    try{
      const result=await saveWebsiteBlog(request,{version:data.version,posts:data.posts,categories:data.categories,authors} as any);
      setData({...result,authors:(result as Snapshot).authors||[]});return true;
    }catch(e:any){setError(e.message||'Yazar kaydedilemedi.');return false}finally{setSaving(false)}
  };
  const commit=async()=>{
    if(!edit||!locales.length)return;
    if(!edit.slug||!Object.entries(edit.translations||{}).some(([code,t])=>locales.some(l=>l.locale===code)&&t.name?.trim())){
      setError('Geçerli bir slug ve en az bir aktif dilde yazar adı gerekli.');return;
    }
    const authors=data.authors.some(a=>a.id===edit.id)?data.authors.map(a=>a.id===edit.id?edit:a):[...data.authors,edit];
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
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Slug
            <Input value={edit.slug} onChange={e=>setEdit(x=>x?{...x,slug:slugify(e.target.value)}:x)}/>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={edit.isActive} onCheckedChange={v=>setEdit(x=>x?{...x,isActive:v}:x)}/>Aktif yazar</label>
        </div>
        <WebsiteBlogMediaDropzone label="Yazar avatarı" value={edit.avatar||''} onChange={avatar=>setEdit(x=>x?{...x,avatar}:x)}/>
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {locales.map(x=><Button key={x.locale} size="sm" variant={lang===x.locale?'primary':'outline'} onClick={()=>setLang(x.locale)}>{x.label}</Button>)}
        </div>
        <label className="grid gap-2 text-sm font-medium">Yazar adı
          <Input value={edit.translations[lang]?.name||''} onChange={e=>{
            const name=e.target.value;
            setEdit(x=>x?{...x,slug:x.slug?x.slug:slugify(name),translations:{...x.translations,[lang]:{...empty(),...x.translations[lang],name}}}:x);
          }}/>
        </label>
        <label className="grid gap-2 text-sm font-medium">Biyografi
          <Textarea rows={5} value={edit.translations[lang]?.bio||''} onChange={e=>field('bio',e.target.value)}/>
        </label>
        <label className="grid gap-2 text-sm font-medium">SEO başlığı
          <Input value={edit.translations[lang]?.seoTitle||''} onChange={e=>field('seoTitle',e.target.value)}/>
        </label>
        <label className="grid gap-2 text-sm font-medium">SEO açıklaması
          <Textarea rows={3} value={edit.translations[lang]?.seoDescription||''} onChange={e=>field('seoDescription',e.target.value)}/>
        </label>
        <div className="grid gap-3"><b>Sosyal medya hesapları</b>
          {socialLinks.map(provider=><label key={provider} className="grid gap-2 text-sm font-medium">{provider}
            <Input type="url" placeholder="https://" value={edit.socials?.[provider]||''}
              onChange={e=>setEdit(x=>x?{...x,socials:{...x.socials,[provider]:e.target.value}}:x)}/>
          </label>)}
        </div>
      </DialogBody><DialogFooter><Button variant="outline" onClick={()=>setEdit(null)}>İptal</Button>
        <Button disabled={saving} onClick={()=>void commit()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button>
      </DialogFooter>
    </DialogContent></Dialog>:null}
  </>;
}
