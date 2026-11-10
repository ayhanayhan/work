'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes, LoaderCircle, PackageSearch, Plus, Save, Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useMasterSession } from '@/app/components/MasterSession';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';

type Locale={locale:string;label:string;flag?:string;isDefault?:boolean};
type Category={id:string;code:string;isActive:boolean;sortOrder:number;translations:Record<string,{title?:string;description?:string}>};
type Feature={id:string;code:string;categoryId:string;valueType:'BOOLEAN'|'TEXT'|'NUMBER';isActive:boolean;isPageEnabled:boolean;sortOrder:number;imageUrl?:string;translations:Record<string,any>};
type Plan={id:string;name:string;code:string;description?:string;monthlyPrice:any;yearlyPrice:any;currency:string;trialDays:number;maxStaff:number;maxProducts:number;maxOrdersPerMonth:number|null;features:any;isActive:boolean;sortOrder:number};
type Workspace={plans:Plan[];categories:Category[];features:Feature[];locales:Locale[];currencies:Array<{code:string;name?:string;symbol?:string;isDefault?:boolean}>};

function money(value:any,currency='TRY'){try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency,maximumFractionDigits:0}).format(Number(value||0))}catch{return String(value||0)+' '+currency}}
function display(t:any,locales:Locale[],key:string,fallback=''){for(const l of locales){const v=t?.[l.locale]?.[key];if(v)return String(v)}return fallback}

function useWorkspace(){
  const{request,restoring}=useMasterSession();
  const[data,setData]=useState<Workspace|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const load=async()=>{if(restoring)return;setLoading(true);setError('');try{setData(await request('/superadmin/plan-workspace'))}catch(e:any){setError(e.message||'Paketler alınamadı.')}finally{setLoading(false)}};
  useEffect(()=>{void load()},[restoring]);
  return{data,setData,loading,error,load,request};
}

export function PackagesListPage(){
  const w=useWorkspace();
  const[q,setQ]=useState('');
  const[status,setStatus]=useState('ALL');
  const[seeding,setSeeding]=useState(false);
  const[seedMessage,setSeedMessage]=useState('');
  const seedIntegrations=async()=>{setSeeding(true);setSeedMessage('');try{const result=await w.request('/superadmin/plan-feature-catalog/seed-integrations',{method:'POST',body:'{}'});setSeedMessage('Katalog hazır: '+(result.legacyFeaturesAdded||0)+' tema özelliği, '+(result.integrationsAdded||0)+' entegrasyon sağlayıcısı ve '+result.assigned+' paket eşleştirmesi. Mevcut ayarlar korundu.');await w.load();}catch(e:any){setSeedMessage(e.message||'Entegrasyonlar eklenemedi.')}finally{setSeeding(false)}};
  const rows=useMemo(()=>{const all=w.data?.plans||[];const needle=q.trim().toLocaleLowerCase('tr');return all.filter(p=>(status==='ALL'||(status==='ACTIVE'?p.isActive:!p.isActive))&&(!needle||p.name.toLocaleLowerCase('tr').includes(needle)||p.code.toLocaleLowerCase('tr').includes(needle)))},[w.data,q,status]);
  const active=(w.data?.plans||[]).filter(x=>x.isActive).length;
  const featured=(w.data?.plans||[]).filter(x=>x.features?._meta?.isFeatured).length;
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Paketler</h1><ToolbarDescription>Paketleri, limitleri, yıllık fiyatları ve paket özelliklerini yönetin.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" onClick={()=>void seedIntegrations()} disabled={seeding}>{seeding?<LoaderCircle className="animate-spin"/>:<Sparkles/>}Entegrasyonları Ekle</Button><Button variant="outline" asChild><Link href="/website/pricing">Paket SSS</Link></Button><Button variant="outline" asChild><Link href="/products/features"><Sparkles/>Paket Özellikleri</Link></Button><Button asChild><Link href="/products/new"><Plus/>Yeni Paket</Link></Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">{seedMessage?<div className="rounded-lg border bg-muted/20 p-3 text-sm" role="status">{seedMessage}</div>:null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm text-muted-foreground">Toplam Paket</div><div className="mt-2 text-2xl font-semibold">{w.data?.plans.length||0}</div></div><Boxes className="size-5 text-muted-foreground"/></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm text-muted-foreground">Aktif</div><div className="mt-2 text-2xl font-semibold">{active}</div></div><PackageSearch className="size-5 text-muted-foreground"/></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm text-muted-foreground">Öne Çıkan</div><div className="mt-2 text-2xl font-semibold">{featured}</div></div><Sparkles className="size-5 text-muted-foreground"/></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm text-muted-foreground">Özellik Tanımı</div><div className="mt-2 text-2xl font-semibold">{w.data?.features.length||0}</div></div><Sparkles className="size-5 text-muted-foreground"/></CardContent></Card>
      </div>
      <Card><CardContent className="p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px]"><div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={q} onChange={e=>setQ(e.target.value)} placeholder="Paket adı veya kod ara"/></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Tüm durumlar</SelectItem><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="PASSIVE">Pasif</SelectItem></SelectContent></Select></div>
        {w.error?<div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{w.error}</div>:null}
        {w.loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin"/></div>:<div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Paket</TableHead><TableHead>Yıllık Fiyat</TableHead><TableHead>Deneme</TableHead><TableHead>Özellik</TableHead><TableHead>Ürün Limiti</TableHead><TableHead>Durum</TableHead><TableHead className="text-end">İşlem</TableHead></TableRow></TableHeader><TableBody>{rows.map(p=><TableRow key={p.id}><TableCell><div className="flex items-center gap-3"><div className="grid size-11 place-items-center overflow-hidden rounded-lg border bg-muted">{p.features?._meta?.imageUrl?<img src={p.features._meta.imageUrl} className="h-full w-full object-cover" alt=""/>:<Boxes className="size-5 text-muted-foreground"/>}</div><div><div className="flex items-center gap-2 font-medium">{display(p.features?._translations||{},w.data?.locales||[],'name',p.name)}{display(p.features?._translations||{},w.data?.locales||[],'badge',p.features?._meta?.badge||'')?<Badge appearance="light" variant="primary">{display(p.features?._translations||{},w.data?.locales||[],'badge',p.features?._meta?.badge||'')}</Badge>:null}</div><div className="text-xs text-muted-foreground">{p.code}</div></div></div></TableCell><TableCell>{money(p.yearlyPrice,p.currency)}</TableCell><TableCell>{p.trialDays||0} gün</TableCell><TableCell>{Array.isArray(p.features?._catalog)?p.features._catalog.filter((x:any)=>x.enabled!==false).length:0}</TableCell><TableCell>{p.maxProducts>=999999?'Sınırsız':Number(p.maxProducts||0).toLocaleString('tr-TR')}</TableCell><TableCell><Badge appearance="light" variant={p.isActive?'success':'secondary'}>{p.isActive?'Aktif':'Pasif'}</Badge></TableCell><TableCell className="text-end"><Button size="sm" variant="outline" asChild><Link href={'/products/'+p.id+'/edit'}>Düzenle</Link></Button></TableCell></TableRow>)}</TableBody></Table>{!rows.length?<div className="py-10 text-center text-sm text-muted-foreground">Paket bulunamadı.</div>:null}</div>}
      </CardContent></Card>
    </Container>
  </>;
}

export function PackageEditorPage({planId}:{planId?:string}){
  const router=useRouter();const w=useWorkspace();
  const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  const[activeLocale,setActiveLocale]=useState('');
  const[form,setForm]=useState<any>(null);

  useEffect(()=>{if(!w.data||form)return;const plan=planId?w.data.plans.find(x=>x.id===planId):null;const locales=w.data.locales;const def=locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'tr';const trans:any={};for(const l of locales){const saved=plan?.features?._translations?.[l.locale]||{};trans[l.locale]={name:saved.name||(l.locale===def?plan?.name||'':''),description:saved.description||(l.locale===def?plan?.description||'':''),badge:saved.badge||'',priceSubtext:saved.priceSubtext||'',campaignText:saved.campaignText||'',buttonText:saved.buttonText||'Ücretsiz dene',cardFeatures:saved.cardFeatures||''}}const selections=(plan?.features?._catalog||[]).map((x:any)=>({...x}));setActiveLocale(def);const savedPricing=Array.isArray(plan?.features?._pricing)?plan.features._pricing:null;const pricingPeriods=savedPricing?savedPricing.map((x:any)=>({...x})):[{period:'MONTHLY',label:'Aylık',enabled:Number(plan?.monthlyPrice||0)>0,price:plan?.monthlyPrice??0,salePrice:'',saleStartAt:'',saleEndAt:''},{period:'YEARLY',label:'Yıllık',enabled:plan?Number(plan?.yearlyPrice||0)>0:true,price:plan?.yearlyPrice??'',salePrice:'',saleStartAt:'',saleEndAt:''}];setForm({name:plan?.name||'',code:plan?.code||'',description:plan?.description||'',currency:plan?.currency||w.data.currencies.find(x=>x.isDefault)?.code||w.data.currencies[0]?.code||'TRY',trialDays:plan?.trialDays??14,maxStaff:plan?.maxStaff??3,maxProducts:plan?.maxProducts??1000,maxOrdersPerMonth:plan?.maxOrdersPerMonth??'',isActive:plan?.isActive!==false,sortOrder:plan?.sortOrder??0,imageUrl:plan?.features?._meta?.imageUrl||'',frontendVisible:plan?.features?._meta?.frontendVisible!==false,isFeatured:!!plan?.features?._meta?.isFeatured,vatIncluded:plan?.features?._meta?.vatIncluded!==false,translations:trans,featureSelections:selections,pricingPeriods})},[w.data,planId,form]);
  if(w.loading||!form)return <div className="grid min-h-[65vh] place-items-center"><LoaderCircle className="animate-spin"/></div>;
  if(!w.data)return <div className="p-6 text-destructive">{w.error||'Paket bilgileri alınamadı.'}</div>;
  const locales=w.data.locales;const def=locales.find(x=>x.isDefault)?.locale||locales[0]?.locale||'tr';
  const selectedMap = new Map<string, { value?: string }>(
    (form.featureSelections || []).map(
      (x: any): [string, { value?: string }] => [String(x.featureId), x]
    )
  );
  const patch=(k:string,v:any)=>setForm((x:any)=>({...x,[k]:v}));
  const patchTranslation=(locale:string,k:string,v:string)=>setForm((x:any)=>({...x,translations:{...x.translations,[locale]:{...(x.translations?.[locale]||{}),[k]:v}}}));
  const toggleFeature=(feature:Feature,enabled:boolean)=>{const rows=(form.featureSelections||[]).filter((x:any)=>String(x.featureId)!==feature.id);if(enabled)rows.push({featureId:feature.id,code:feature.code,enabled:true,value:''});patch('featureSelections',rows)};
  const featureValue=(id:string)=>selectedMap.get(id)?.value||'';
  const setFeatureValue=(feature:Feature,value:string)=>patch('featureSelections',(form.featureSelections||[]).map((x:any)=>String(x.featureId)===feature.id?{...x,code:feature.code,value}:x));
  const save=async()=>{const base=form.translations?.[def]||{};if(!base.name.trim()){setError('Varsayılan dilde paket adı zorunludur.');return}if(!form.code.trim()){setError('Paket kodu zorunludur.');return}setBusy(true);setError('');try{const payload={...form,name:base.name.trim(),description:base.description||'',trialDays:Number(form.trialDays||0),maxStaff:Number(form.maxStaff||1),maxProducts:Number(form.maxProducts||1),maxOrdersPerMonth:form.maxOrdersPerMonth===''?null:Number(form.maxOrdersPerMonth),sortOrder:Number(form.sortOrder||0),pricingPeriods:(form.pricingPeriods||[]).map((x:any)=>({...x,price:Number(x.price||0),salePrice:x.salePrice===''||x.salePrice===null?null:Number(x.salePrice)})),featureSelections:(form.featureSelections||[]).map((x:any)=>({...x,enabled:true}))};await w.request(planId?'/superadmin/plans/'+planId:'/superadmin/plans',{method:planId?'PATCH':'POST',body:JSON.stringify(payload)});router.push('/products')}catch(e:any){setError(e.message||'Paket kaydedilemedi.')}finally{setBusy(false)}};

  return <Container><div className="mx-auto w-full max-w-[1320px]">
    <div className="sticky top-0 z-30 -mx-1 mb-5 flex flex-wrap items-center justify-between gap-5 border-b bg-background/95 px-1 pb-5 pt-1 backdrop-blur"><div><h1 className="text-xl font-semibold text-mono">{planId?'Paket Düzenle':'Yeni Paket'}</h1><div className="mt-1 text-sm text-muted-foreground">Yıllık fiyat, limitler, çok dilli paket adı ve özellik eşleştirmeleri</div></div><div className="flex gap-2"><Button variant="outline" onClick={()=>router.push('/products')}><ArrowLeft/>Paketlere Dön</Button><Button onClick={()=>void save()} disabled={busy}>{busy?<LoaderCircle className="animate-spin"/>:<Save/>}Kaydet</Button></div></div>
    {error?<div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
    <div className="grid gap-5">
      <Card><CardHeader><CardHeading>Genel Bilgiler</CardHeading></CardHeader><CardContent className="grid gap-5">
        <Tabs value={activeLocale} onValueChange={setActiveLocale}><TabsList>{locales.map(l=><TabsTrigger key={l.locale} value={l.locale}>{l.flag?l.flag+' ':''}{l.label}</TabsTrigger>)}</TabsList>{locales.map(l=><TabsContent key={l.locale} value={l.locale} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2"><span className="text-sm font-medium">Paket adı</span><Input value={form.translations?.[l.locale]?.name||''} onChange={e=>patchTranslation(l.locale,'name',e.target.value)}/></label><label className="grid gap-2"><span className="text-sm font-medium">Rozet</span><Input value={form.translations?.[l.locale]?.badge||''} placeholder="En çok tercih edilen" onChange={e=>patchTranslation(l.locale,'badge',e.target.value)}/></label></div>
          <label className="grid gap-2"><span className="text-sm font-medium">Kısa açıklama</span><Textarea rows={2} value={form.translations?.[l.locale]?.description||''} onChange={e=>patchTranslation(l.locale,'description',e.target.value)}/></label>
          <div className="grid gap-4 md:grid-cols-3"><label className="grid gap-2"><span className="text-sm font-medium">Fiyat alt metni</span><Input value={form.translations?.[l.locale]?.priceSubtext||''} placeholder="KDV dahil fiyat" onChange={e=>patchTranslation(l.locale,'priceSubtext',e.target.value)}/></label><label className="grid gap-2"><span className="text-sm font-medium">Kampanya metni</span><Input value={form.translations?.[l.locale]?.campaignText||''} placeholder="Lansmana özel %50 indirim" onChange={e=>patchTranslation(l.locale,'campaignText',e.target.value)}/></label><label className="grid gap-2"><span className="text-sm font-medium">Buton metni</span><Input value={form.translations?.[l.locale]?.buttonText||''} placeholder="Ücretsiz dene" onChange={e=>patchTranslation(l.locale,'buttonText',e.target.value)}/></label></div>
          <label className="grid gap-2"><span className="text-sm font-medium">Kart özellikleri</span><Textarea rows={4} value={form.translations?.[l.locale]?.cardFeatures||''} placeholder={"Her satıra bir özellik\n14 gün ücretsiz\n7/24 destek"} onChange={e=>patchTranslation(l.locale,'cardFeatures',e.target.value)}/><span className="text-xs text-muted-foreground">Paket kartında gösterilecek kısa maddeler. Paket yetkileri aşağıdaki Paket Özellikleri alanından yönetilir.</span></label>
        </TabsContent>)}</Tabs>
        <div className="grid gap-4 md:grid-cols-3"><label className="grid gap-2"><span className="text-sm font-medium">Paket kodu</span><Input value={form.code} disabled={!!planId} onChange={e=>patch('code',e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,'_'))}/></label><label className="grid gap-2"><span className="text-sm font-medium">Durum</span><Select value={form.isActive?'ACTIVE':'PASSIVE'} onValueChange={v=>patch('isActive',v==='ACTIVE')}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="PASSIVE">Pasif</SelectItem></SelectContent></Select></label><label className="grid gap-2"><span className="text-sm font-medium">Sıra</span><Input type="number" value={form.sortOrder} onChange={e=>patch('sortOrder',e.target.value)}/></label></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2"><span className="text-sm font-medium">Para birimi</span><Select value={form.currency} onValueChange={v=>patch('currency',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{w.data.currencies.map(x=><SelectItem key={x.code} value={x.code}>{x.name||x.code} · {x.code}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-2"><span className="text-sm font-medium">Deneme süresi</span><Input type="number" min="0" value={form.trialDays} onChange={e=>patch('trialDays',e.target.value)}/></label></div>
        <div className="grid gap-3">
          <div><div className="font-medium">Fiyatlandırma Periyotları</div><div className="mt-1 text-sm text-muted-foreground">Satışa açmak istediğiniz periyotları etkinleştirin. Her periyot için ayrı normal ve kampanya fiyatı tanımlanabilir.</div></div>
          {(form.pricingPeriods||[]).map((row:any,index:number)=><div key={row.period} className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between gap-4"><div><div className="font-medium">{row.period==='MONTHLY'?'Aylık':'Yıllık'}</div><div className="text-xs text-muted-foreground">{row.period}</div></div><Switch checked={row.enabled===true} onCheckedChange={enabled=>patch('pricingPeriods',form.pricingPeriods.map((x:any,i:number)=>i===index?{...x,enabled}:x))}/></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2"><span className="text-sm font-medium">Normal fiyat</span><Input type="number" min="0" value={row.price??''} disabled={!row.enabled} onChange={e=>patch('pricingPeriods',form.pricingPeriods.map((x:any,i:number)=>i===index?{...x,price:e.target.value}:x))}/></label>
              <label className="grid gap-2"><span className="text-sm font-medium">İndirimli fiyat</span><Input type="number" min="0" value={row.salePrice??''} disabled={!row.enabled} placeholder="Opsiyonel" onChange={e=>patch('pricingPeriods',form.pricingPeriods.map((x:any,i:number)=>i===index?{...x,salePrice:e.target.value}:x))}/></label>
              <label className="grid gap-2"><span className="text-sm font-medium">İndirim başlangıcı</span><Input type="datetime-local" value={row.saleStartAt||''} disabled={!row.enabled||row.salePrice===''||row.salePrice===null} onChange={e=>patch('pricingPeriods',form.pricingPeriods.map((x:any,i:number)=>i===index?{...x,saleStartAt:e.target.value}:x))}/></label>
              <label className="grid gap-2"><span className="text-sm font-medium">İndirim bitişi</span><Input type="datetime-local" value={row.saleEndAt||''} disabled={!row.enabled||row.salePrice===''||row.salePrice===null} onChange={e=>patch('pricingPeriods',form.pricingPeriods.map((x:any,i:number)=>i===index?{...x,saleEndAt:e.target.value}:x))}/></label>
            </div>
            {row.enabled&&row.salePrice!==''&&row.salePrice!==null?<div className="mt-3 text-xs text-muted-foreground">Kampanya fiyatı yalnızca belirlediğiniz tarih aralığında geçerli olur. Tarih girmezseniz indirim süresiz uygulanır.</div>:null}
          </div>)}
        </div>
        <div className="grid gap-4 md:grid-cols-3"><label className="grid gap-2"><span className="text-sm font-medium">Personel limiti</span><Input type="number" min="1" value={form.maxStaff} onChange={e=>patch('maxStaff',e.target.value)}/></label><label className="grid gap-2"><span className="text-sm font-medium">Ürün limiti</span><Input type="number" min="1" value={form.maxProducts} onChange={e=>patch('maxProducts',e.target.value)}/></label><label className="grid gap-2"><span className="text-sm font-medium">Aylık sipariş limiti</span><Input type="number" min="1" value={form.maxOrdersPerMonth} placeholder="Boş = sınırsız" onChange={e=>patch('maxOrdersPerMonth',e.target.value)}/></label></div>
        <label className="grid gap-2"><span className="text-sm font-medium">Paket görseli URL</span><Input value={form.imageUrl} placeholder="https://..." onChange={e=>patch('imageUrl',e.target.value)}/></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border p-4"><span><span className="font-medium">Frontend'de göster</span><span className="mt-1 block text-sm text-muted-foreground">Kayıt ekranı ve paketler sayfasında paketi gösterir.</span></span><Switch checked={form.frontendVisible} onCheckedChange={v=>patch('frontendVisible',v)}/></label>
          <label className="flex items-center justify-between rounded-lg border p-4"><span><span className="font-medium">En çok tercih edilen</span><span className="mt-1 block text-sm text-muted-foreground">Paket kartını öne çıkan paket olarak vurgular.</span></span><Switch checked={form.isFeatured} onCheckedChange={v=>patch('isFeatured',v)}/></label>
          <label className="flex items-center justify-between rounded-lg border p-4"><span><span className="font-medium">KDV dahil fiyat</span><span className="mt-1 block text-sm text-muted-foreground">Frontend fiyat bilgisinde KDV dahil ibaresini kullanır.</span></span><Switch checked={form.vatIncluded} onCheckedChange={v=>patch('vatIncluded',v)}/></label>
          <div className="rounded-lg border p-4"><span className="font-medium">Satış periyodu</span><span className="mt-1 block text-sm text-muted-foreground">Aktif fiyat periyotlarından otomatik belirlenir. Yalnız yıllık aktifse paket sadece yıllık satılır.</span></div>
        </div>
      </CardContent></Card>

      <Card><CardHeader><CardHeading>Paket Özellikleri</CardHeading><p className="mt-1 text-sm text-muted-foreground">Paketin kategorisi yoktur. Özellikler kendi kategorileri altında gruplanır; paket için yalnızca özellik seçilir ve gerekirse paket özel değeri girilir.</p></CardHeader><CardContent className="grid gap-5">
        {w.data.categories.filter(c=>c.isActive!==false).sort((a,b)=>a.sortOrder-b.sortOrder).map(cat=>{const features=w.data!.features.filter(f=>f.categoryId===cat.id&&f.isActive!==false).sort((a,b)=>a.sortOrder-b.sortOrder);if(!features.length)return null;return <div key={cat.id} className="grid gap-3"><div><h3 className="font-semibold">{display(cat.translations,locales,'title',cat.code)}</h3><p className="text-sm text-muted-foreground">{display(cat.translations,locales,'description','')}</p></div><div className="grid gap-3">{features.map(feature=>{const selected=selectedMap.has(feature.id);return <div key={feature.id} className={'grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_320px] lg:items-center '+(selected?'bg-muted/20':'')}><label className="flex cursor-pointer items-start gap-3"><input className="mt-1" type="checkbox" checked={selected} onChange={e=>toggleFeature(feature,e.target.checked)}/><span><span className="font-medium">{display(feature.translations,locales,'title',feature.code)}</span><span className="mt-1 block text-xs text-muted-foreground">{display(feature.translations,locales,'subtitle','')}</span></span></label>{selected?<Input value={featureValue(feature.id)} onChange={e=>setFeatureValue(feature,e.target.value)} placeholder={feature.valueType==='NUMBER'?'Örn. 10000':'Örn. Sınırsız / 7/24 / İlk 3 ay ücretsiz'}/>:null}</div>})}</div></div>})}
        <div><Button variant="outline" asChild><Link href="/products/features"><Sparkles/>Özellik kataloğunu yönet</Link></Button></div>
      </CardContent></Card>
    </div>
  </div></Container>;
}
