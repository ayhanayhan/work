'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Boxes,CheckCircle2,Grid2X2,LoaderCircle,Plus,Puzzle,RefreshCw,Search,Settings2,Store,Trash2} from 'lucide-react';
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

type Category={id:string;translations:Translations;sortOrder:number;isActive:boolean};
type AppRow={id:string;slug:string;name:string;category:string;summary:string;description?:string;icon?:string;developer:string;provider?:string;kind:string;integrationType?:string;settingsSchema:any;basePrice:any;currency:string;billingType:string;isActive:boolean;isFeatured:boolean;sortOrder:number;planPrices:Array<any>;_count?:{installs:number}};
type Workspace={items:AppRow[];plans:Plan[];locales:Locale[];currencies:Currency[];categories:Category[]};
const INTEGRATIONS=['MARKETPLACE','PAYMENT','SHIPPING','INVOICE','MARKETING','AI','SOCIAL','ANALYTICS','MESSAGING','CRM'];
const BILLING=['FREE','ONE_TIME','MONTHLY','YEARLY'];
const money=(value:any,currency='TRY')=>{try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(Number(value||0))}catch{return String(value||0)+' '+currency}};
const errorText=(e:any)=>e?.message||'İşlem gerçekleştirilemedi.';
function appTitle(app:AppRow,locales:Locale[]){return localeText(app.settingsSchema?.marketplace?.translations,locales,'name',app.name)}
function categoryTitle(id:string,categories:Category[],locales:Locale[]){const row=categories.find(x=>x.id===id);return row?localeText(row.translations,locales,'name',row.id):id||'Diğer'}

export function AppAdminPage(){
  const {request,restoring}=useMasterSession();
  const [data,setData]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const [search,setSearch]=useState(''),[status,setStatus]=useState('ALL'),[category,setCategory]=useState('ALL'),[tab,setTab]=useState<'apps'|'categories'>('apps');
  const [editing,setEditing]=useState<AppRow|{}|null>(null);
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{const result=await request('/superadmin/app-workspace');setData(result);setCategory(current=>current==='ALL'||result.categories?.some((x:Category)=>x.id===current)?current:'ALL')}
    catch(e){setError(errorText(e))}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const items=data?.items||[],locales=data?.locales||[],categories=data?.categories||[];
  const filtered=useMemo(()=>items.filter(app=>{
    const matchingCategory=category==='ALL'||(app.settingsSchema?.marketplace?.categoryId||app.category)===category;
    const matchingStatus=status==='ALL'||(status==='ACTIVE'?app.isActive:status==='FEATURED'?app.isFeatured:!app.isActive);
    const needle=search.trim().toLocaleLowerCase('tr-TR');
    const matchingText=!needle||[appTitle(app,locales),app.slug,app.summary,app.developer,app.provider,app.category].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(needle));
    return matchingCategory&&matchingStatus&&matchingText;
  }),[items,locales,category,status,search]);

  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Uygulamalar</h1><ToolbarDescription>Merkezi uygulama kataloğu, çok dilli içerik, kategoriler, izin şeması, paket fiyatları ve kurulum yönetimi.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button><Button variant="outline" asChild><Link href="/extensions/installed"><Store className="size-4"/>Mağaza Kurulumları</Link></Button><Button onClick={()=>setEditing({})}><Plus className="size-4"/>Yeni Uygulama</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[[items.length,'Toplam Uygulama',Puzzle],[items.filter(x=>x.isActive).length,'Aktif',CheckCircle2],[items.filter(x=>x.isFeatured).length,'Öne Çıkan',Boxes],[items.reduce((n,x)=>n+Number(x._count?.installs||0),0),'Toplam Kurulum',Store]].map(([value,label,Icon]:any)=><Card key={label}><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div><Icon className="size-5 text-muted-foreground"/></CardContent></Card>)}
      </div>
      {error?<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      {success?<p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>:null}
      <div className="flex flex-wrap gap-2 border-b pb-3"><Button variant={tab==='apps'?'primary':'outline'} onClick={()=>setTab('apps')}><Puzzle className="size-4"/>Uygulama Kataloğu</Button><Button variant={tab==='categories'?'primary':'outline'} onClick={()=>setTab('categories')}><Grid2X2 className="size-4"/>Uygulama Kategorileri</Button></div>
      {tab==='categories'?<CategoryEditor key={categories.map(x=>x.id).join('|')} categories={categories} locales={locales} request={request} onSaved={async()=>{await load();setSuccess('Uygulama kategorileri kaydedildi.')}}/>:<>
        <Card><CardContent className="grid gap-3 p-5 lg:grid-cols-[1fr_210px_200px]">
          <div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Uygulama, kod, sağlayıcı ara"/></div>
          <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Kategori"/></SelectTrigger><SelectContent><SelectItem value="ALL">Tüm kategoriler</SelectItem>{categories.map(c=><SelectItem key={c.id} value={c.id}>{categoryTitle(c.id,categories,locales)}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Tüm durumlar</SelectItem><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="INACTIVE">Pasif</SelectItem><SelectItem value="FEATURED">Öne Çıkan</SelectItem></SelectContent></Select>
        </CardContent></Card>
        <Card><CardHeader><CardHeading>Uygulama Listesi</CardHeading></CardHeader><CardContent className="overflow-x-auto p-0">
          {loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin"/></div>:<Table><TableHeader><TableRow><TableHead>Uygulama</TableHead><TableHead>Kategori</TableHead><TableHead>Fiyatlandırma</TableHead><TableHead>Kurulum</TableHead><TableHead>Durum</TableHead><TableHead className="text-end">İşlem</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(app=>{const meta=app.settingsSchema?.marketplace||{};return <TableRow key={app.id}>
            <TableCell><div className="flex items-center gap-3">{meta.logoUrl?<img src={meta.logoUrl} alt="" className="size-12 shrink-0 rounded-lg border object-contain"/>:<div className="grid size-12 shrink-0 place-items-center rounded-lg border bg-muted"><Puzzle className="size-5 text-muted-foreground"/></div>}<div><div className="flex flex-wrap items-center gap-1 font-medium">{appTitle(app,locales)}{app.isFeatured?<Badge appearance="light" variant="primary">Öne Çıkan</Badge>:null}</div><div className="text-xs text-muted-foreground">{app.slug} · {app.developer||'Ticarti'}</div></div></div></TableCell>
            <TableCell>{categoryTitle(meta.categoryId||app.category,categories,locales)}</TableCell>
            <TableCell><div>{app.billingType==='FREE'?'Ücretsiz':money(app.basePrice,app.currency)}</div><div className="text-xs text-muted-foreground">{(app.planPrices||[]).filter(x=>x.isActive!==false).length} paket kuralı</div></TableCell>
            <TableCell>{app._count?.installs||0}</TableCell>
            <TableCell><Badge appearance="light" variant={app.isActive?'success':'secondary'}>{app.isActive?'Aktif':'Pasif'}</Badge></TableCell>
            <TableCell className="text-end"><Button size="sm" variant="outline" onClick={()=>setEditing(app)}><Settings2 className="size-4"/>Düzenle</Button></TableCell>
          </TableRow>})}{!filtered.length?<TableRow><TableCell colSpan={6}><div className="py-12 text-center text-sm text-muted-foreground">Uygulama bulunamadı.</div></TableCell></TableRow>:null}</TableBody></Table>}
        </CardContent></Card>
      </>}
    </Container>
    {editing!==null&&data?<AppEditor key={'app-'+('id' in editing?editing.id:'new')} initial={editing as Partial<AppRow>} workspace={data} request={request} onClose={()=>setEditing(null)} onSaved={async()=>{setEditing(null);await load();setSuccess('Uygulama bilgileri ve fiyatlandırma kaydedildi.')}}/>:null}
  </>;
}

function AppEditor({initial,workspace,request,onClose,onSaved}:{initial:Partial<AppRow>;workspace:Workspace;request:(path:string,init?:RequestInit)=>Promise<any>;onClose:()=>void;onSaved:()=>Promise<void>}){
  const meta=initial.settingsSchema?.marketplace||{};
  const defLocale=workspace.locales.find(x=>x.isDefault)?.locale||workspace.locales[0]?.locale||'tr';
  const [form,setForm]=useState<any>({
    slug:initial.slug||'',name:initial.name||'',summary:initial.summary||'',description:initial.description||'',categoryId:meta.categoryId||initial.category||'',developer:initial.developer||'Ticarti',provider:initial.provider||'',kind:initial.kind||'INTEGRATION',integrationType:initial.integrationType||'',icon:initial.icon||'',
    isActive:initial.isActive!==false,isFeatured:!!initial.isFeatured,sortOrder:Number(initial.sortOrder||0),basePrice:Number(initial.basePrice||0),currency:initial.currency||'TRY',billingType:initial.billingType||'FREE',
    logoUrl:meta.logoUrl||'',screenshots:Array.isArray(meta.screenshots)?meta.screenshots:[],usageGuide:meta.usageGuide||'',translations:meta.translations||{[defLocale]:{name:initial.name||'',summary:initial.summary||'',description:initial.description||''}},
  });
  const [schema,setSchema]=useState(JSON.stringify(initial.settingsSchema||{},null,2));
  const [pricing,setPricing]=useState<PriceRow[]>((initial.planPrices||[]).map(x=>({planId:x.planId,enabled:x.isActive!==false,included:!!x.included,price:x.price===null?null:Number(x.price),currency:x.currency||initial.currency||'TRY',billingType:x.billingType||null,trialDays:Number(meta.planTrials?.[x.planId]||0)})));
  const [pane,setPane]=useState<'general'|'content'|'prices'|'tech'>('general');
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const patch=(key:string,value:any)=>setForm((x:any)=>({...x,[key]:value}));
  const name=localeText(form.translations,workspace.locales,'name',form.name).trim();
  const save=async()=>{
    if(!name||!form.slug.trim()){setError('Uygulama adı ve slug zorunludur.');return}
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)){setError('Slug yalnızca küçük harf, rakam ve tire içerebilir.');return}
    let settingsSchema:any;
    try{settingsSchema=JSON.parse(schema);if(!settingsSchema||typeof settingsSchema!=='object'||Array.isArray(settingsSchema))throw Error()}catch{setError('Teknik ayarlar JSON nesnesi olmalıdır.');setPane('tech');return}
    setSaving(true);setError('');
    try{
      const payload={...form,settingsSchema,name,summary:localeText(form.translations,workspace.locales,'summary',form.summary),description:localeText(form.translations,workspace.locales,'description',form.description),category:form.categoryId||'Diğer',integrationType:form.integrationType||null};
      const updated=initial.id?await request('/superadmin/apps/'+initial.id,{method:'PATCH',body:JSON.stringify(payload)}):await request('/superadmin/apps',{method:'POST',body:JSON.stringify(payload)});
      const id=initial.id||updated.id;
      for(const row of pricing){await request('/superadmin/apps/'+id+'/plan-pricing',{method:'POST',body:JSON.stringify({planId:row.planId,isActive:row.enabled,included:row.included,price:row.price,currency:row.currency,billingType:row.billingType,trialDays:row.trialDays||0})})}
      await onSaved();
    }catch(e){setError(errorText(e))}
    finally{setSaving(false)}
  };
  return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="sm:max-w-6xl"><DialogHeader><DialogTitle>{initial.id?'Uygulamayı Düzenle':'Yeni Uygulama'} · {name||'Yeni kayıt'}</DialogTitle></DialogHeader>
    <DialogBody className="max-h-[75vh] overflow-y-auto">
      {error?<p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      <div className="mb-5 flex flex-wrap gap-2 border-b pb-3">{[['general','Temel Bilgiler'],['content','Çok Dilli İçerik & Medya'],['prices','Paket ve Fiyatlandırma'],['tech','Teknik Tanımlar']].map(([id,label])=><Button key={id} size="sm" variant={pane===id?'primary':'outline'} onClick={()=>setPane(id as any)}>{label}</Button>)}</div>
      {pane==='general'?<div className="grid gap-4 md:grid-cols-2">
        <Field label="Uygulama kodu / slug"><Input value={form.slug} disabled={!!initial.id} placeholder="ticarti-app" onChange={e=>patch('slug',e.target.value.toLowerCase())}/></Field>
        <Field label="Görünen ad"><Input value={form.name} onChange={e=>patch('name',e.target.value)}/></Field>
        <Field label="Kategori"><Select value={form.categoryId||'NONE'} onValueChange={v=>patch('categoryId',v==='NONE'?'':v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NONE">Kategorisiz</SelectItem>{workspace.categories.filter(x=>x.isActive).map(c=><SelectItem key={c.id} value={c.id}>{categoryTitle(c.id,workspace.categories,workspace.locales)}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Geliştirici"><Input value={form.developer} onChange={e=>patch('developer',e.target.value)}/></Field>
        <Field label="Sağlayıcı"><Input value={form.provider} onChange={e=>patch('provider',e.target.value)}/></Field>
        <Field label="Tür"><Input value={form.kind} onChange={e=>patch('kind',e.target.value)} placeholder="INTEGRATION"/></Field>
        <Field label="Entegrasyon türü"><Select value={form.integrationType||'NONE'} onValueChange={v=>patch('integrationType',v==='NONE'?'':v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NONE">Bağımsız uygulama</SelectItem>{INTEGRATIONS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Listeleme sırası"><Input type="number" value={form.sortOrder} onChange={e=>patch('sortOrder',Number(e.target.value)||0)}/></Field>
        <Field label="Temel fiyat"><Input type="number" min={0} step=".01" value={form.basePrice} onChange={e=>patch('basePrice',Number(e.target.value)||0)}/></Field>
        <Field label="Ödeme periyodu"><Select value={form.billingType} onValueChange={v=>patch('billingType',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{BILLING.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Para birimi"><Select value={form.currency} onValueChange={v=>patch('currency',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{workspace.currencies.map(c=><SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Uygulama ikonu"><Input value={form.icon} placeholder="iconoir:puzzle veya görsel URL" onChange={e=>patch('icon',e.target.value)}/></Field>
        <label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={v=>patch('isActive',v)}/>Aktif / uygulama marketinde yayınla</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={form.isFeatured} onCheckedChange={v=>patch('isFeatured',v)}/>Öne çıkan uygulama</label>
      </div>:null}
      {pane==='content'?<div className="grid gap-5"><TranslationFields locales={workspace.locales} value={form.translations} onChange={v=>patch('translations',v)} fields={['name','summary','description','usageGuide']}/><MediaField label="Uygulama logosu" value={form.logoUrl} onChange={v=>patch('logoUrl',v)}/><MediaField label="Uygulama ekran görüntüleri" value={form.screenshots} multiple onChange={v=>patch('screenshots',v)}/></div>:null}
      {pane==='prices'?<><p className="mb-4 text-sm text-muted-foreground">Her paketin erişim yetkisini, dahil/ek ücretli durumunu, ücret periyodunu ve deneme süresini ayrı belirleyin. Var olan kurallar korunur.</p><PriceMatrix plans={workspace.plans} currencies={workspace.currencies} value={pricing} onChange={setPricing} allowTrials allowBilling/></>:null}
      {pane==='tech'?<div className="grid gap-3"><p className="text-sm text-muted-foreground">Uygulamanın mevcut manifest, izinler, webhook ve ayar şemasını kırpmadan JSON olarak düzenleyebilirsiniz. Market açıklamaları ayrıca kayıt sırasında birleştirilir.</p><Field label="settingsSchema JSON"><Textarea rows={18} value={schema} onChange={e=>setSchema(e.target.value)} className="font-mono text-xs"/></Field></div>:null}
    </DialogBody><DialogFooter><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button onClick={()=>void save()} disabled={saving}>{saving?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function CategoryEditor({categories,locales,request,onSaved}:{categories:Category[];locales:Locale[];request:(p:string,init?:RequestInit)=>Promise<any>;onSaved:()=>Promise<void>}){
  const [rows,setRows]=useState<Category[]>(categories);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const patch=(i:number,p:Partial<Category>)=>setRows(all=>all.map((r,j)=>i===j?{...r,...p}:r));
  const add=()=>{const id='category-'+Date.now();const lang=locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'tr';setRows(all=>[...all,{id,translations:{[lang]:{name:'Yeni Kategori',description:''}},isActive:true,sortOrder:all.length}])};
  const save=async()=>{
    if(rows.some(x=>!x.id.trim())||new Set(rows.map(x=>x.id)).size!==rows.length){setError('Kategori kodları boş veya tekrar eden değer içeremez.');return}
    setBusy(true);setError('');
    try{await request('/superadmin/app-categories',{method:'PATCH',body:JSON.stringify({categories:rows})});await onSaved()}catch(e){setError(errorText(e))}finally{setBusy(false)}
  };
  return <Card><CardHeader><div className="flex flex-wrap justify-between gap-3"><div><CardHeading>Uygulama Kategorileri</CardHeading><p className="mt-1 text-sm text-muted-foreground">Çok dilli kategori başlığı, açıklaması, görünürlük ve sıralama.</p></div><div className="flex gap-2"><Button variant="outline" onClick={add}><Plus className="size-4"/>Kategori ekle</Button><Button disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:null}Kategorileri kaydet</Button></div></div></CardHeader>
    <CardContent className="grid gap-4">{error?<p className="text-sm text-destructive">{error}</p>:null}{rows.map((x,i)=><div key={i} className="rounded-lg border p-4">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 grow"><Field label="Kategori kodu"><Input value={x.id} onChange={e=>patch(i,{id:e.target.value})}/></Field></div>
        <div className="w-28"><Field label="Sıra"><Input type="number" value={x.sortOrder} onChange={e=>patch(i,{sortOrder:Number(e.target.value)||0})}/></Field></div>
        <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={x.isActive} onCheckedChange={isActive=>patch(i,{isActive})}/>Aktif</label>
        <Button variant="outline" size="icon" onClick={()=>setRows(all=>all.filter((_,j)=>j!==i))}><Trash2 className="size-4"/></Button>
      </div><TranslationFields locales={locales} value={x.translations||{}} onChange={translations=>patch(i,{translations})} fields={['name','description']}/>
    </div>)}{!rows.length?<p className="text-sm text-muted-foreground">Henüz kategori yok.</p>:null}</CardContent>
  </Card>;
}
