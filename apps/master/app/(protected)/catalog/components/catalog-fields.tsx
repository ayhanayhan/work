'use client';
import {ChangeEvent,useEffect,useState} from 'react';
import {Check,ImagePlus,LoaderCircle,Plus,Trash2,Upload} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {useMasterSession} from '@/app/components/MasterSession';

export type Locale={locale:string;label:string;flag?:string;isDefault?:boolean};
export type Currency={code:string;name?:string;symbol?:string;isDefault?:boolean};
export type Plan={id:string;name:string;code:string};
export type Translations=Record<string,Record<string,string>>;
export type PriceRow={planId:string;enabled:boolean;included:boolean;price:number|null;currency:string;billingType?:string|null;trialDays?:number};

export function localeText(data:Translations|undefined,locales:Locale[],key:string,fallback=''):string{
  for(const lang of [...locales.filter(x=>x.isDefault),...locales]){const v=data?.[lang.locale]?.[key];if(v?.trim())return v}
  return fallback;
}
export function Field({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}){
  return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span>{children}{hint?<span className="text-xs text-muted-foreground">{hint}</span>:null}</label>;
}
export function TranslationFields({value,onChange,locales,fields=['name','summary','description'],hint}:{value:Translations;onChange:(v:Translations)=>void;locales:Locale[];fields?:string[];hint?:string}){
  const langs=locales.length?locales:[{locale:'tr',label:'Türkçe',isDefault:true}];
  const [active,setActive]=useState(langs.find(x=>x.isDefault)?.locale||langs[0].locale);
  useEffect(()=>{if(!langs.some(x=>x.locale===active))setActive(langs.find(x=>x.isDefault)?.locale||langs[0].locale)},[locales,active]);
  const data=value?.[active]||{};
  const patch=(key:string,val:string)=>onChange({...value,[active]:{...data,[key]:val}});
  const labels:Record<string,string>={name:'Başlık / ad',summary:'Kısa açıklama',description:'Açıklama',usageGuide:'Kullanım kılavuzu'};
  return <div className="grid gap-4">
    <div className="flex flex-wrap gap-2 border-b pb-3">{langs.map(lang=><Button key={lang.locale} size="sm" variant={active===lang.locale?'primary':'outline'} onClick={()=>setActive(lang.locale)}>{lang.flag||''} {lang.label||lang.locale}{value?.[lang.locale]?.name?<Check className="size-3"/>:null}</Button>)}</div>
    {hint?<p className="text-xs text-muted-foreground">{hint}</p>:null}
    {fields.map(key=><Field key={key} label={labels[key]||key}>{['description','usageGuide'].includes(key)?<Textarea value={data[key]||''} rows={key==='usageGuide'?6:4} onChange={e=>patch(key,e.target.value)}/>:key==='summary'?<Textarea value={data[key]||''} rows={2} onChange={e=>patch(key,e.target.value)}/>:<Input value={data[key]||''} onChange={e=>patch(key,e.target.value)}/>}</Field>)}
  </div>;
}
export function PriceMatrix({plans,currencies,value,onChange,allowTrials=false,allowBilling=false}:{plans:Plan[];currencies:Currency[];value:PriceRow[];onChange:(next:PriceRow[])=>void;allowTrials?:boolean;allowBilling?:boolean}){
  const def=currencies.find(x=>x.isDefault)?.code||currencies[0]?.code||'TRY';
  const lookup=(id:string)=>value.find(x=>x.planId===id)||{planId:id,enabled:false,included:false,price:null,currency:def,billingType:null,trialDays:0};
  const patch=(id:string,field:keyof PriceRow,v:any)=>{const current=lookup(id);onChange([...value.filter(x=>x.planId!==id),{...current,[field]:v}])};
  return <div className="grid gap-3">
    {plans.length===0?<p className="text-sm text-muted-foreground">Henüz paket tanımlanmamış.</p>:plans.map(p=>{const row=lookup(p.id);return <div key={p.id} className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.code}</div></div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={row.enabled===true} onCheckedChange={enabled=>patch(p.id,'enabled',enabled)}/>Erişim</label>
      </div>
      {row.enabled?<div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-4">
        <Field label="Ücretlendirme"><Select value={row.included?'included':'paid'} onValueChange={v=>patch(p.id,'included',v==='included')}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="included">Pakete dahil</SelectItem><SelectItem value="paid">Ek ücretli</SelectItem></SelectContent></Select></Field>
        {row.included?<div className="flex items-end pb-3"><Badge appearance="light" variant="success">Ücretsiz erişim</Badge></div>:<>
          <Field label="Fiyat"><Input type="number" min={0} step="0.01" value={row.price??''} onChange={e=>patch(p.id,'price',e.target.value===''?null:Number(e.target.value))}/></Field>
          <Field label="Para birimi"><Select value={row.currency||def} onValueChange={v=>patch(p.id,'currency',v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{currencies.map(c=><SelectItem key={c.code} value={c.code}>{c.code} {c.symbol||''}</SelectItem>)}</SelectContent></Select></Field>
        </>}
        {allowTrials?<Field label="Deneme (gün)"><Input type="number" min={0} max={365} value={row.trialDays||0} onChange={e=>patch(p.id,'trialDays',Math.max(0,Math.min(365,Number(e.target.value)||0)))}/></Field>:null}
        {allowBilling?<Field label="Periyot"><Select value={row.billingType||'INHERIT'} onValueChange={v=>patch(p.id,'billingType',v==='INHERIT'?null:v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="INHERIT">Genel ayarı kullan</SelectItem><SelectItem value="FREE">Ücretsiz</SelectItem><SelectItem value="ONE_TIME">Tek seferlik</SelectItem><SelectItem value="MONTHLY">Aylık</SelectItem><SelectItem value="YEARLY">Yıllık</SelectItem></SelectContent></Select></Field>:null}
      </div>:<p className="mt-3 text-xs text-muted-foreground">Bu paketin kullanıcıları erişemez.</p>}
    </div>})}
  </div>;
}
type MediaItem={id:string;publicUrl:string;fileName?:string;originalName?:string};
export function MediaField({label,value,onChange,multiple=false}:{label:string;value:string|string[];onChange:(val:any)=>void;multiple?:boolean}){
  const {request}=useMasterSession();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[rows,setRows]=useState<MediaItem[]>([]),[draft,setDraft]=useState('');
  const urls=multiple?(Array.isArray(value)?value:[]):typeof value==='string'&&value?[value]:[];
  const add=(url:string)=>multiple?onChange([...new Set([...urls,url])]):onChange(url);
  const remove=(url:string)=>multiple?onChange(urls.filter(x=>x!==url)):onChange('');
  const gallery=async()=>{setOpen(true);setError('');try{const r=await request('/superadmin/media');setRows(Array.isArray(r)?r:[])}catch(e:any){setError(e.message||'Medya galerisi alınamadı.')}};
  const upload=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    setBusy(true);setError('');
    try{const form=new FormData();form.append('file',file);const row=await request('/superadmin/media/upload',{method:'POST',body:form});add(row.publicUrl);setRows(prev=>[row,...prev.filter(x=>x.id!==row.id)])}
    catch(e:any){setError(e.message||'Dosya yüklenemedi.')}finally{setBusy(false)}
  };
  return <div className="grid gap-3">
    <div className="text-sm font-medium">{label}</div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={()=>void gallery()}><ImagePlus className="size-4"/>Medya kütüphanesi</Button>
      <Button size="sm" variant="outline" asChild><label className="cursor-pointer">{busy?<LoaderCircle className="size-4 animate-spin"/>:<Upload className="size-4"/>}Görsel yükle<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={e=>void upload(e)}/></label></Button>
    </div>
    <Field label={multiple?'Görsel URL ekle':'Görsel URL'}>{multiple?<div className="flex gap-2"><Input placeholder="https://..." value={draft} onChange={e=>setDraft(e.target.value)}/><Button variant="outline" onClick={()=>{if(draft.trim()){add(draft.trim());setDraft('')}}}><Plus className="size-4"/>Ekle</Button></div>:<Input value={typeof value==='string'?value:''} placeholder="https://..." onChange={e=>onChange(e.target.value)}/>}</Field>
    {urls.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{urls.map(url=><div key={url} className="relative overflow-hidden rounded-lg border bg-muted"><img src={url} alt="" className="aspect-video w-full object-contain"/><button type="button" onClick={()=>remove(url)} aria-label="Görseli kaldır" className="absolute end-2 top-2 rounded bg-background/90 p-1.5 shadow-sm"><Trash2 className="size-4"/></button></div>)}</div>:<p className="text-xs text-muted-foreground">Henüz görsel seçilmedi.</p>}
    {error?<p className="text-sm text-destructive">{error}</p>:null}
    {open?<div className="rounded-lg border p-4"><div className="mb-3 flex items-center justify-between"><b>Medya Kütüphanesi</b><Button size="sm" variant="outline" onClick={()=>setOpen(false)}>Kapat</Button></div>
      <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">{rows.map(r=><button type="button" key={r.id} className="rounded border p-1 text-start hover:border-primary" onClick={()=>{add(r.publicUrl);if(!multiple)setOpen(false)}}><img src={r.publicUrl} alt={r.originalName||r.fileName||''} className="aspect-video w-full object-contain"/><span className="block truncate p-1 text-xs">{r.originalName||r.fileName||'Görsel'}</span></button>)}</div>
      {!rows.length?<p className="py-8 text-center text-sm text-muted-foreground">Henüz medya kaydı yok.</p>:null}
    </div>:null}
  </div>;
}
