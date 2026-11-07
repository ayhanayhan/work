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
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';

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
/** Shared Master media picker. Every image field opens the same modal. */
export function MediaField({label,value,onChange,multiple=false}:{label:string;value:string|string[];onChange:(val:any)=>void;multiple?:boolean}){
  const {request}=useMasterSession();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[rows,setRows]=useState<MediaItem[]>([]);
  const [filter,setFilter]=useState('');
  const urls=multiple?(Array.isArray(value)?value:[]):typeof value==='string'&&value?[value]:[];
  const add=(url:string)=>{
    multiple?onChange([...new Set([...urls,url])]):onChange(url);
    if(!multiple)setOpen(false);
  };
  const remove=(url:string)=>multiple?onChange(urls.filter(x=>x!==url)):onChange('');
  const gallery=async()=>{
    setOpen(true);setError('');setFilter('');
    try{const result=await request('/superadmin/media');setRows(Array.isArray(result)?result:[])}
    catch(e:any){setError(e.message||'Medya kütüphanesi alınamadı.')}
  };
  const upload=async(e:ChangeEvent<HTMLInputElement>)=>{
    const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;
    setBusy(true);setError('');
    try{
      const saved:MediaItem[]=[];
      for(const file of files){
        const form=new FormData();form.append('file',file);
        const row=await request('/superadmin/media/upload',{method:'POST',body:form});
        if(!row?.publicUrl)throw new Error('Medya yükleme yanıtı geçersiz.');
        saved.push(row);
      }
      setRows(prev=>[...saved,...prev.filter(x=>!saved.some(y=>y.id===x.id))]);
      if(multiple)onChange([...new Set([...urls,...saved.map(x=>x.publicUrl)])]);
      else if(saved[0])add(saved[0].publicUrl);
    }catch(e:any){setError(e.message||'Dosya yüklenemedi.')}finally{setBusy(false)}
  };
  const visible=rows.filter(r=>(r.originalName||r.fileName||'').toLocaleLowerCase('tr').includes(filter.toLocaleLowerCase('tr')));
  return <div className="grid gap-3">
    <div className="text-sm font-medium">{label}</div>
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" size="sm" variant="outline" onClick={()=>void gallery()}><ImagePlus className="size-4"/>Medya Kütüphanesi</Button>
      <span className="text-xs text-muted-foreground">{urls.length?urls.length+' görsel seçildi':'Görsel seçilmedi'}</span>
    </div>
    {urls.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{urls.map(url=><div key={url} className="relative overflow-hidden rounded-lg border bg-muted">
      <img src={url} alt="" className="aspect-video w-full object-contain"/>
      <button type="button" onClick={()=>remove(url)} aria-label="Görseli kaldır" className="absolute end-2 top-2 rounded bg-background/90 p-1.5 shadow-sm"><Trash2 className="size-4"/></button>
    </div>)}</div>:null}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="left-[50%] top-[50%] w-[min(96vw,980px)] max-w-none translate-x-[-50%] translate-y-[-50%] max-h-[90vh] overflow-hidden">
        <DialogHeader><DialogTitle>Medya Kütüphanesi</DialogTitle><DialogDescription>Mevcut bir görsel seçin veya yeni görseller yükleyin.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input className="max-w-xs" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Görsellerde ara"/>
          <Button type="button" size="sm" variant="outline" asChild><label className="cursor-pointer">
            {busy?<LoaderCircle className="size-4 animate-spin"/>:<Upload className="size-4"/>}Yükle
            <input hidden type="file" multiple={multiple} accept="image/png,image/jpeg,image/webp,image/avif" disabled={busy} onChange={e=>void upload(e)}/>
          </label></Button>
        </div>
        {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
        <div className="grid min-h-48 max-h-[58vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-4">
          {visible.map(item=><button type="button" key={item.id} className="rounded-lg border p-2 text-left hover:border-primary focus-visible:outline-primary" onClick={()=>add(item.publicUrl)}>
            <img src={item.publicUrl} alt={item.originalName||item.fileName||'Görsel'} className="aspect-video w-full object-contain"/>
            <span className="mt-2 block truncate text-xs">{item.originalName||item.fileName||'Görsel'}</span>
          </button>)}
          {!visible.length?<p className="col-span-full py-10 text-center text-sm text-muted-foreground">Görsel bulunamadı.</p>:null}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
