'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
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
import {readWebsiteBlog,saveWebsiteBlog} from './website-blog-resource';

type Translation={title:string;slug?:string;excerpt:string;content:string;category:string;seoTitle:string;seoDescription:string;imageAlt:string;enabled?:boolean};
type TextField=Exclude<keyof Translation,'enabled'>;
type Post={id:string;slug:string;status:string;authorId?:string|null;categoryId?:string|null;featuredImage:string;authorName?:string;publishedAt?:string|null;updatedAt?:string|null;sortOrder:number;tags?:string[];relatedPostIds?:string[];scheduledAt?:string|null;isFeatured?:boolean;ogImage?:string;canonicalUrl?:string;noIndex?:boolean;translations:Record<string,Translation>};
type BlogCategory={id:string;isActive:boolean;parentId:string|null;translations:Record<string,{title:string}>};
type BlogAuthor={id:string;slug:string;isActive:boolean;translations:Record<string,{name:string}>};
type Snapshot={version:number;posts:Post[];categories:BlogCategory[];authors:BlogAuthor[]};
const blank=():Translation=>({title:'',slug:'',excerpt:'',content:'',category:'',seoTitle:'',seoDescription:'',imageAlt:'',enabled:true});
const newPost=():Post=>({id:'post-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),slug:'',status:'DRAFT',authorId:null,categoryId:null,featuredImage:'',authorName:'',sortOrder:0,tags:[],relatedPostIds:[],scheduledAt:null,isFeatured:false,ogImage:'',canonicalUrl:'',noIndex:false,translations:{}});
const err=(e:any)=>e?.message||'İşlem gerçekleştirilemedi.';

export default function WebsiteBlogPostForm({postId}:{postId?:string}){
  const router=useRouter();
  const {request,restoring,locales,localesLoading,localesError,reloadLocales}=useMasterSession();
  const [data,setData]=useState<Snapshot>({version:0,posts:[],categories:[],authors:[]});
  const [editing,setEditing]=useState<Post|null>(null);
  const [lang,setLang]=useState('');
  const [tab,setTab]=useState('content');
  const [tagDraft,setTagDraft]=useState('');
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [draftRestored,setDraftRestored]=useState(false);
  const [saveState,setSaveState]=useState<'saved'|'dirty'|'saving'>('saved');
  const baseline=useRef('');
  const draftReady=useRef(false);
  const draftKey='ticarti:website-blog:draft:'+(postId||'new');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const snapshot=await readWebsiteBlog<Post,BlogCategory>(request) as Snapshot;
      const normalized={...snapshot,posts:Array.isArray(snapshot.posts)?snapshot.posts:[],categories:Array.isArray(snapshot.categories)?snapshot.categories:[],authors:Array.isArray((snapshot as Snapshot).authors)?(snapshot as Snapshot).authors:[]};
      const post=postId?normalized.posts.find((x:Post)=>x.id===postId):newPost();
      if(!post)throw new Error('Blog yazısı bulunamadı.');
      setData(normalized);
      draftReady.current=false;
      const clean=structuredClone(post);
      baseline.current=JSON.stringify(clean);
      let next=clean;
      let restored=false;
      try{
        const raw=window.sessionStorage.getItem(draftKey);
        if(raw){
          const saved=JSON.parse(raw);
          const same=JSON.stringify(saved?.post)===baseline.current;
          const compatible=!!saved?.post?.translations &&
            (!postId||saved.post.id===clean.id)&&
            (saved?.serverUpdatedAt||null)===(clean.updatedAt||null);
          if(same||!compatible)window.sessionStorage.removeItem(draftKey);
          else if(typeof saved.savedAt==='number'&&saved.savedAt>Date.now()-7*24*60*60*1000){
            next=saved.post;
            restored=true;
          }
        }
      }catch{}
      setEditing(next);setTagDraft((next.tags||[]).join(', '));
      setDraftRestored(restored);
      setSaveState(restored?'dirty':'saved');
      draftReady.current=true;
    }catch(e){setError(err(e))}
    finally{setLoading(false)}
  },[postId,request,restoring,draftKey]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(!locales.length)return;
    setLang(old=>locales.some(x=>x.locale===old)?old:(locales.find(x=>x.isDefault)?.locale||locales[0].locale));
  },[locales]);
  useEffect(()=>{
    if(!editing||!draftReady.current||saving)return;
    const dirty=JSON.stringify(editing)!==baseline.current;
    setSaveState(dirty?'dirty':'saved');
    try{
      if(dirty)window.sessionStorage.setItem(draftKey,JSON.stringify({
        post:editing,savedAt:Date.now(),serverUpdatedAt:data.posts.find(x=>x.id===editing.id)?.updatedAt||null
      }));
      else window.sessionStorage.removeItem(draftKey);
    }catch{}
  },[draftKey,editing,saving,data.posts]);
  const update=(id:string,fn:(p:Post)=>Post)=>setEditing(p=>p&&p.id===id?fn(p):p);
  const slugify=(v:string)=>v.toLocaleLowerCase('tr').normalize('NFKD').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const field=(key:TextField,next:string)=>{
    if(!editing)return;
    update(editing.id,p=>{
      const before=p.translations[lang]||blank(),translations={...p.translations,[lang]:{...blank(),...before,[key]:next}};
      if(key!=='title')return {...p,translations};
      const previousAuto=slugify(before.title||''),nextAuto=slugify(next);
      const existingSlug=before.slug||p.slug;
      if(!before.slug||existingSlug===previousAuto){
        translations[lang].slug=nextAuto;
        const defaultLang=locales.find(l=>l.isDefault)?.locale||locales[0]?.locale;
        return {...p,slug:lang===defaultLang||!p.slug?nextAuto:p.slug,translations};
      }
      return {...p,translations};
    });
  };
  const value=(key:TextField)=>editing?.translations?.[lang]?.[key]||'';
  const changeSlug=(raw:string)=>{
    if(!editing)return;
    const slug=slugify(raw);
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
    setSaving(true);setSaveState('saving');setError('');
    try{
      // Refuse stale writes: PATCH checks the version of the entire CMS snapshot.
      const current=await readWebsiteBlog<Post,BlogCategory>(request) as Snapshot;
      const savedPost=postId?current.posts.find(x=>x.id===editing.id):null;
      if(postId&&JSON.stringify(savedPost)!==baseline.current){
        throw new Error('Bu yazı başka bir oturumda değiştirildi. Yazdıkların yerel taslakta korundu; sayfayı yenileyip değişiklikleri kontrol edin.');
      }
      const posts=postId?current.posts.map(x=>x.id===editing.id?editing:x):[...current.posts,editing];
      await saveWebsiteBlog<Post,BlogCategory>(request,{version:current.version,posts,categories:current.categories,authors:current.authors} as Snapshot);
      draftReady.current=false;
      try{window.sessionStorage.removeItem(draftKey)}catch{}
      setSaveState('saved');
      router.push('/website/blog');router.refresh();
      return true;
    }catch(e){setSaveState('dirty');setError(err(e));return false}
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
      {ready&&editing?<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>Yayın durumu: <strong>{editing.status==='PUBLISHED'?(editing.scheduledAt&&Date.parse(editing.scheduledAt)>Date.now()?'Zamanlanmış':'Yayında'):editing.status==='ARCHIVED'?'Arşiv':'Taslak'}</strong></span>
        <span>·</span>
        <span>{saveState==='saving'?'Kaydediliyor…':saveState==='dirty'?'Kaydedilmemiş değişiklikler':'Tüm değişiklikler kaydedildi'}</span>
      </div>:null}
      {draftRestored?<p className="text-sm text-foreground">Önceki oturumdan kaydedilmemiş değişiklikler geri yüklendi. Sunucu kaydının üzerine yazmadan önce kontrol edin.</p>:null}
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
                  <label className="grid gap-2"><span className="text-sm font-medium">Slug</span><Input value={value('slug')||editing.slug} onChange={e=>changeSlug(e.target.value)}/></label>
                </div>
                
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
                    const title=c.translations?.[lang]?.title||c.translations?.[locales.find(x=>x.isDefault)?.locale||'']?.title||Object.values(c.translations||{}).find(t=>t.title)?.title||'';
                    return title?<option key={c.id} value={c.id}>{title}</option>:null;
                  })}
                </select>
              </label>
              <label className="grid gap-2"><span className="text-sm font-medium">Yazar</span>
                <select className="h-10 rounded-md border bg-background px-3" value={editing.authorId||''} onChange={e=>update(editing.id,p=>({...p,authorId:e.target.value||null}))}>
                  <option value="">Yazar seçilmedi</option>
                  {data.authors.filter(a=>a.isActive||a.id===editing.authorId).map(a=><option key={a.id} value={a.id}>{a.translations?.[lang]?.name||Object.values(a.translations||{}).find(t=>t.name)?.name||a.slug}</option>)}
                </select>
                <a className="text-xs text-primary underline" href="/website/blog/authors" target="_blank" rel="noopener noreferrer">Yazarları yönet</a>
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
                  {p.translations?.[lang]?.title||Object.values(p.translations||{}).find(t=>t.title)?.title||p.slug}
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
