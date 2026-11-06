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
import {WebsiteBlogMediaDropzone} from './website-blog-media-dropzone';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {WebsiteBlogRichText} from './website-blog-rich-text';
import Link from 'next/link';

type Translation={title:string;excerpt:string;content:string;category:string;seoTitle:string;seoDescription:string;imageAlt:string;enabled?:boolean};
type TextField=Exclude<keyof Translation,'enabled'>;
type Post={id:string;slug:string;status:string;categoryId?:string|null;featuredImage:string;authorName?:string;publishedAt?:string|null;updatedAt?:string|null;sortOrder:number;tags?:string[];relatedPostIds?:string[];scheduledAt?:string|null;isFeatured?:boolean;ogImage?:string;canonicalUrl?:string;noIndex?:boolean;translations:Record<string,Translation>};
type BlogCategory={id:string;isActive:boolean;parentId:string|null;translations:Record<string,{title:string}>};
type Snapshot={version:number;posts:Post[];categories:BlogCategory[]};
const blank=():Translation=>({title:'',excerpt:'',content:'',category:'',seoTitle:'',seoDescription:'',imageAlt:'',enabled:true});
const newPost=():Post=>({id:'post-'+Date.now().toString(36),slug:'',status:'DRAFT',categoryId:null,featuredImage:'',authorName:'Ticarti',sortOrder:0,tags:[],relatedPostIds:[],scheduledAt:null,isFeatured:false,ogImage:'',canonicalUrl:'',noIndex:false,translations:{tr:blank()}});
const errorText=(e:any)=>e?.message||'İşlem başarısız.';

export default function WebsiteBlogEditor(){
  const {request,restoring}=useMasterSession();
  const [data,setData]=useState<Snapshot>({version:0,posts:[],categories:[]}),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[query,setQuery]=useState('');
  const [editId,setEditId]=useState<string|null>(null),[lang,setLang]=useState('tr'),[drag,setDrag]=useState<string|null>(null);
  const [locales,setLocales]=useState<Array<{locale:string;label:string}>>([{locale:'tr',label:'Türkçe'},{locale:'en',label:'English'},{locale:'pt',label:'Português'},{locale:'ru',label:'Русский'}]);
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const [result,langs]=await Promise.all([request('/superadmin/website/blog'),request('/superadmin/platform-locales')]);
      setData({...result,categories:Array.isArray(result.categories)?result.categories:[]});
      if(Array.isArray(langs)&&langs.length){const supported=['tr','en','pt','ru'];setLocales(supported.map(code=>({locale:code,label:langs.find((x:any)=>String(x.locale||'').split('-')[0].toLowerCase()===code)?.label||({tr:'Türkçe',en:'English',pt:'Português',ru:'Русский'} as Record<string,string>)[code]})))}
    }catch(e){setError(errorText(e))}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const editing=data.posts.find(p=>p.id===editId)||null;
  const update=(id:string,fn:(p:Post)=>Post)=>setData(x=>({...x,posts:x.posts.map(p=>p.id===id?fn(p):p)}));
  const field=(key:TextField,value:string)=>{if(!editing)return;update(editing.id,p=>({...p,translations:{...p.translations,[lang]:{...blank(),...(p.translations[lang]||{}),[key]:value}}}))};
  const value=(key:TextField)=>editing?.translations?.[lang]?.[key]||'';
  const reorder=(from:number,to:number)=>setData(x=>{if(to<0||to>=x.posts.length||from===to)return x;const posts=[...x.posts];const [p]=posts.splice(from,1);posts.splice(to,0,p);return {...x,posts}});
  const save=async():Promise<boolean>=>{
    if(data.posts.some(x=>!x.slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug))){setError('Her yazının SEO URL kodu küçük harf, sayı ve tireden oluşmalıdır.');return false}
    if(new Set(data.posts.map(x=>x.slug)).size!==data.posts.length){setError('Tekrarlanan blog URL kodu var.');return false}
    if(data.posts.some(p=>p.status==='PUBLISHED'&&!Object.values(p.translations).some(t=>t.enabled!==false&&t.title?.trim()&&t.content?.trim()))){setError('Yayımlanan her yazının en az bir dilde başlığı ve içeriği olmalıdır.');return false}
    setSaving(true);setError('');setMessage('');
    try{
      const result=await request('/superadmin/website/blog',{method:'PATCH',body:JSON.stringify(data)});
      setData({...result,categories:Array.isArray(result.categories)?result.categories:[]});setMessage('Kaydedildi. Yalnızca içeriği tamamlanmış ve etkinleştirilmiş dillerde yayımlanır.');
      if(editId&&!result.posts.some((x:Post)=>x.id===editId))setEditId(null);
      return true;
    }catch(e){setError(errorText(e));return false}
    finally{setSaving(false)}
  };
  const importFile=async(file:File)=>{
    try{
      const dataFile=JSON.parse(await file.text());
      if(!Array.isArray(dataFile.posts))throw new Error('Blog içerik dosyası geçersiz.');
      if(data.posts.length&&!window.confirm('Mevcut blog kayıtları arşiv içeriğiyle değiştirilsin mi?'))return;
      setData(old=>({...old,posts:dataFile.posts.map((x:any,i:number)=>({
        id:'legacy-'+String(x.slug),slug:String(x.slug),status:'PUBLISHED',authorName:'Ticarti',sortOrder:i,
        featuredImage:typeof x.cover==='string'?'../assets/images/blog/'+x.cover+'.svg':'',
        translations:{tr:{...blank(),title:String(x.title||''),excerpt:String(x.excerpt||''),category:String(x.category||''),content:Array.isArray(x.paragraphs)?x.paragraphs.join('\n\n'):''}}
      }))}));setMessage('Mevcut blog içeriği hazır. Yayınlamak için Blogu Kaydet butonuna basın.');
    }catch(e){setError(errorText(e))}
  };
  const shown=data.posts.filter(x=>[x.slug,...Object.values(x.translations||{}).map(v=>v.title)].join(' ').toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Blog İçerikleri</h1><ToolbarDescription>Ticarti.com blogunun çok dilli yazılarını, yayın durumunu ve SEO alanlarını yönetin.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button asChild variant="outline"><Link href="/website/blog/categories">Blog Kategorileri</Link></Button><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button><Button onClick={()=>{const p=newPost();setData(x=>({...x,posts:[...x.posts,p]}));setEditId(p.id);setLang('tr')}}><Plus className="size-4"/>Yeni Yazı</Button><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Blogu Kaydet</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><div className="font-medium">Blog</div><p className="text-sm text-muted-foreground">{data.posts.length} yazı · {data.posts.filter(p=>p.status==='PUBLISHED').length} yayında · her dil ayrı yayımlanır, çeviri zorunlu değildir.</p><p className="mt-1 text-xs text-muted-foreground">Bir dilde başlık ve içerik yoksa veya dil kapatıldıysa makale, blog listesi ve anasayfa modülünde görünmez.</p></div><Button asChild variant="outline" size="sm"><label className="cursor-pointer"><Upload className="size-4"/>Mevcut Blogu İçe Aktar<input type="file" accept=".json,application/json" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importFile(file)}}/></label></Button></CardContent></Card>
      {error?<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      {message?<p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{message}</p>:null}
      <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardHeading>Blog Yazıları</CardHeading><div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="w-72 ps-9" placeholder="Başlık veya URL ara" value={query} onChange={e=>setQuery(e.target.value)}/></div></div></CardHeader><CardContent className="grid gap-2 p-4">
        {loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin"/></div>:shown.map(p=><div key={p.id} draggable onDragStart={()=>setDrag(p.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=data.posts.findIndex(x=>x.id===drag),to=data.posts.findIndex(x=>x.id===p.id);if(from>=0&&to>=0)reorder(from,to);setDrag(null)}} onDragEnd={()=>setDrag(null)} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <GripVertical className="size-4 cursor-grab text-muted-foreground"/>
          {p.featuredImage?<img src={p.featuredImage} alt="" className="h-14 w-20 rounded border object-contain"/>:null}
          <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.translations.tr?.title||Object.values(p.translations).find(t=>t.title?.trim())?.title||p.slug||'Yeni Yazı'}</div><div className="mt-0.5 text-xs text-muted-foreground">{p.slug||'URL belirlenmedi'}</div></div>
          {locales.map(locale=>{const t=p.translations?.[locale.locale];const filled=!!t?.title?.trim()&&!!t?.content?.trim();if(!filled&&!t?.title?.trim())return null;const active=p.status==='PUBLISHED'&&t?.enabled!==false&&filled;return <Badge key={locale.locale} appearance="light" variant={active?'success':'secondary'}>{locale.locale.toUpperCase()} · {active?'Yayında':t?.enabled===false?'Kapalı':filled?'Taslak':'Eksik'}</Badge>})}
          <Badge appearance="light" variant={p.status==='PUBLISHED'?'success':'secondary'}>{p.status==='PUBLISHED'?'Genel yayın açık':'Taslak'}</Badge>
          <Button variant="outline" size="icon" disabled={data.posts.indexOf(p)===0} onClick={()=>reorder(data.posts.indexOf(p),data.posts.indexOf(p)-1)}><ArrowUp className="size-4"/></Button><Button variant="outline" size="icon" disabled={data.posts.indexOf(p)===data.posts.length-1} onClick={()=>reorder(data.posts.indexOf(p),data.posts.indexOf(p)+1)}><ArrowDown className="size-4"/></Button>
          <Button variant="outline" onClick={()=>{setEditId(p.id);setError('')}}>Düzenle</Button>
          <Button variant="outline" size="icon" onClick={()=>{if(window.confirm('Blog yazısı kaldırılsın mı?'))setData(x=>({...x,posts:x.posts.filter(row=>row.id!==p.id)}))}}><Trash2 className="size-4"/></Button>
        </div>)}{!loading&&!shown.length?<p className="py-12 text-center text-sm text-muted-foreground">Blog yazısı bulunamadı.</p>:null}
      </CardContent></Card>
    </Container>

    {editing?<Dialog open onOpenChange={v=>{if(!v)setEditId(null)}}><DialogContent className="sm:max-w-6xl">
      <DialogHeader><DialogTitle>{editing.translations?.[lang]?.title?.trim()||Object.values(editing.translations||{}).find(t=>t.title?.trim())?.title||'Yeni Blog Yazısı'}</DialogTitle></DialogHeader>
      <DialogBody className="max-h-[78vh] overflow-y-auto">
        {error?<p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
        <Tabs defaultValue="content" className="mt-4">
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
                  <label className="grid gap-2"><span className="text-sm font-medium">URL</span><Input value={editing.slug} onChange={e=>update(editing.id,p=>({...p,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')}))}/></label>
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
              <Input value={(editing.tags||[]).join(', ')} onChange={e=>update(editing.id,p=>({...p,tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}))}/>
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
              <Input type="datetime-local" value={editing.scheduledAt||''} onChange={e=>update(editing.id,p=>({...p,scheduledAt:e.target.value||null}))}/>
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
      </DialogBody>
      <DialogFooter><Button variant="outline" onClick={()=>setEditId(null)}>İptal</Button>
        <Button disabled={saving} onClick={async()=>{if(await save())setEditId(null)}}>{saving?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button>
      </DialogFooter>
    </DialogContent></Dialog>:null}
  </>;
}
