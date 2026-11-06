'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowDown,ArrowLeft,ArrowUp,CheckCircle2,Code2,Copy,FileJson2,Layers,LoaderCircle,Plus,RefreshCw,Save,Settings2,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {Currency,Field,Locale,MediaField,Plan,PriceMatrix,PriceRow,Translations,TranslationFields,localeText} from './catalog-fields';

type Theme={id:string;name:string;slug:string;description?:string|null;category?:string|null;previewImageUrl?:string|null;version:string;basePrice:any;currency:string;billingType:string;isActive:boolean;isFeatured:boolean;isDefault:boolean;sortOrder:number;config:any;planPrices:any[];_count?:{installations:number}};
type Skin={slug:string;name:string;sourceName:string;groupId?:string;previewImageUrl:string;translations:Translations;planPricing:any[];isActive:boolean;isFeatured:boolean;verifiedFromDemo:boolean;rawJson:any};
type Section={sectionType:string;sourceId?:string;sortOrder?:number;enabled?:boolean;settings?:any};
type Module={type:string;name:string;categoryId:string;translations:Translations;screenshots:string[];planPricing:any[];isActive:boolean};
type Category={id:string;translations:Translations;sortOrder:number;isActive:boolean};
type Workspace={theme:{id:string;name:string;slug:string};skins:Skin[];modules:Module[];moduleCategories:Category[]};
type Context={plans:Plan[];locales:Locale[];currencies:Currency[]};
type Request=(path:string,options?:RequestInit)=>Promise<any>;
type View='overview'|'skins'|'sections'|'modules'|'categories'|'source';
const showError=(e:any)=>e instanceof Error?e.message:'İşlem gerçekleştirilemedi.';
function pricingRows(rows:any[]|undefined,currency:string):PriceRow[]{
  return (rows||[]).map(x=>({planId:String(x.planId),enabled:x.enabled!==undefined?x.enabled!==false:x.isActive!==false,included:!!x.included,price:x.price===null||x.price===undefined?null:Number(x.price),currency:String(x.currency||currency),trialDays:Number(x.trialDays||0),billingType:x.billingType||null}));
}
function formatMoney(v:any,currency:string){try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(Number(v||0))}catch{return String(v||0)+' '+currency}}
function categoryText(x:Category,locales:Locale[]){return localeText(x.translations,locales,'name',x.id)}
function normalizeJson(value:string,subject='JSON'){
  const parsed=JSON.parse(value);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error(subject+' bir JSON nesnesi olmalıdır.');
  return parsed;
}

export default function ThemeManagementEditor({themeId}:{themeId:string}){
  const {request,restoring}=useMasterSession();
  const [theme,setTheme]=useState<Theme|null>(null);
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [ctx,setCtx]=useState<Context>({plans:[],locales:[],currencies:[]});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [view,setView]=useState<View>('overview');
  const [skinSlug,setSkinSlug]=useState('');
  const [moduleType,setModuleType]=useState('');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const [all,space,plans,locales,settings]=await Promise.all([
        request('/superadmin/themes'),
        request('/superadmin/themes/'+encodeURIComponent(themeId)+'/workspace'),
        request('/superadmin/plans'),request('/superadmin/platform-locales'),request('/superadmin/platform-settings')
      ]);
      const selected=(Array.isArray(all)?all:[]).find((x:Theme)=>x.id===themeId)||null;
      if(!selected)throw new Error('Seçili tema paketi bulunamadı.');
      setTheme(selected);
      setWorkspace(space);
      setCtx({plans:Array.isArray(plans)?plans:[],locales:Array.isArray(locales)?locales:[],currencies:(settings?.currencies||[]).filter((x:any)=>x.isActive!==false)});
      setSkinSlug(old=>space.skins?.some((s:Skin)=>s.slug===old)?old:(space.skins?.[0]?.slug||''));
      setModuleType(old=>space.modules?.some((m:Module)=>m.type===old)?old:(space.modules?.[0]?.type||''));
    }catch(e){setError(showError(e))}
    finally{setLoading(false)}
  },[request,restoring,themeId]);
  useEffect(()=>{void load()},[load]);
  const saved=useCallback(async(note:string)=>{await load();setMessage(note)},[load]);
  const currentSkin=workspace?.skins.find(x=>x.slug===skinSlug);
  const currentModule=workspace?.modules.find(x=>x.type===moduleType);
  const skinName=(s:Skin)=>localeText(s.translations,ctx.locales,'name',s.name);
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Tema Düzenleme</h1><ToolbarDescription>{theme?theme.name+' · '+theme.slug:'Tema paketinin içerik ve kaynak ayarlarını yönetin.'}</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" asChild><Link href="/themes"><ArrowLeft className="size-4"/>Tema Kataloğu</Link></Button><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      {error?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
      {message?<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{message}</div>:null}
      {loading?<div className="grid min-h-80 place-items-center"><LoaderCircle className="size-6 animate-spin"/></div>:theme&&workspace?<>
        <Card><CardContent className="flex flex-wrap items-center gap-4 p-5">{theme.previewImageUrl?<img src={theme.previewImageUrl} alt="" className="h-20 w-32 rounded border object-cover"/>:<div className="grid h-20 w-32 place-items-center rounded border bg-muted"><Layers className="size-7 text-muted-foreground"/></div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-lg font-semibold">{theme.name}</div><Badge appearance="light" variant={theme.isActive?'success':'secondary'}>{theme.isActive?'Aktif':'Pasif'}</Badge>{theme.isDefault?<Badge appearance="light" variant="primary">Varsayılan</Badge>:null}</div><div className="mt-1 text-xs text-muted-foreground">{theme.slug} · v{theme.version} · {workspace.skins.length} tema görünümü · {workspace.modules.length} modül · {theme._count?.installations||0} kurulum</div></div></CardContent></Card>
        <div className="flex flex-wrap gap-2 border-b pb-3">{([
          ['overview','Paket Bilgileri'],['skins','Tema Görünümleri'],['sections','Sayfa Bölümleri'],['modules','Modüller'],['categories','Kategoriler'],['source','Kaynak Konfigürasyon']
        ] as [View,string][]).map(([id,title])=><Button key={id} size="sm" variant={view===id?'primary':'outline'} onClick={()=>{setView(id);setMessage('')}}>{title}</Button>)}</div>
        {view==='overview'?<PackageEditor key={theme.id+theme.version} theme={theme} ctx={ctx} request={request} onSaved={()=>saved('Tema paketi güncellendi.')}/>:null}
        {view==='skins'?<div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SelectionList title="Tema Görünümleri" empty="Tema görünümü bulunamadı." rows={workspace.skins.map(s=>({id:s.slug,name:skinName(s),subtitle:s.slug,active:s.isActive}))} value={skinSlug} onChange={setSkinSlug}/>
          {currentSkin?<SkinEditor key={theme.id+':'+currentSkin.slug} themeId={theme.id} skin={currentSkin} ctx={ctx} categories={workspace.moduleCategories} request={request} onSaved={()=>saved('Tema görünümü güncellendi.')}/>:null}
        </div>:null}
        {view==='sections'?<div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SelectionList title="Tema Görünümleri" empty="Tema görünümü bulunamadı." rows={workspace.skins.map(s=>({id:s.slug,name:skinName(s),subtitle:s.slug,active:s.isActive}))} value={skinSlug} onChange={setSkinSlug}/>
          {currentSkin?<SectionsEditor key={theme.id+':sections:'+currentSkin.slug} themeId={theme.id} skin={currentSkin} moduleTypes={workspace.modules.map(m=>m.type)} request={request} onSaved={()=>saved('Sayfa bölümleri güncellendi. Mağaza taslakları otomatik silinmedi.')}/>:null}
        </div>:null}
        {view==='modules'?<div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SelectionList title="Tema Modülleri" empty="Modül bulunamadı." rows={workspace.modules.map(m=>({id:m.type,name:localeText(m.translations,ctx.locales,'name',m.name),subtitle:m.type,active:m.isActive}))} value={moduleType} onChange={setModuleType}/>
          {currentModule?<ModuleEditor key={theme.id+':mod:'+currentModule.type} themeId={theme.id} module={currentModule} ctx={ctx} categories={workspace.moduleCategories} request={request} onSaved={()=>saved('Tema modülü güncellendi.')}/>:null}
        </div>:null}
        {view==='categories'?<CategoryEditor key={theme.id+':categories'} themeId={theme.id} categories={workspace.moduleCategories} locales={ctx.locales} request={request} onSaved={()=>saved('Modül kategorileri güncellendi.')}/>:null}
        {view==='source'?<SourceEditor key={theme.id+':config:'+theme.version} theme={theme} request={request} onSaved={()=>saved('Kaynak konfigürasyon güncellendi.')}/>:null}
      </>:null}
    </Container>
  </>;
}

function SelectionList({title,empty,rows,value,onChange}:{title:string;empty:string;rows:{id:string;name:string;subtitle:string;active?:boolean}[];value:string;onChange:(value:string)=>void}){
  return <Card><CardHeader><CardHeading>{title}</CardHeading></CardHeader><CardContent className="grid max-h-[75vh] content-start gap-1 overflow-y-auto p-3">{rows.map(x=><button type="button" key={x.id} onClick={()=>onChange(x.id)} className={'flex min-w-0 items-center justify-between rounded-lg px-3 py-3 text-left transition-colors '+(value===x.id?'bg-muted text-primary':'hover:bg-muted/40')}><span className="min-w-0"><span className="block truncate text-sm font-medium">{x.name}</span><span className="block truncate text-xs text-muted-foreground">{x.subtitle}</span></span>{x.active?<CheckCircle2 className="size-4 shrink-0 text-green-600"/>:null}</button>)}{!rows.length?<p className="p-3 text-sm text-muted-foreground">{empty}</p>:null}</CardContent></Card>;
}

function PackageEditor({theme,ctx,request,onSaved}:{theme:Theme;ctx:Context;request:Request;onSaved:()=>Promise<void>}){
  const [form,setForm]=useState({name:theme.name,description:theme.description||'',category:theme.category||'',previewImageUrl:theme.previewImageUrl||'',version:theme.version||'',basePrice:Number(theme.basePrice||0),currency:theme.currency||'TRY',billingType:theme.billingType||'ONE_TIME',isActive:theme.isActive,isFeatured:theme.isFeatured,isDefault:theme.isDefault,sortOrder:Number(theme.sortOrder||0)});
  const [prices,setPrices]=useState<PriceRow[]>(pricingRows(theme.planPrices,theme.currency||'TRY'));
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const set=(key:string,val:any)=>setForm(x=>({...x,[key]:val}));
  const save=async()=>{
    if(!form.name.trim()||!form.version.trim()){setError('Tema adı ve sürüm numarası zorunludur.');return}
    if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(form.version)){setError('Sürüm numarası 1.0.0 biçiminde olmalı.');return}
    setSaving(true);setError('');
    try{
      // Never include config in a regular metadata update: keeps installed theme presets and overrides.
      await request('/superadmin/themes/'+encodeURIComponent(theme.id),{method:'PATCH',body:JSON.stringify(form)});
      for(const row of prices)await request('/superadmin/themes/'+encodeURIComponent(theme.id)+'/plan-pricing',{method:'POST',body:JSON.stringify({planId:row.planId,isActive:row.enabled,included:row.included,price:row.price,currency:row.currency})});
      await onSaved();
    }catch(e){setError(showError(e))}finally{setSaving(false)}
  };
  return <Card><CardHeader><CardHeading>Kaynak Tema Paketi</CardHeading><p className="mt-1 text-sm text-muted-foreground">Sürümü, görünürlüğü, açıklamayı ve paket bazlı fiyatları düzenleyin. Mevcut tema kaynakları değiştirilmez.</p></CardHeader><CardContent className="grid gap-5">
    {error?<p className="text-sm text-destructive">{error}</p>:null}
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Tema adı"><Input value={form.name} onChange={e=>set('name',e.target.value)}/></Field>
      <Field label="Sabit tema kodu"><Input value={theme.slug} readOnly disabled/></Field>
      <Field label="Kategori"><Input value={form.category} onChange={e=>set('category',e.target.value)}/></Field>
      <Field label="Sürüm"><Input value={form.version} onChange={e=>set('version',e.target.value)} placeholder="1.0.0"/></Field>
      <Field label="Temel fiyat"><Input type="number" min={0} step="0.01" value={form.basePrice} onChange={e=>set('basePrice',Number(e.target.value)||0)}/></Field>
      <Field label="Para birimi"><Select value={form.currency} onValueChange={v=>set('currency',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ctx.currencies.map(c=><SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Ödeme periyodu"><Select value={form.billingType} onValueChange={v=>set('billingType',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['FREE','ONE_TIME','MONTHLY','YEARLY'].map(v=><SelectItem key={v} value={v}>{({FREE:'Ücretsiz',ONE_TIME:'Tek seferlik',MONTHLY:'Aylık',YEARLY:'Yıllık'} as any)[v]}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Sıralama"><Input type="number" value={form.sortOrder} onChange={e=>set('sortOrder',Number(e.target.value)||0)}/></Field>
    </div>
    <Field label="Tema açıklaması"><Textarea rows={3} value={form.description} onChange={e=>set('description',e.target.value)}/></Field>
    <div className="flex flex-wrap gap-6 border-y py-4">
      <label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={v=>set('isActive',v)}/>Aktif</label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={form.isFeatured} onCheckedChange={v=>set('isFeatured',v)}/>Öne Çıkan</label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={form.isDefault} onCheckedChange={v=>set('isDefault',v)}/>Varsayılan Tema</label>
    </div>
    <MediaField label="Paket kapak görseli" value={form.previewImageUrl} onChange={v=>set('previewImageUrl',v)}/>
    <div><h3 className="mb-3 font-semibold">Paket Bazlı Fiyatlandırma</h3><PriceMatrix plans={ctx.plans} currencies={ctx.currencies} value={prices} onChange={setPrices}/></div>
    <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Değişiklikleri Kaydet</Button></div>
  </CardContent></Card>;
}

function SkinEditor({themeId,skin,ctx,categories,request,onSaved}:{themeId:string;skin:Skin;ctx:Context;categories:Category[];request:Request;onSaved:()=>Promise<void>}){
  const [form,setForm]=useState({name:skin.name,groupId:skin.groupId||'',previewImageUrl:skin.previewImageUrl||'',translations:skin.translations||{} as Translations,isActive:skin.isActive,isFeatured:skin.isFeatured});
  const [pricing,setPricing]=useState<PriceRow[]>(pricingRows(skin.planPricing,ctx.currencies[0]?.code||'TRY'));
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const set=(key:string,v:any)=>setForm(x=>({...x,[key]:v}));
  const save=async()=>{
    setSaving(true);setError('');
    try{
      await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/skins/'+encodeURIComponent(skin.slug)+'/catalog',{method:'PATCH',body:JSON.stringify({...form,planPricing:pricing})});
      await onSaved();
    }catch(e){setError(showError(e))}finally{setSaving(false)}
  };
  return <Card><CardHeader><CardHeading>{skin.name}</CardHeading><p className="mt-1 text-sm text-muted-foreground">Tema görünümü · {skin.slug} · Kaynak dosyaları ve mağaza taslakları silinmez.</p></CardHeader><CardContent className="grid gap-5">
    {error?<p className="text-sm text-destructive">{error}</p>:null}
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Görünen ad"><Input value={form.name} onChange={e=>set('name',e.target.value)}/></Field>
      <Field label="Tema kodu"><Input value={skin.slug} disabled readOnly/></Field>
      <Field label="Kategori"><Select value={form.groupId||'NONE'} onValueChange={v=>set('groupId',v==='NONE'?'':v)}><SelectTrigger><SelectValue placeholder="Kategori seçin"/></SelectTrigger><SelectContent><SelectItem value="NONE">Grupsuz</SelectItem>{categories.map(c=><SelectItem key={c.id} value={c.id}>{categoryText(c,ctx.locales)}</SelectItem>)}</SelectContent></Select></Field>
      <div className="flex flex-wrap items-center gap-5"><label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={v=>set('isActive',v)}/>Aktif</label><label className="flex items-center gap-2 text-sm"><Switch checked={form.isFeatured} onCheckedChange={v=>set('isFeatured',v)}/>Öne Çıkan</label></div>
    </div>
    <TranslationFields locales={ctx.locales} value={form.translations} onChange={v=>set('translations',v)} fields={['name','description']}/>
    <MediaField label="Tema görünüm kapak görseli" value={form.previewImageUrl} onChange={v=>set('previewImageUrl',v)}/>
    <div><h3 className="mb-3 font-semibold">Paket Erişimi ve Fiyat</h3><PriceMatrix plans={ctx.plans} currencies={ctx.currencies} value={pricing} onChange={setPricing}/></div>
    <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Görünümü Kaydet</Button></div>
  </CardContent></Card>;
}

function ModuleEditor({themeId,module,ctx,categories,request,onSaved}:{themeId:string;module:Module;ctx:Context;categories:Category[];request:Request;onSaved:()=>Promise<void>}){
  const [form,setForm]=useState({name:module.name,categoryId:module.categoryId||'',translations:module.translations||{} as Translations,screenshots:module.screenshots||[],isActive:module.isActive});
  const [pricing,setPricing]=useState<PriceRow[]>(pricingRows(module.planPricing,ctx.currencies[0]?.code||'TRY'));
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const set=(key:string,v:any)=>setForm(x=>({...x,[key]:v}));
  const save=async()=>{
    setSaving(true);setError('');
    try{await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/modules/'+encodeURIComponent(module.type)+'/catalog',{method:'PATCH',body:JSON.stringify({...form,planPricing:pricing})});await onSaved()}
    catch(e){setError(showError(e))}finally{setSaving(false)}
  };
  return <Card><CardHeader><CardHeading>{module.name}</CardHeading><p className="mt-1 text-sm text-muted-foreground">Modül tipi: {module.type}</p></CardHeader><CardContent className="grid gap-5">
    {error?<p className="text-sm text-destructive">{error}</p>:null}
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Modül adı"><Input value={form.name} onChange={e=>set('name',e.target.value)}/></Field>
      <Field label="Kategori"><Select value={form.categoryId||'NONE'} onValueChange={v=>set('categoryId',v==='NONE'?'':v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NONE">Genel</SelectItem>{categories.map(c=><SelectItem key={c.id} value={c.id}>{categoryText(c,ctx.locales)}</SelectItem>)}</SelectContent></Select></Field>
    </div>
    <label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={v=>set('isActive',v)}/>Aktif modül</label>
    <TranslationFields locales={ctx.locales} value={form.translations} onChange={v=>set('translations',v)} fields={['name','description']}/>
    <MediaField label="Modül ekran görüntüleri" value={form.screenshots} multiple onChange={v=>set('screenshots',v)}/>
    <div><h3 className="mb-3 font-semibold">Paket Erişimi ve Fiyat</h3><PriceMatrix plans={ctx.plans} currencies={ctx.currencies} value={pricing} onChange={setPricing} allowTrials/></div>
    <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Modülü Kaydet</Button></div>
  </CardContent></Card>;
}

function CategoryEditor({themeId,categories,locales,request,onSaved}:{themeId:string;categories:Category[];locales:Locale[];request:Request;onSaved:()=>Promise<void>}){
  const [rows,setRows]=useState(categories);
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const patch=(i:number,value:Partial<Category>)=>setRows(x=>x.map((row,j)=>j===i?{...row,...value}:row));
  const add=()=>{const locale=locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'tr';setRows(x=>[...x,{id:'category-'+Date.now(),translations:{[locale]:{name:'Yeni kategori',description:''}},sortOrder:x.length,isActive:true}])};
  const save=async()=>{
    if(rows.some(x=>!x.id.trim())||new Set(rows.map(x=>x.id)).size!==rows.length){setError('Kategori kodları benzersiz ve dolu olmalıdır.');return}
    setSaving(true);setError('');
    try{await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/workspace/groups',{method:'PATCH',body:JSON.stringify({moduleCategories:rows})});await onSaved()}catch(e){setError(showError(e))}finally{setSaving(false)}
  };
  return <Card><CardHeader><div className="flex items-center justify-between gap-4"><CardHeading>Tema Kategorileri</CardHeading><Button variant="outline" onClick={add}><Plus className="size-4"/>Kategori Ekle</Button></div></CardHeader><CardContent className="grid gap-4">
    {error?<p className="text-sm text-destructive">{error}</p>:null}
    {rows.map((c,i)=><div key={i} className="grid gap-3 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_auto_auto] sm:items-end"><Field label="Kod"><Input value={c.id} onChange={e=>patch(i,{id:e.target.value})}/></Field><Field label="Sıra"><Input type="number" value={c.sortOrder} onChange={e=>patch(i,{sortOrder:Number(e.target.value)||0})}/></Field><label className="flex h-10 items-center gap-2 text-sm"><Switch checked={c.isActive} onCheckedChange={isActive=>patch(i,{isActive})}/>Aktif</label><Button variant="outline" size="icon" onClick={()=>setRows(x=>x.filter((_,j)=>j!==i))}><Trash2 className="size-4"/></Button></div>
      <TranslationFields locales={locales} value={c.translations||{}} onChange={translations=>patch(i,{translations})} fields={['name','description']}/>
    </div>)}
    <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kategorileri Kaydet</Button></div>
  </CardContent></Card>;
}

function SectionsEditor({themeId,skin,moduleTypes,request,onSaved}:{themeId:string;skin:Skin;moduleTypes:string[];request:Request;onSaved:()=>Promise<void>}){
  const original=skin.rawJson&&typeof skin.rawJson==='object'&&!Array.isArray(skin.rawJson)?skin.rawJson:{};
  const [sections,setSections]=useState<Section[]>(Array.isArray(original.homePreset)?original.homePreset.map((x:any)=>({...x})) : []);
  const [expanded,setExpanded]=useState<number|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const patch=(i:number,next:Partial<Section>)=>setSections(x=>x.map((row,j)=>j===i?{...row,...next}:row));
  const move=(i:number,dir:number)=>setSections(x=>{const out=[...x];const j=i+dir;if(j<0||j>=out.length)return x;[out[i],out[j]]=[out[j],out[i]];return out});
  const add=()=>{setSections(x=>[...x,{sourceId:'custom-'+Date.now(),sectionType:moduleTypes[0]||'rich_text',settings:{},enabled:true,sortOrder:x.length}]);setExpanded(sections.length)};
  const save=async()=>{
    const next=sections.map((row,i)=>({...row,sortOrder:i}));
    if(next.some(row=>!row.sectionType)){setError('Tüm bölümlerin bir modül tipi olmalı.');return}
    setSaving(true);setError('');
    try{
      const payload={...original,slug:skin.slug,homePreset:next};
      await request('/superadmin/themes/'+encodeURIComponent(themeId)+'/skins/'+encodeURIComponent(skin.slug)+'/source',{method:'PATCH',body:JSON.stringify({rawJson:payload})});
      await onSaved();
    }catch(e){setError(showError(e))}finally{setSaving(false)}
  };
  return <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardHeading>Sayfa Bölümleri · {skin.name}</CardHeading><p className="mt-1 text-sm text-muted-foreground">Kaynak homePreset bölümlerini sırala, aç/kapat ve modül ayarlarını düzenle. Diğer kaynak alanlar korunur.</p></div><Button size="sm" variant="outline" onClick={add}><Plus className="size-4"/>Bölüm Ekle</Button></div></CardHeader><CardContent className="grid gap-3">
    {error?<p className="text-sm text-destructive">{error}</p>:null}
    {sections.map((section,i)=><div key={section.sourceId||i} className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-3 p-3"><span className="min-w-0 grow"><span className="block text-sm font-medium">{section.sectionType}</span><span className="block truncate text-xs text-muted-foreground">{section.sourceId||'Kaynak bölüm'}</span></span>
        <Switch checked={section.enabled!==false} onCheckedChange={enabled=>patch(i,{enabled})}/>
        <Button variant="outline" size="icon" disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp className="size-4"/></Button>
        <Button variant="outline" size="icon" disabled={i===sections.length-1} onClick={()=>move(i,1)}><ArrowDown className="size-4"/></Button>
        <Button variant="outline" size="sm" onClick={()=>setExpanded(expanded===i?null:i)}><Settings2 className="size-4"/>Ayarlar</Button>
        <Button variant="outline" size="icon" onClick={()=>setSections(x=>x.filter((_,j)=>j!==i))}><Trash2 className="size-4"/></Button>
      </div>
      {expanded===i?<div className="grid gap-4 border-t p-4">
        <Field label="Modül tipi"><Select value={section.sectionType} onValueChange={sectionType=>patch(i,{sectionType})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{[...new Set([section.sectionType,...moduleTypes])].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Bölüm ayarları (JSON)"><Textarea rows={10} className="font-mono text-xs" defaultValue={JSON.stringify(section.settings||{},null,2)} key={section.sourceId+':'+i} onBlur={e=>{try{patch(i,{settings:normalizeJson(e.target.value,'Modül ayarları')});setError('')}catch(err){setError(showError(err))}}}/></Field>
        <p className="text-xs text-muted-foreground">Değişiklikleri JSON alanından çıktıktan sonra kaydedin. Yanlış JSON değerini düzeltmeden kaynak güncellemesine devam etmeyin.</p>
      </div>:null}
    </div>)}
    {!sections.length?<p className="py-8 text-center text-sm text-muted-foreground">Bu görünüm için kaynak sayfa bölümü bulunamadı.</p>:null}
    <div className="flex justify-end pt-3"><Button disabled={saving||!!error} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Bölümleri Kaydet</Button></div>
  </CardContent></Card>;
}

function SourceEditor({theme,request,onSaved}:{theme:Theme;request:Request;onSaved:()=>Promise<void>}){
  const [value,setValue]=useState(JSON.stringify(theme.config||{},null,2));
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const save=async()=>{
    let config:any;
    try{
      config=normalizeJson(value,'Tema konfigürasyonu');
      // Do not accidentally drop existing platforms keys when editing a partial JSON.
      const prev=theme.config&&typeof theme.config==='object'?theme.config:{};
      const keys=Object.keys(prev).filter(k=>!(k in config));
      if(keys.length){setError('Kaynak alanlar eksik: '+keys.join(', ')+'. Eksik alanları geri ekleyin.');return}
    }catch(e){setError(showError(e));return}
    if(!window.confirm('Kaynak tema konfigürasyonunu güncellemek istediğinize emin misiniz? Bu, tema kataloğunun varsayılanlarını etkileyebilir.'))return;
    setSaving(true);setError('');
    try{await request('/superadmin/themes/'+encodeURIComponent(theme.id),{method:'PATCH',body:JSON.stringify({config})});await onSaved()}catch(e){setError(showError(e))}finally{setSaving(false)}
  };
  return <Card><CardHeader><CardHeading>Tam Tema Konfigürasyonu</CardHeading><p className="mt-1 text-sm text-muted-foreground">Tema paketinin kaynak yapılandırması. Önceki skin, modül ve kategori ayarlarını koruyun; yalnızca bilinçli değişiklik yapın.</p></CardHeader><CardContent className="grid gap-4">
    {error?<p className="text-sm text-destructive">{error}</p>:null}
    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(value)}><Copy className="size-4"/>JSON Kopyala</Button></div>
    <Field label="config JSON"><Textarea className="font-mono text-xs" rows={24} value={value} onChange={e=>setValue(e.target.value)}/></Field>
    <div className="flex justify-end"><Button disabled={saving} onClick={()=>void save()}>{saving?<LoaderCircle className="size-4 animate-spin"/>:<Code2 className="size-4"/>}Konfigürasyonu Kaydet</Button></div>
  </CardContent></Card>;
}
