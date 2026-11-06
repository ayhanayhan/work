'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {LoaderCircle,Save,ArrowLeft} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarHeading,ToolbarActions,ToolbarDescription} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Card,CardContent} from '@/components/ui/card';
import {WebsiteBlogMediaDropzone} from './website-blog-media-dropzone';
import {WebsiteBlogRichText} from './website-blog-rich-text';

type Translation={title:string;slug?:string;excerpt:string;content:string;category:string;seoTitle:string;seoDescription:string;imageAlt:string;enabled?:boolean};
type TextField=Exclude<keyof Translation,'enabled'>;
type Post={id:string;slug:string;status:string;categoryId?:string|null;featuredImage:string;authorName?:string;publishedAt?:string|null;updatedAt?:string|null;sortOrder:number;tags?:string[];relatedPostIds?:string[];scheduledAt?:string|null;isFeatured?:boolean;ogImage?:string;canonicalUrl?:string;noIndex?:boolean;translations:Record<string,Translation>};
type BlogCategory={id:string;isActive:boolean;parentId:string|null;translations:Record<string,{title:string}>};
type Snapshot={version:number;posts:Post[];categories:BlogCategory[]};
const blank=():Translation=>({title:'',slug:'',excerpt:'',content:'',category:'',seoTitle:'',seoDescription:'',imageAlt:'',enabled:true});
const newPost=():Post=>({id:'post-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),slug:'',status:'DRAFT',categoryId:null,featuredImage:'',authorName:'',sortOrder:0,tags:[],relatedPostIds:[],scheduledAt:null,isFeatured:false,ogImage:'',canonicalUrl:'',noIndex:false,translations:{}});
const err=(e:any)=>e?.message||'İşlem gerçekleştirilemedi.';

export default function WebsiteBlogPostForm({postId}:{postId?:string}){
  const router=useRouter();
  const {request,restoring,locales,localesLoading,localesError,reloadLocales}=useMasterSession();
  const [data,setData]=useState<Snapshot>({version:0,posts:[],categories:[]});
  const [editing,setEditing]=useState<Post|null>(null);
  const [lang,setLang]=useState('');
  const [tab,setTab]=useState('content');
  const [tagDraft,setTagDraft]=useState('');
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const snapshot=await request('/superadmin/website/blog') as Snapshot;
      const normalized={...snapshot,posts:Array.isArray(snapshot.posts)?snapshot.posts:[],categories:Array.isArray(snapshot.categories)?snapshot.categories:[]};
      const post=postId?normalized.posts.find((x:Post)=>x.id===postId):newPost();
      if(!post)throw new Error('Blog yazısı bulunamadı.');
      setData(normalized);setEditing(structuredClone(post));setTagDraft((post.tags||[]).join(', '));
    }catch(e){setError(err(e))}
    finally{setLoading(false)}
  },[postId,request,restoring]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(!locales.length)return;
    setLang(old=>locales.some(x=>x.locale===old)?old:(locales.find(x=>x.isDefault)?.locale||locales[0].locale));
  },[locales]);
  const update=(id:string,fn:(p:Post)=>Post)=>setEditing(p=>p&&p.id===id?fn(p):p);
  const field=(key:TextField,next:string)=>{if(!editing)return;update(editing.id,p=>({...p,translations:{...p.translations,[lang]:{...blank(),...(p.translations[lang]||{}),[key]:next}}}))};
  const value=(key:TextField)=>editing?.translations?.[lang]?.[key]||'';
  const changeSlug=(raw:string)=>{
    if(!editing)return;
    const slug=raw.toLocaleLowerCase('tr').trim().normalize('NFKD')
      .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    update(editing.id,p=>({...p,slug:lang===(locales.find(x=>x.isDefault)?.locale||locales[0]?.locale)||!p.slug?slug:p.slug,
      translations:{...p.translations,[lang]:{...blank(),...(p.translations[lang]||{}),slug}}}));
  };
  const save=async():Promise<boolean>=>{
    if(!editing||!locales.length||localesLoading||localesError)return false;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(editing.slug)){
      setTab('content');setError('Geçerli bir URL girin.');return false;
    }
    if(!Object.values(editing.translations).some(t=>t.title?.trim())){
      setTab('content');setError('En az bir aktif dilde başlık girin.');return false;
    }
    if(editing.status==='PUBLISHED'&&!Object.entries(editing.translations).some(([code,t])=>locales.some(l=>l.locale===code)&&t.enabled!==false&&t.title?.trim()&&t.content?.trim())){
      setTab('publish');setError('Yayımlamak için aktif dillerden en az birinde başlık ve içerik zorunludur.');return false;
    }
    setSaving(true);setError('');
    try{
      // Refuse stale writes: PATCH checks the version of the entire CMS snapshot.
      const posts=postId?data.posts.map(x=>x.id===editing.id?editing:x):[...data.posts,editing];
      await request('/superadmin/website/blog',{method:'PATCH',body:JSON.stringify({version:data.version,posts,categories:data.categories})});
      router.push('/website/blog');router.refresh();
      return true;
    }catch(e){setError(err(e));return false}
    finally{setSaving(false)}
  };
  const ready=!loading&&!restoring&&!localesLoading&&!!editing&&!!lang&&!localesError;
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">{postId?'Blog Yazısını Düzenle':'Yeni Blog Yazısı'}</h1>
      <ToolbarDescription>Ticarti.com blog içeriği · gerçek kayıt ve aktif site dilleri</ToolbarDescription>
    </ToolbarHeading><ToolbarActions>
      <Button asChild variant="outline"><Link href="/website/blog"><ArrowLeft className="size-4"/>Blog Yazıları</Link></Button>
      <Button disabled={!ready||saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button>
    </ToolbarActions></Toolbar></Container>
    <Container className="grid gap-4 pb-12">
      {error?<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      {localesError?<p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{localesError} <Button variant="outline" size="sm" onClick={()=>void reloadLocales()}>Yeniden dene</Button></p>:null}
      {loading||localesLoading||restoring?<div className="grid min-h-64 place-items-center"><LoaderCircle className="size-6 animate-spin"/></div>:null}
      {ready&&editing?<Card><CardContent className="p-5 md:p-7">
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="content">İçerik</TabsTrigger>
            <TabsTrigger value="publish">Yayın</TabsTrigger>
            <TabsTrigger value="relations">İlişkiler</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="grid gap-5 mt-5">
            <Tabs value={lang} onValueChange={setLang}>
              <TabsList>{locales.map(x=><TabsTrigger key={x.locale} value={x.locale}>{x.label}</TabsTrigger>)}</TabsList>
              <TabsContent value={lang} className="grid gap-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="grid gap-2"><span className="text-sm font-medium">Başlık</span><Input value={value('title')} onChange={e=>field('title',e.target.value)}/></label>
                  <label className="grid gap-2"><span className="text-sm font-medium">URL</span><Input value={value('slug')||editing.slug} onChange={e=>changeSlug(e.target.value)}/></label>
                </div>
                <label className="grid gap-2"><span className="text-sm font-medium">Özet</span><Textarea rows={3} value={value('excerpt')} onChange={e=>field('excerpt',e.target.value)}/></label>
                <div className="grid gap-2"><span className="text-sm font-medium">İçerik</span>
                  <WebsiteBlogRichText editorKey={editing.id+'-'+lang} value={value('content')} onChange={v=>field('content',v)}/>
                </div>
              </TabsContent>
            </Tabs>
            <WebsiteBlogMediaDropzone label="Kapak görseli" value={editing.featuredImage||''} onChange={featuredImage=>update(editing.id,p=>({...p,featuredImage}))}/>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="grid gap-2"><span className="text-sm font-medium">Kategori</span>
                <select className="h-10 rounded-md border bg-background px-3" value={editing.categoryId||''} onChange={e=>update(editing.id,p=>({...p,categoryId:e.target.value||null}))}>
                  <option value="">Kategori yok</option>
                  {data.categories.filter(c=>c.isActive||c.id===editing.categoryId).map(c=>{
                    const title=c.translations?.[lang]?.title||c.translations?.tr?.title||Object.values(c.translations||{}).find(t=>t.title)?.title||'';
                    return title?<option key={c.id} value={c.id}>{title}</option>:null;
                  })}
                </select>
              </label>
              <label className="grid gap-2"><span className="text-sm font-medium">Yazar</span>
                <select className="h-10 rounded-md border bg-background px-3" value={editing.authorName||'Ticarti'} onChange={e=>update(editing.id,p=>({...p,authorName:e.target.value}))}>
                  {Array.from(new Set(['Ticarti',...data.posts.map(x=>x.authorName||'Ticarti')])).map(author=><option key={author} value={author}>{author}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-2"><span className="text-sm font-medium">Etiketler</span>
              <Input value={tagDraft} onChange={e=>{setTagDraft(e.target.value);update(editing.id,p=>({...p,tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}))}}/>
              <span className="text-xs text-muted-foreground">Virgülle ayırın</span>
            </label>
          </TabsContent>
          <TabsContent value="publish" className="grid gap-4 mt-5">
            <label className="grid gap-2"><span className="text-sm font-medium">Durum</span>
              <select className="h-10 rounded-md border bg-background px-3" value={editing.status||'DRAFT'} onChange={e=>update(editing.id,p=>({...p,status:e.target.value}))}>
                <option value="DRAFT">Taslak</option><option value="PUBLISHED">Yayınla</option><option value="ARCHIVED">Arşiv</option>
              </select>
            </label>
            <label className="grid gap-2"><span className="text-sm font-medium">Zamanlı yayın</span>
              <Input type="datetime-local" value={editing.scheduledAt?new Date(editing.scheduledAt).toLocaleString('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(' ','T'):''} onChange={e=>update(editing.id,p=>({...p,scheduledAt:e.target.value?new Date(e.target.value).toISOString():null}))}/>
            </label>
            <label className="flex items-center justify-between rounded-lg border p-4">
              <span><b>Öne çıkan yazı</b><small className="block text-muted-foreground">Blog listelerinde öncelikli gösterilir.</small></span>
              <Switch checked={!!editing.isFeatured} onCheckedChange={v=>update(editing.id,p=>({...p,isFeatured:v}))}/>
            </label>
            <label className="flex items-center justify-between rounded-lg border p-4">
              <span><b>{locales.find(x=>x.locale===lang)?.label||lang} dilinde yayımla</b>
                <small className="block text-muted-foreground">Yalnızca başlığı ve içeriği tamamlanan diller görünür.</small></span>
              <Switch checked={editing.translations[lang]?.enabled!==false} onCheckedChange={v=>update(editing.id,p=>({...p,translations:{...p.translations,[lang]:{...blank(),...p.translations[lang],enabled:v}}}))}/>
            </label>
          </TabsContent>
          <TabsContent value="relations" className="grid gap-5 mt-5">
            <div><div className="font-medium mb-2">İlgili yazılar</div>
              <div className="grid md:grid-cols-2 gap-2 max-h-56 overflow-auto rounded-lg border p-3">
                {data.posts.filter(p=>p.id!==editing.id).map(p=><label key={p.id} className="flex gap-2 text-sm">
                  <input type="checkbox" checked={(editing.relatedPostIds||[]).includes(p.id)}
                    onChange={e=>update(editing.id,x=>({...x,relatedPostIds:e.target.checked?[...(x.relatedPostIds||[]),p.id]:(x.relatedPostIds||[]).filter(y=>y!==p.id)}))}/>
                  {p.translations?.tr?.title||Object.values(p.translations||{}).find(t=>t.title)?.title||p.slug}
                </label>)}
                {data.posts.length<=1?<p className="text-sm text-muted-foreground">İlişkilendirilecek başka yazı bulunmuyor.</p>:null}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="seo" className="grid gap-5 mt-5">
            <Tabs value={lang} onValueChange={setLang}>
              <TabsList>{locales.map(x=><TabsTrigger key={x.locale} value={x.locale}>{x.label}</TabsTrigger>)}</TabsList>
              <TabsContent value={lang} className="grid gap-4 mt-4">
                <label className="grid gap-2"><span className="text-sm font-medium">SEO başlığı</span><Input value={value('seoTitle')} onChange={e=>field('seoTitle',e.target.value)}/></label>
                <label className="grid gap-2"><span className="text-sm font-medium">Meta açıklama</span><Textarea rows={3} value={value('seoDescription')} onChange={e=>field('seoDescription',e.target.value)}/></label>
                <label className="grid gap-2"><span className="text-sm font-medium">Kapak görseli alternatif metni</span><Input value={value('imageAlt')} onChange={e=>field('imageAlt',e.target.value)}/></label>
              </TabsContent>
            </Tabs>
            <label className="grid gap-2"><span className="text-sm font-medium">Canonical URL</span>
              <Input value={editing.canonicalUrl||''} onChange={e=>update(editing.id,p=>({...p,canonicalUrl:e.target.value}))}/>
            </label>
            <WebsiteBlogMediaDropzone label="Open Graph görseli" value={editing.ogImage||''} onChange={ogImage=>update(editing.id,p=>({...p,ogImage}))}/>
            <label className="flex items-center justify-between rounded-lg border p-4">
              <span>Arama motorlarında indeksleme</span>
              <Switch checked={!editing.noIndex} onCheckedChange={v=>update(editing.id,p=>({...p,noIndex:!v}))}/>
            </label>
          </TabsContent>
        </Tabs>
        <div className="mt-8 flex items-center justify-end gap-3 border-t pt-5">
          <Button asChild variant="outline"><Link href="/website/blog">İptal</Link></Button>
          <Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button>
        </div>
      </CardContent></Card>:null}
    </Container>
  </>;
}
