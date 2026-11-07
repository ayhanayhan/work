'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Card,CardContent} from '@/components/ui/card';
import {LoaderCircle,Plus,Save,Trash2} from 'lucide-react';
import {MediaField} from '@/app/(protected)/catalog/components/catalog-fields';

const pageChoices=[
 ['home','Ana Sayfa','/'],['blog','Blog Liste','/blog'],['pricing','Paketler','/paketler.html'],
 ['contact','İletişim','/contacto.html'],['enterprise','Kurumsal','/companies/enterprise.html'],
 ['privacy','Gizlilik','/gizlilik-politikasi.html'],['terms','Üyelik Sözleşmesi','/uyelik-sozlesmesi.html'],['kvkk','KVKK','/kvkk.html']
] as const;
type Locale={locale:string;label:string;isDefault:boolean};
type SeoValues={title:string;description:string;ogTitle:string;ogDescription:string;ogImage:string;twitterTitle:string;twitterDescription:string;canonicalPath:string;noindex:boolean};
type SeoData={version:number;siteName:string;defaultOgImage:string;organizationLogo:string;robotsText:string;allowIndexing:boolean;pages:Record<string,Record<string,Partial<SeoValues>>>;redirects:{from:string;to:string;permanent:boolean}[]};
const empty:SeoValues={title:'',description:'',ogTitle:'',ogDescription:'',ogImage:'',twitterTitle:'',twitterDescription:'',canonicalPath:'',noindex:false};
const base:SeoData={version:0,siteName:'Ticarti',defaultOgImage:'',organizationLogo:'/assets/images/ticarti-logo.svg',robotsText:'',allowIndexing:true,pages:{},redirects:[]};
export default function WebsiteSeoEditor(){
 const {request,locales,restoring}=useMasterSession();
 const [data,setData]=useState<SeoData>(base),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[changed,setChanged]=useState(false);
 const [error,setError]=useState(''),[success,setSuccess]=useState('');
 const [locale,setLocale]=useState('tr'),[page,setPage]=useState('home');
 useEffect(()=>{if(locales.length)setLocale(old=>locales.some(x=>x.locale===old)?old:(locales.find(x=>x.isDefault)?.locale||locales[0].locale));},[locales]);
 const load=useCallback(async()=>{
  if(restoring)return;
  setLoading(true);setError('');
  try{const result=await request('/superadmin/website/seo');setData({...base,...result,pages:result.pages||{},redirects:result.redirects||[]});setChanged(false)}
  catch(e:any){setError(e.message||'SEO ayarları alınamadı.')}finally{setLoading(false)}
 },[request,restoring]);
 useEffect(()=>{void load()},[load]);
 const set=(patch:Partial<SeoData>)=>{setData(x=>({...x,...patch}));setChanged(true);setSuccess('');};
 const values={...empty,...(data.pages[page]?.[locale]||{})};
 const setValue=(key:keyof SeoValues,value:string|boolean)=>{
  setData(x=>({...x,pages:{...x.pages,[page]:{...(x.pages[page]||{}),[locale]:{...empty,...x.pages[page]?.[locale],[key]:value}}}}));
  setChanged(true);setSuccess('');
 };
 const save=async()=>{
  setSaving(true);setError('');setSuccess('');
  try{const result=await request('/superadmin/website/seo',{method:'PATCH',body:JSON.stringify(data)});
    setData({...base,...result});setChanged(false);setSuccess('SEO ayarları kaydedildi ve ticarti.com için kullanılabilir.');
  }catch(e:any){setError(e.message||'SEO ayarları kaydedilemedi.')}finally{setSaving(false)}
 };
 const pagePath=pageChoices.find(x=>x[0]===page)?.[2]||'/';
 const examplePath=values.canonicalPath||(locale==='tr'?pagePath:'/'+locale+pagePath);
 const title=values.title||((pageChoices.find(x=>x[0]===page)?.[1]||'Ticarti')+' | Ticarti');
 const description=values.description||'Bu sayfa için henüz özel SEO açıklaması tanımlanmadı.';
 const activeLocales:Locale[]=locales.length?locales:[{locale:'tr',label:'Türkçe',isDefault:true}];
 return <>
  <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Site SEO Yönetimi</h1>
    <ToolbarDescription>ticarti.com için çok dilli SEO, indeksleme, sosyal paylaşım ve sayfa ayarları.</ToolbarDescription></ToolbarHeading>
    <ToolbarActions><Button disabled={!changed||saving||loading} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button></ToolbarActions>
  </Toolbar></Container>
  <Container className="grid gap-5 pb-10">
   {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
   {success?<p role="status" className="text-sm text-green-700">{success}</p>:null}
   {loading?<div className="py-14 text-center"><LoaderCircle className="inline-block size-6 animate-spin"/></div>:<>
    <Card><CardContent className="grid gap-5 p-5">
      <h2 className="font-semibold">Genel SEO ayarları</h2>
      <div className="grid gap-4 md:grid-cols-2">
       <label className="grid gap-2 text-sm font-medium">Site adı<Input maxLength={100} value={data.siteName} onChange={e=>set({siteName:e.target.value})}/></label>
       <label className="flex items-center gap-3 text-sm"><Switch checked={data.allowIndexing} onCheckedChange={v=>set({allowIndexing:v})}/>Arama motorlarının siteyi indekslemesine izin ver</label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
       <MediaField label="Varsayılan sosyal paylaşım görseli" value={data.defaultOgImage} onChange={v=>set({defaultOgImage:String(v)})}/>
       <MediaField label="Kurumsal logo (Schema)" value={data.organizationLogo} onChange={v=>set({organizationLogo:String(v)})}/>
      </div>
      <label className="grid gap-2 text-sm font-medium">robots.txt özel kuralları
       <Textarea rows={4} value={data.robotsText} onChange={e=>set({robotsText:e.target.value})} placeholder="Boş bırakılırsa güvenli varsayılan kurallar kullanılır."/>
       <span className="text-xs font-normal text-muted-foreground">Sitemap adresi sistem tarafından otomatik eklenir. Tam robots.txt içeriği yerine özel kurallar ekleyebilirsiniz.</span>
      </label>
    </CardContent></Card>
    <Card><CardContent className="grid gap-5 p-5">
      <h2 className="font-semibold">Sayfaya özel SEO</h2>
      <div className="flex flex-wrap gap-2">
       {pageChoices.map(([id,label])=><Button key={id} size="sm" type="button" variant={page===id?'primary':'outline'} onClick={()=>setPage(id)}>{label}</Button>)}
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-4">
       {activeLocales.map(l=><Button key={l.locale} size="sm" type="button" variant={locale===l.locale?'primary':'outline'} onClick={()=>setLocale(l.locale)}>{l.label}</Button>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
       <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">SEO başlığı<Input maxLength={220} value={values.title} onChange={e=>setValue('title',e.target.value)} placeholder="Sayfa başlığı"/></label>
        <label className="grid gap-2 text-sm font-medium">Meta açıklaması<Textarea rows={3} maxLength={500} value={values.description} onChange={e=>setValue('description',e.target.value)}/></label>
        <label className="grid gap-2 text-sm font-medium">Canonical yol<Input value={values.canonicalPath} onChange={e=>setValue('canonicalPath',e.target.value)} placeholder={pagePath}/>
         <span className="text-xs font-normal text-muted-foreground">Normalde boş bırakın. Yalnızca aynı sitede alternatif canonical gerektiğinde doldurun.</span>
        </label>
        <label className="flex items-center gap-3 text-sm"><Switch checked={values.noindex} onCheckedChange={v=>setValue('noindex',v)}/>Bu sayfayı noindex yap</label>
       </div>
       <div className="grid gap-4">
        <div className="rounded-lg border p-4">
         <p className="mb-2 text-xs text-muted-foreground">Arama sonuçları önizlemesi</p>
         <p className="break-all text-sm text-green-700">ticarti.com{examplePath}</p>
         <p className="mt-1 text-lg text-blue-700">{title}</p>
         <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <label className="grid gap-2 text-sm font-medium">Open Graph başlığı<Input value={values.ogTitle} onChange={e=>setValue('ogTitle',e.target.value)}/></label>
        <label className="grid gap-2 text-sm font-medium">Open Graph açıklaması<Textarea rows={2} value={values.ogDescription} onChange={e=>setValue('ogDescription',e.target.value)}/></label>
        <MediaField label="Sayfaya özel sosyal paylaşım görseli" value={values.ogImage} onChange={v=>setValue('ogImage',String(v))}/>
        <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">X / Twitter metadata</summary><div className="mt-3 grid gap-3">
          <Input placeholder="Başlık" value={values.twitterTitle} onChange={e=>setValue('twitterTitle',e.target.value)}/>
          <Textarea rows={2} placeholder="Açıklama" value={values.twitterDescription} onChange={e=>setValue('twitterDescription',e.target.value)}/>
        </div></details>
       </div>
      </div>
    </CardContent></Card>
    <Card><CardContent className="grid gap-4 p-5">
      <div><h2 className="font-semibold">301 / 302 yönlendirmeleri</h2><p className="text-sm text-muted-foreground">Site içi adresleri yönetin. Kendi kendine yönlendirme ve tekrar eden kaynak adresleri engellenir.</p></div>
      {data.redirects.map((row,i)=><div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
       <Input placeholder="/eski-adres" value={row.from} onChange={e=>set({redirects:data.redirects.map((r,n)=>n===i?{...r,from:e.target.value}:r)})}/>
       <Input placeholder="/yeni-adres" value={row.to} onChange={e=>set({redirects:data.redirects.map((r,n)=>n===i?{...r,to:e.target.value}:r)})}/>
       <label className="flex items-center gap-2 text-sm"><Switch checked={row.permanent} onCheckedChange={v=>set({redirects:data.redirects.map((r,n)=>n===i?{...r,permanent:v}:r)})}/>301</label>
       <Button size="icon" variant="outline" onClick={()=>set({redirects:data.redirects.filter((_,n)=>n!==i)})}><Trash2 className="size-4"/></Button>
      </div>)}
      <Button className="justify-self-start" variant="outline" onClick={()=>set({redirects:[...data.redirects,{from:'',to:'',permanent:true}]})}><Plus className="size-4"/>Yönlendirme ekle</Button>
      <div className="flex flex-wrap gap-4 text-sm"><a className="underline" href="https://ticarti.com/sitemap.xml" target="_blank" rel="noreferrer">Sitemap.xml</a><a className="underline" href="https://ticarti.com/robots.txt" target="_blank" rel="noreferrer">Robots.txt</a></div>
    </CardContent></Card>
   </>}
  </Container>
 </>;
}
