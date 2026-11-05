'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {Boxes,Check,CheckCircle2,FileJson2,Layers,LoaderCircle,Palette,Plus,RefreshCw,Search,Settings2,Star,Store,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Dialog,DialogBody,DialogContent,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Currency,Field,Locale,MediaField,Plan,PriceMatrix,PriceRow,Translations,TranslationFields,localeText} from './catalog-fields';

type ThemePackage={id:string;name:string;slug:string;description?:string|null;category:string;previewImageUrl?:string|null;version:string;basePrice:any;currency:string;billingType:string;isActive:boolean;isFeatured:boolean;isDefault:boolean;sortOrder:number;config:any;planPrices:any[];_count?:{installations:number}};
type Skin={slug:string;name:string;sourceName:string;groupId:string;previewImageUrl:string;translations:Translations;planPricing:any[];isActive:boolean;isFeatured:boolean;verifiedFromDemo:boolean;rawJson:any};
type Module={type:string;name:string;categoryId:string;translations:Translations;screenshots:string[];planPricing:any[];isActive:boolean};
type Category={id:string;translations:Translations;sortOrder:number;isActive:boolean};
type Workspace={theme:{id:string;name:string;slug:string};skins:Skin[];modules:Module[];moduleCategories:Category[]};
type Context={plans:Plan[];locales:Locale[];currencies:Currency[]};
type Request=(path:string,init?:RequestInit)=>Promise<any>;
type Tab='skins'|'modules'|'categories'|'packages';
const textError=(e:any)=>e?.message||'İşlem gerçekleştirilemedi.';
const money=(value:any,currency='TRY')=>{try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(Number(value||0))}catch{return String(value||0)+' '+currency}};
const toPricing=(rows:any[],def='TRY'):PriceRow[]=>Array.isArray(rows)?rows.map(x=>({planId:String(x.planId),enabled:x.enabled!==undefined?x.enabled!==false:x.isActive!==false,included:!!x.included,price:x.price==null?null:Number(x.price),currency:x.currency||def,billingType:x.billingType||null,trialDays:Number(x.trialDays||0)})):[];
const countPricing=(rows:any[])=>Array.isArray(rows)?rows.filter(x=>x.enabled!==false&&x.isActive!==false).length:0;
const categoryName=(x:Category,locales:Locale[])=>localeText(x.translations,locales,'name',x.id);

export default function ThemeAdminPage(){
  const {request,restoring}=useMasterSession();
  const [themes,setThemes]=useState<ThemePackage[]>([]);
  const [context,setContext]=useState<Context>({plans:[],locales:[],currencies:[]});
  const [themeId,setThemeId]=useState('');
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(true),[workspaceLoading,setWorkspaceLoading]=useState(false);
  const [error,setError]=useState(''),[success,setSuccess]=useState('');
  const [tab,setTab]=useState<Tab>('skins'),[search,setSearch]=useState(''),[filter,setFilter]=useState('ALL');
  const [editSkin,setEditSkin]=useState<Skin|null>(null),[editModule,setEditModule]=useState<Module|null>(null),[editPackage,setEditPackage]=useState<ThemePackage|{}|null>(null);

  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const [themesResult,plans,locales,settings]=await Promise.all([
        request('/superadmin/themes'),request('/superadmin/plans'),request('/superadmin/platform-locales'),request('/superadmin/platform-settings')
      ]);
      const items=Array.isArray(themesResult)?themesResult:[];
      setThemes(items);
      setContext({plans:Array.isArray(plans)?plans:[],locales:Array.isArray(locales)?locales:[],currencies:(settings?.currencies||[]).filter((x:Currency & {isActive?:boolean})=>x.isActive!==false)});
      setThemeId(current=>items.some((x:ThemePackage)=>x.id===current)?current:(items[0]?.id||''));
    }catch(e){setError(textError(e))}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const loadWorkspace=useCallback(async()=>{
    if(restoring||!themeId){setWorkspace(null);return}
    setWorkspaceLoading(true);setError('');
    try{const result=await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/workspace');setWorkspace(result)}
    catch(e){setError(textError(e));setWorkspace(null)}
    finally{setWorkspaceLoading(false)}
  },[request,restoring,themeId]);
  useEffect(()=>{void loadWorkspace()},[loadWorkspace]);
  const currentTheme=themes.find(x=>x.id===themeId)||null;
  const filteredSkins=useMemo(()=>((workspace?.skins)||[]).filter(s=>{
    const needle=search.trim().toLocaleLowerCase('tr-TR');
    return (filter==='ALL'||(filter==='ACTIVE'?s.isActive:filter==='FEATURED'?s.isFeatured:!s.isActive))&&(!needle||[s.name,s.slug,s.sourceName,localeText(s.translations,context.locales,'name')].some(x=>String(x||'').toLocaleLowerCase('tr-TR').includes(needle)));
  }),[workspace,filter,search,context.locales]);
  const filteredModules=useMemo(()=>((workspace?.modules)||[]).filter(m=>{
    const needle=search.trim().toLocaleLowerCase('tr-TR');
    return (filter==='ALL'||(filter==='ACTIVE'?m.isActive:filter==='FEATURED'?true:!m.isActive))&&(!needle||[m.name,m.type,localeText(m.translations,context.locales,'name')].some(x=>String(x||'').toLocaleLowerCase('tr-TR').includes(needle)));
  }),[workspace,filter,search,context.locales]);
  const saved=async(note:string)=>{setEditSkin(null);setEditModule(null);setEditPackage(null);setSuccess(note);await load();await loadWorkspace()};
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Temalar</h1><ToolbarDescription>Kaynak tema paketlerini, mağazaya sunulan temaları, bölümleri, çok dilli içerikleri ve paket erişimini yönetin.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="size-4"/>Yenile</Button><Button onClick={()=>setEditPackage({})}><Plus className="size-4"/>Tema Paketi Ekle</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[[workspace?.skins.length||0,'Katalog Temaları',Palette],[workspace?.skins.filter(x=>x.isActive).length||0,'Aktif Temalar',CheckCircle2],[workspace?.modules.length||0,'Tema Modülleri',Layers],[themes.reduce((n,x)=>n+Number(x._count?.installations||0),0),'Mağaza Kurulumları',Store]].map(([value,label,Icon]:any)=><Card key={label}><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div><Icon className="size-5 text-muted-foreground"/></CardContent></Card>)}
      </div>
      {error?<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      {success?<p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>:null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2 border-b pb-3">{[['skins','Temalar'],['modules','Tema Modülleri'],['categories','Modül Kategorileri'],['packages','Kaynak Paketler']].map(([id,title])=><Button key={id} variant={tab===id?'primary':'outline'} onClick={()=>{setTab(id as Tab);setSearch('');setFilter('ALL')}}>{title}</Button>)}</div>
        {tab!=='packages'?<Field label="Kaynak paket"><Select value={themeId} onValueChange={setThemeId}><SelectTrigger className="min-w-60"><SelectValue placeholder="Kaynak paket seçin"/></SelectTrigger><SelectContent>{themes.map(x=><SelectItem key={x.id} value={x.id}>{x.name} · {x.slug}</SelectItem>)}</SelectContent></Select></Field>:null}
      </div>
      {tab==='packages'?<Card><CardHeader><div className="flex justify-between gap-3"><CardHeading>Kaynak Tema Paketleri</CardHeading><Button variant="outline" onClick={()=>setEditPackage({})}><Plus className="size-4"/>Yeni Kaynak Paket</Button></div></CardHeader><CardContent className="overflow-x-auto p-0">
        <Table><TableHeader><TableRow><TableHead>Paket</TableHead><TableHead>Fiyat</TableHead><TableHead>Mağaza Kurulumu</TableHead><TableHead>Durum</TableHead><TableHead className="text-end">İşlem</TableHead></TableRow></TableHeader>
        <TableBody>{themes.map(theme=><TableRow key={theme.id}><TableCell><div className="flex items-center gap-3">{theme.previewImageUrl?<img src={theme.previewImageUrl} alt="" className="size-14 rounded border object-cover"/>:<div className="grid size-14 place-items-center rounded border bg-muted"><Palette className="size-5"/></div>}<div><div className="font-medium">{theme.name}{theme.isDefault?<Badge className="ms-2" appearance="light" variant="success">Varsayılan</Badge>:null}</div><div className="text-xs text-muted-foreground">{theme.slug} · v{theme.version}</div></div></div></TableCell><TableCell>{money(theme.basePrice,theme.currency)}</TableCell><TableCell>{theme._count?.installations||0}</TableCell><TableCell><Badge appearance="light" variant={theme.isActive?'success':'secondary'}>{theme.isActive?'Aktif':'Pasif'}</Badge></TableCell><TableCell className="text-end"><Button variant="outline" size="sm" onClick={()=>setEditPackage(theme)}><Settings2 className="size-4"/>Düzenle</Button></TableCell></TableRow>)}</TableBody></Table>
      </CardContent></Card>:<>
        {themeId&&<Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><b>{currentTheme?.name||workspace?.theme.name}</b><span className="ms-3 text-xs text-muted-foreground">{currentTheme?.slug} · {workspace?.skins.length||0} tema · {workspace?.modules.length||0} modül</span></div><Button size="sm" variant="outline" onClick={()=>currentTheme&&setEditPackage(currentTheme)}><Settings2 className="size-4"/>Kaynak Paket Ayarları</Button></CardContent></Card>}
        {['skins','modules'].includes(tab)?<Card><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_200px]"><div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tema adı, slug veya modül tipi ara"/></div><Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Tüm durumlar</SelectItem><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="INACTIVE">Pasif</SelectItem>{tab==='skins'?<SelectItem value="FEATURED">Öne Çıkan</SelectItem>:null}</SelectContent></Select></CardContent></Card>:null}
        {workspaceLoading||loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="size-6 animate-spin"/></div>:
          !workspace?<Card><CardContent className="py-14 text-center text-muted-foreground">{themes.length?'Tema çalışma alanı açılamadı.':'Henüz tema paketi tanımlanmamış.'}</CardContent></Card>:
          tab==='skins'?<Card><CardHeader><CardHeading>Tema Kataloğu</CardHeading><p className="text-sm text-muted-foreground">Her skin ayrı mağaza temasıdır; kaynak paket kodu korunur. İçerik, görsel, paket ve kaynak JSON burada yönetilir.</p></CardHeader><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>Görsel</TableHead><TableHead>Tema</TableHead><TableHead>Paket Erişimi</TableHead><TableHead>Durum</TableHead><TableHead className="text-end">İşlem</TableHead></TableRow></TableHeader><TableBody>{filteredSkins.map(s=><TableRow key={s.slug}><TableCell>{s.previewImageUrl?<img src={s.previewImageUrl} alt="" className="h-16 w-24 rounded border object-cover"/>:<div className="grid h-16 w-24 place-items-center rounded border bg-muted"><Palette className="size-6"/></div>}</TableCell><TableCell><div className="flex flex-wrap items-center gap-2 font-medium">{localeText(s.translations,context.locales,'name',s.name)}{s.isFeatured?<Badge appearance="light" variant="primary"><Star className="size-3"/>Öne Çıkan</Badge>:null}</div><div className="text-xs text-muted-foreground">{s.slug}{s.verifiedFromDemo?' · Demo doğrulandı':''}</div><div className="max-w-xl text-xs text-muted-foreground">{localeText(s.translations,context.locales,'description','')}</div></TableCell><TableCell><Badge appearance="light" variant="secondary">{countPricing(s.planPricing)} paket</Badge></TableCell><TableCell><Badge appearance="light" variant={s.isActive?'success':'secondary'}>{s.isActive?'Aktif':'Pasif'}</Badge></TableCell><TableCell className="text-end"><Button size="sm" variant="outline" onClick={()=>setEditSkin(s)}>Düzenle</Button></TableCell></TableRow>)}{!filteredSkins.length?<TableRow><TableCell colSpan={5}><div className="py-14 text-center text-sm text-muted-foreground">Tema bulunamadı.</div></TableCell></TableRow>:null}</TableBody></Table></CardContent></Card>:
          tab==='modules'?<Card><CardHeader><CardHeading>Tema Modülleri</CardHeading><p className="text-sm text-muted-foreground">Modül adı, açıklama, kategori, ekran görüntüleri, paket bazlı erişim ve fiyatlar.</p></CardHeader><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>Modül</TableHead><TableHead>Kategori</TableHead><TableHead>Paket</TableHead><TableHead>Durum</TableHead><TableHead className="text-end">İşlem</TableHead></TableRow></TableHeader><TableBody>{filteredModules.map(m=><TableRow key={m.type}><TableCell><div className="font-medium">{localeText(m.translations,context.locales,'name',m.name)}</div><div className="text-xs text-muted-foreground">{m.type}</div></TableCell><TableCell>{workspace.moduleCategories.find(x=>x.id===m.categoryId)?categoryName(workspace.moduleCategories.find(x=>x.id===m.categoryId)!,context.locales):m.categoryId||'Genel'}</TableCell><TableCell>{countPricing(m.planPricing)} paket</TableCell><TableCell><Badge appearance="light" variant={m.isActive?'success':'secondary'}>{m.isActive?'Aktif':'Pasif'}</Badge></TableCell><TableCell className="text-end"><Button size="sm" variant="outline" onClick={()=>setEditModule(m)}>Düzenle</Button></TableCell></TableRow>)}{!filteredModules.length?<TableRow><TableCell colSpan={5}><div className="py-12 text-center text-muted-foreground">Tema modülü bulunamadı.</div></TableCell></TableRow>:null}</TableBody></Table></CardContent></Card>:
          <ThemeCategoryEditor key={themeId} rows={workspace.moduleCategories} locales={context.locales} request={request} themeId={themeId} onSaved={async()=>saved('Modül kategorileri kaydedildi.')}/>}
      </>}
    </Container>
    {editSkin&&workspace?<SkinEditor key={editSkin.slug} skin={editSkin} themeId={themeId} ctx={context} categories={workspace.moduleCategories} request={request} onClose={()=>setEditSkin(null)} onSaved={async()=>saved('Tema ayarları kaydedildi.')} onSourceSaved={async()=>{await loadWorkspace();setSuccess('Kaynak JSON kaydedildi.')}}/>:null}
    {editModule&&workspace?<ModuleEditor key={editModule.type} module={editModule} themeId={themeId} ctx={context} categories={workspace.moduleCategories} request={request} onClose={()=>setEditModule(null)} onSaved={async()=>saved('Tema modülü kaydedildi.')}/>:null}
    {editPackage!==null?<ThemePackageEditor key={'theme-'+('id' in editPackage?editPackage.id:'new')} initial={editPackage as Partial<ThemePackage>} ctx={context} request={request} onClose={()=>setEditPackage(null)} onSaved={async()=>saved('Tema paketi kaydedildi.')}/>:null}
  </>;
}

function SkinEditor({skin,themeId,ctx,categories,request,onClose,onSaved,onSourceSaved}:{skin:Skin;themeId:string;ctx:Context;categories:Category[];request:Request;onClose:()=>void;onSaved:()=>Promise<void>;onSourceSaved:()=>Promise<void>}){
  const [form,setForm]=useState<any>({name:skin.name,previewImageUrl:skin.previewImageUrl||'',groupId:skin.groupId||'',translations:skin.translations||{},isActive:skin.isActive,isFeatured:skin.isFeatured});
  const [pricing,setPricing]=useState(toPricing(skin.planPricing,ctx.currencies[0]?.code||'TRY'));
  const [source,setSource]=useState(JSON.stringify(skin.rawJson||{},null,2));
  const [pane,setPane]=useState<'content'|'price'|'source'>('content');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const patch=(key:string,value:any)=>setForm((x:any)=>({...x,[key]:value}));
  const save=async()=>{
    setBusy(true);setError('');
    try{
      await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/skins/'+encodeURIComponent(skin.slug)+'/catalog',{method:'PATCH',body:JSON.stringify({...form,planPricing:pricing})});
      await onSaved();
    }catch(e){setError(textError(e))}finally{setBusy(false)}
  };
  const saveSource=async()=>{
    let parsed:any;
    try{parsed=JSON.parse(source);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();if(String(parsed.slug||skin.slug)!==skin.slug)throw Error('Slug, mevcut tema ile aynı olmalı.')}catch(e:any){setError(e.message||'Geçerli JSON nesnesi gerekli.');return}
    setBusy(true);setError('');
    try{
      await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/skins/'+encodeURIComponent(skin.slug)+'/source',{method:'PATCH',body:JSON.stringify({rawJson:parsed})});await onSourceSaved();
    }catch(e){setError(textError(e))}finally{setBusy(false)}
  };
  const resetSource=async()=>{
    if(!window.confirm('Bu temaya ait kaynak JSON özelleştirmesi sıfırlansın mı? Kaynak dosyalar silinmeyecek.'))return;
    setBusy(true);setError('');
    try{await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/skins/'+encodeURIComponent(skin.slug)+'/source',{method:'DELETE'});await onSourceSaved();setPane('content');onClose()}catch(e){setError(textError(e))}finally{setBusy(false)}
  };
  return <Dialog open onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="sm:max-w-6xl"><DialogHeader><DialogTitle>{skin.name} · {skin.slug}</DialogTitle></DialogHeader><DialogBody className="max-h-[76vh] overflow-y-auto">
    {error?<p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
    <div className="mb-4 flex flex-wrap gap-2 border-b pb-3">{[['content','Tema Bilgileri'],['price','Paket Erişimi ve Fiyat'],['source','Kaynak Tema JSON']].map(([k,label])=><Button key={k} size="sm" variant={pane===k?'primary':'outline'} onClick={()=>setPane(k as any)}>{label}</Button>)}</div>
    {pane==='content'?<div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2"><Field label="Tema adı"><Input value={form.name} onChange={e=>patch('name',e.target.value)}/></Field><Field label="Modül / tema grubu"><Select value={form.groupId||'NONE'} onValueChange={v=>patch('groupId',v==='NONE'?'':v)}><SelectTrigger><SelectValue placeholder="Kategori"/></SelectTrigger><SelectContent><SelectItem value="NONE">Grupsuz</SelectItem>{categories.map(x=><SelectItem key={x.id} value={x.id}>{categoryName(x,ctx.locales)}</SelectItem>)}</SelectContent></Select></Field>
      <label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={v=>patch('isActive',v)}/>Mağazada kullanılabilir</label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={form.isFeatured} onCheckedChange={v=>patch('isFeatured',v)}/>Öne çıkan tema</label></div>
      <TranslationFields locales={ctx.locales} value={form.translations} onChange={v=>patch('translations',v)} fields={['name','description']} hint="Mağazaya gösterilecek tema adı ve açıklaması. Kaynak slug değiştirilmez."/>
      <MediaField label="Tema kapak görseli" value={form.previewImageUrl} onChange={v=>patch('previewImageUrl',v)}/>
    </div>:null}
    {pane==='price'?<><p className="mb-4 text-sm text-muted-foreground">Tüm paketleri listeleyerek erişimi ve ek ücreti ayrı tanımlayın. Erişimi kapatmak kaydı silmez.</p><PriceMatrix plans={ctx.plans} currencies={ctx.currencies} value={pricing} onChange={setPricing}/></>:null}
    {pane==='source'?<div className="grid gap-4"><p className="text-sm text-muted-foreground">Tema paketi içindeki tam kaynak JSON burada saklanır. Özelleştirme kaynak dosyalarını değiştirmez; sıfırladığınızda paketteki orijinal JSON tekrar kullanılır.</p><Field label="Tam kaynak JSON"><Textarea className="font-mono text-xs" rows={20} value={source} onChange={e=>setSource(e.target.value)}/></Field><div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={()=>void saveSource()}><FileJson2 className="size-4"/>Kaynak JSON'u Kaydet</Button><Button disabled={busy} variant="outline" onClick={()=>void resetSource()}>Özelleştirmeyi Sıfırla</Button></div></div>:null}
  </DialogBody><DialogFooter><Button variant="outline" onClick={onClose}>Kapat</Button><Button disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:<Check className="size-4"/>}Tema Bilgilerini Kaydet</Button></DialogFooter></DialogContent></Dialog>;
}

function ModuleEditor({module,themeId,ctx,categories,request,onClose,onSaved}:{module:Module;themeId:string;ctx:Context;categories:Category[];request:Request;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [form,setForm]=useState<any>({name:module.name,categoryId:module.categoryId||'',translations:module.translations||{},screenshots:module.screenshots||[],isActive:module.isActive});
  const [pricing,setPricing]=useState(toPricing(module.planPricing,ctx.currencies[0]?.code||'TRY'));
  const [pane,setPane]=useState<'content'|'price'>('content');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const patch=(key:string,value:any)=>setForm((x:any)=>({...x,[key]:value}));
  const save=async()=>{
    setBusy(true);setError('');
    try{await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/modules/'+encodeURIComponent(module.type)+'/catalog',{method:'PATCH',body:JSON.stringify({...form,planPricing:pricing})});await onSaved()}
    catch(e){setError(textError(e))}finally{setBusy(false)}
  };
  return <Dialog open onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="sm:max-w-5xl"><DialogHeader><DialogTitle>Tema Modülü · {module.type}</DialogTitle></DialogHeader><DialogBody className="max-h-[76vh] overflow-y-auto">
    {error?<p className="mb-3 text-sm text-destructive">{error}</p>:null}
    <div className="mb-4 flex gap-2 border-b pb-3"><Button variant={pane==='content'?'primary':'outline'} onClick={()=>setPane('content')}>Modül İçeriği</Button><Button variant={pane==='price'?'primary':'outline'} onClick={()=>setPane('price')}>Paket ve Fiyatlandırma</Button></div>
    {pane==='content'?<div className="grid gap-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Modül adı"><Input value={form.name} onChange={e=>patch('name',e.target.value)}/></Field><Field label="Modül kategorisi"><Select value={form.categoryId||'NONE'} onValueChange={v=>patch('categoryId',v==='NONE'?'':v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NONE">Genel</SelectItem>{categories.map(x=><SelectItem key={x.id} value={x.id}>{categoryName(x,ctx.locales)}</SelectItem>)}</SelectContent></Select></Field><label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={v=>patch('isActive',v)}/>Modül aktif</label></div><TranslationFields locales={ctx.locales} value={form.translations} onChange={v=>patch('translations',v)} fields={['name','description']}/><MediaField multiple label="Modül ekran görüntüleri" value={form.screenshots} onChange={v=>patch('screenshots',v)}/></div>:<PriceMatrix plans={ctx.plans} currencies={ctx.currencies} value={pricing} onChange={setPricing} allowTrials/>}
  </DialogBody><DialogFooter><Button variant="outline" onClick={onClose}>İptal</Button><Button disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button></DialogFooter></DialogContent></Dialog>;
}

function ThemeCategoryEditor({rows:initial,locales,request,themeId,onSaved}:{rows:Category[];locales:Locale[];request:Request;themeId:string;onSaved:()=>Promise<void>}){
  const [rows,setRows]=useState<Category[]>(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const patch=(i:number,v:Partial<Category>)=>setRows(x=>x.map((r,j)=>i===j?{...r,...v}:r));
  const add=()=>{const locale=locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'tr';setRows(x=>[...x,{id:'group-'+Date.now(),translations:{[locale]:{name:'Yeni kategori',description:''}},isActive:true,sortOrder:x.length}])};
  const save=async()=>{
    if(rows.some(x=>!x.id)||new Set(rows.map(x=>x.id)).size!==rows.length){setError('Kategori kodları benzersiz olmalı.');return}
    setBusy(true);setError('');
    try{await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/workspace/groups',{method:'PATCH',body:JSON.stringify({moduleCategories:rows})});await onSaved()}catch(e){setError(textError(e))}finally{setBusy(false)}
  };
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardHeading>Tema Modülü Kategorileri</CardHeading><p className="mt-1 text-sm text-muted-foreground">Modülleri çok dilli kategorilerle düzenleyin; kategori değişiklikleri kaynak JSON'u etkilemez.</p></div><div className="flex gap-2"><Button variant="outline" onClick={add}><Plus className="size-4"/>Yeni Kategori</Button><Button disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:null}Kategorileri Kaydet</Button></div></div></CardHeader>
    <CardContent className="grid gap-4">{error?<p className="text-sm text-destructive">{error}</p>:null}{rows.map((item,i)=><div className="rounded-lg border p-4" key={i}>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_120px_auto_auto] sm:items-end"><Field label="Kategori kodu"><Input value={item.id} onChange={e=>patch(i,{id:e.target.value})}/></Field><Field label="Sıra"><Input type="number" value={item.sortOrder} onChange={e=>patch(i,{sortOrder:Number(e.target.value)||0})}/></Field><label className="flex h-10 items-center gap-2 text-sm"><Switch checked={item.isActive} onCheckedChange={isActive=>patch(i,{isActive})}/>Aktif</label><Button variant="outline" size="icon" onClick={()=>setRows(x=>x.filter((_,j)=>j!==i))}><Trash2 className="size-4"/></Button></div>
      <TranslationFields locales={locales} value={item.translations||{}} onChange={translations=>patch(i,{translations})} fields={['name','description']}/>
    </div>)}{!rows.length?<p className="text-sm text-muted-foreground">Kategori henüz tanımlanmadı.</p>:null}</CardContent>
  </Card>;
}

function ThemePackageEditor({initial,ctx,request,onClose,onSaved}:{initial:Partial<ThemePackage>;ctx:Context;request:Request;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [form,setForm]=useState<any>({slug:initial.slug||'',name:initial.name||'',description:initial.description||'',category:initial.category||'GENEL',version:initial.version||'1.0.0',previewImageUrl:initial.previewImageUrl||'',basePrice:Number(initial.basePrice||0),currency:initial.currency||'TRY',billingType:initial.billingType||'ONE_TIME',isActive:initial.isActive!==false,isFeatured:!!initial.isFeatured,isDefault:!!initial.isDefault,sortOrder:initial.sortOrder||0});
  const [source,setSource]=useState(JSON.stringify(initial.config||{},null,2));
  const [pricing,setPricing]=useState(toPricing(initial.planPrices||[],ctx.currencies[0]?.code||'TRY'));
  const [pane,setPane]=useState<'general'|'pricing'|'config'>('general'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const patch=(k:string,v:any)=>setForm((x:any)=>({...x,[k]:v}));
  const save=async()=>{
    if(!form.name.trim()||!form.slug.trim()){setError('Tema adı ve slug zorunludur.');return}
    let config:any;
    try{config=JSON.parse(source);if(!config||typeof config!=='object'||Array.isArray(config))throw Error()}catch{setError('Paket ayarları geçerli bir JSON nesnesi olmalıdır.');setPane('config');return}
    setBusy(true);setError('');
    try{
      const result=initial.id?await request('/superadmin/themes/'+initial.id,{method:'PATCH',body:JSON.stringify({...form,config})}):await request('/superadmin/themes',{method:'POST',body:JSON.stringify({...form,config})});
      const id=initial.id||result.id;
      for(const row of pricing)await request('/superadmin/themes/'+id+'/plan-pricing',{method:'POST',body:JSON.stringify({planId:row.planId,isActive:row.enabled,included:row.included,price:row.price,currency:row.currency})});
      await onSaved();
    }catch(e){setError(textError(e))}finally{setBusy(false)}
  };
  return <Dialog open onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="sm:max-w-6xl"><DialogHeader><DialogTitle>{initial.id?'Kaynak Tema Paketini Düzenle':'Yeni Kaynak Tema Paketi'}</DialogTitle></DialogHeader><DialogBody className="max-h-[76vh] overflow-y-auto">
    {error?<p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
    <div className="mb-5 flex flex-wrap gap-2 border-b pb-3">{[['general','Temel Bilgiler'],['pricing','Paket Fiyatları'],['config','Tam Konfigürasyon JSON']].map(([id,label])=><Button key={id} size="sm" variant={pane===id?'primary':'outline'} onClick={()=>setPane(id as any)}>{label}</Button>)}</div>
    {pane==='general'?<div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2"><Field label="Tema paketi adı"><Input value={form.name} onChange={e=>patch('name',e.target.value)}/></Field><Field label="Slug"><Input disabled={!!initial.id} value={form.slug} onChange={e=>patch('slug',e.target.value.toLowerCase())}/></Field><Field label="Kategori"><Input value={form.category} onChange={e=>patch('category',e.target.value)}/></Field><Field label="Sürüm"><Input value={form.version} onChange={e=>patch('version',e.target.value)}/></Field><Field label="Temel fiyat"><Input type="number" min={0} step=".01" value={form.basePrice} onChange={e=>patch('basePrice',Number(e.target.value)||0)}/></Field><Field label="Para birimi"><Select value={form.currency} onValueChange={v=>patch('currency',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ctx.currencies.map(c=><SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent></Select></Field><Field label="Faturalama"><Select value={form.billingType} onValueChange={v=>patch('billingType',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['FREE','ONE_TIME','MONTHLY','YEARLY'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><Field label="Sıralama"><Input type="number" value={form.sortOrder} onChange={e=>patch('sortOrder',Number(e.target.value)||0)}/></Field></div>
      <Field label="Açıklama"><Textarea rows={3} value={form.description} onChange={e=>patch('description',e.target.value)}/></Field>
      <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={v=>patch('isActive',v)}/>Aktif</label><label className="flex items-center gap-2 text-sm"><Switch checked={form.isFeatured} onCheckedChange={v=>patch('isFeatured',v)}/>Öne Çıkan</label><label className="flex items-center gap-2 text-sm"><Switch checked={form.isDefault} onCheckedChange={v=>patch('isDefault',v)}/>Varsayılan</label></div>
      <MediaField label="Kaynak Paket Kapak Görseli" value={form.previewImageUrl} onChange={v=>patch('previewImageUrl',v)}/>
    </div>:null}
    {pane==='pricing'?<PriceMatrix plans={ctx.plans} currencies={ctx.currencies} value={pricing} onChange={setPricing}/>:null}
    {pane==='config'?<div className="grid gap-3"><p className="text-sm text-muted-foreground">Mevcut skin kaynakları, modül kataloğu, modül grupları ve diğer paket ayarları korunur. Yalnızca ihtiyaç duyduğunuz alanları değiştirin.</p><Field label="Tema config JSON"><Textarea className="font-mono text-xs" rows={20} value={source} onChange={e=>setSource(e.target.value)}/></Field></div>:null}
  </DialogBody><DialogFooter><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button></DialogFooter></DialogContent></Dialog>;
}
