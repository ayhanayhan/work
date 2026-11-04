'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useMasterSession } from '@/app/components/MasterSession';

type Row={ [key:string]:any };
const fieldLabel='mb-2 block text-xs font-medium text-muted-foreground';
const selectClass='flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30';

function Status({message,error}:{message:string;error:string}){
  if(!message&&!error)return null;
  return <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error?'border-destructive/30 bg-destructive/5 text-destructive':'border-green-200 bg-green-50 text-green-700'}`}>{error||message}</div>;
}

function Header({title,description,action}:{title:string;description:string;action?:ReactNode}){
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}

function Field({label,value,onChange,type='text',placeholder=''}:{label:string;value:any;onChange:(v:string)=>void;type?:string;placeholder?:string}){
  return <label className="block"><span className={fieldLabel}>{label}</span><Input type={type} value={value||''} placeholder={placeholder} onChange={e=>onChange(e.target.value)} variant="lg"/></label>;
}

function ToggleField({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){
  return <div><span className={fieldLabel}>{label}</span><div className="flex h-10 items-center gap-2"><Switch checked={checked} onCheckedChange={onChange}/><span className="text-sm">{checked?'Açık':'Kapalı'}</span></div></div>;
}

function Empty({text}:{text:string}){
  return <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

export function GeneralSettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
  const[company,setCompany]=useState<Row>({});const[branding,setBranding]=useState<Row>({});

  async function load(){setLoading(true);setError('');try{const settings=await request('/superadmin/platform-settings');setCompany(settings?.company||{});setBranding(settings?.branding||{});}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);

  async function save(){setSaving(true);setMessage('');setError('');try{await request('/superadmin/platform-settings',{method:'PATCH',body:JSON.stringify({company,branding})});setMessage('Genel ayarlar kaydedildi.');await load();}catch(e:any){setError(e.message)}finally{setSaving(false)}}

  if(loading)return <div className="text-sm text-muted-foreground">Genel ayarlar yükleniyor…</div>;
  return <>
    <Header title="Genel Ayarlar" description="Firma bilgileri, iletişim bilgileri ve marka görsellerini yönetin." action={<Button onClick={()=>void save()} disabled={saving}><Save/>{saving?'Kaydediliyor…':'Ayarları Kaydet'}</Button>}/>
    <Status message={message} error={error}/>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader><div><CardTitle>Firma Bilgileri</CardTitle><CardDescription className="mt-1">Platform genelinde kullanılan temel şirket bilgileri.</CardDescription></div></CardHeader>
        <CardContent><div className="grid gap-4 md:grid-cols-2">
          <Field label="Marka adı" value={company.name} onChange={v=>setCompany({...company,name:v})}/>
          <Field label="Yasal ünvan" value={company.legalName} onChange={v=>setCompany({...company,legalName:v})}/>
          <Field label="E-posta" type="email" value={company.email} onChange={v=>setCompany({...company,email:v})}/>
          <Field label="Telefon" value={company.phone} onChange={v=>setCompany({...company,phone:v})}/>
          <Field label="Web sitesi" value={company.website} onChange={v=>setCompany({...company,website:v})}/>
          <Field label="Vergi numarası" value={company.taxNumber} onChange={v=>setCompany({...company,taxNumber:v})}/>
          <label className="md:col-span-2"><span className={fieldLabel}>Adres</span><textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30" value={company.address||''} onChange={e=>setCompany({...company,address:e.target.value})}/></label>
        </div></CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader><div><CardTitle>Marka Görselleri</CardTitle><CardDescription className="mt-1">Platform logosu ve ikonları.</CardDescription></div></CardHeader>
        <CardContent><div className="space-y-4">
          {[['Logo','logoUrl'],['İkon','iconUrl'],['Beyaz logo','whiteLogoUrl'],['Beyaz ikon','whiteIconUrl']].map(([label,key])=><div key={key}>
            <div className="mb-2 flex h-20 items-center justify-center rounded-md border border-border bg-muted/30 p-3">{branding[key]?<img src={branding[key]} alt="" className="max-h-full max-w-full object-contain"/>:<span className="text-xs text-muted-foreground">Görsel seçilmedi</span>}</div>
            <Field label={label} value={branding[key]} onChange={v=>setBranding({...branding,[key]:v})} placeholder="https://…"/>
          </div>)}
        </div></CardContent>
      </Card>
    </div>
  </>;
}

export function LanguageSettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');const[locales,setLocales]=useState<Row[]>([]);
  async function load(){setLoading(true);setError('');try{const settings=await request('/superadmin/platform-settings');setLocales(Array.isArray(settings?.locales)?settings.locales:[])}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  const defaultLocale=useMemo(()=>locales.find(x=>x.isDefault)?.locale||'', [locales]);
  function update(index:number,key:string,value:any){setLocales(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r))}
  async function save(){setSaving(true);setMessage('');setError('');try{await request('/superadmin/platform-settings',{method:'PATCH',body:JSON.stringify({locales})});setMessage('Dil ayarları kaydedildi.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}
  if(loading)return <div className="text-sm text-muted-foreground">Diller yükleniyor…</div>;
  return <>
    <Header title="Diller" description="Platformda kullanılacak dilleri ve varsayılan dili yönetin." action={<div className="flex gap-2"><Button variant="outline" onClick={()=>setLocales(x=>[...x,{locale:'',label:'',isActive:true,isDefault:false,sortOrder:x.length}])}><Plus/>Dil ekle</Button><Button onClick={()=>void save()} disabled={saving}><Save/>{saving?'Kaydediliyor…':'Kaydet'}</Button></div>}/>
    <Status message={message} error={error}/>
    <Card><CardContent className="pt-6"><div className="space-y-3">{locales.map((row,i)=><div key={`${row.locale}-${i}`} className="grid items-end gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_1.2fr_auto_auto_auto]">
      <Field label="Dil kodu" value={row.locale} onChange={v=>update(i,'locale',v)} placeholder="tr"/>
      <Field label="Görünen ad" value={row.label} onChange={v=>update(i,'label',v)} placeholder="Türkçe"/>
      <ToggleField label="Aktif" checked={row.isActive!==false} onChange={v=>update(i,'isActive',v)}/>
      <label className="space-y-2 text-xs font-medium text-muted-foreground">Varsayılan<select className={selectClass} value={row.isDefault?'yes':'no'} onChange={e=>{if(e.target.value==='yes')setLocales(xs=>xs.map((x,j)=>({...x,isDefault:j===i,isActive:j===i?true:x.isActive})));else update(i,'isDefault',false)}}><option value="no">Hayır</option><option value="yes">Evet</option></select></label>
      <Button variant="outline" mode="icon" disabled={row.isDefault} onClick={()=>setLocales(x=>x.filter((_,j)=>j!==i))}><Trash2/></Button>
    </div>)}{!locales.length&&<Empty text="Henüz dil tanımlanmamış."/>}</div><div className="mt-4 text-xs text-muted-foreground">Varsayılan dil: <b className="text-foreground">{defaultLocale||'—'}</b></div></CardContent></Card>
  </>;
}

export function CurrencySettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');const[currencies,setCurrencies]=useState<Row[]>([]);
  async function load(){setLoading(true);setError('');try{const settings=await request('/superadmin/platform-settings');setCurrencies(Array.isArray(settings?.currencies)?settings.currencies:[])}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  const defaultCurrency=useMemo(()=>currencies.find(x=>x.isDefault)?.code||'', [currencies]);
  function update(index:number,key:string,value:any){setCurrencies(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r))}
  async function save(){setSaving(true);setMessage('');setError('');try{await request('/superadmin/platform-settings',{method:'PATCH',body:JSON.stringify({currencies})});setMessage('Para birimi ayarları kaydedildi.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}
  if(loading)return <div className="text-sm text-muted-foreground">Para birimleri yükleniyor…</div>;
  return <>
    <Header title="Para Birimleri" description="Platformda kullanılacak para birimlerini ve varsayılan para birimini yönetin." action={<div className="flex gap-2"><Button variant="outline" onClick={()=>setCurrencies(x=>[...x,{code:'',name:'',symbol:'',isActive:true,isDefault:false,sortOrder:x.length}])}><Plus/>Para birimi ekle</Button><Button onClick={()=>void save()} disabled={saving}><Save/>{saving?'Kaydediliyor…':'Kaydet'}</Button></div>}/>
    <Status message={message} error={error}/>
    <Card><CardContent className="pt-6"><div className="space-y-3">{currencies.map((row,i)=><div key={`${row.code}-${i}`} className="grid items-end gap-3 rounded-lg border border-border p-4 md:grid-cols-[.8fr_1.2fr_.6fr_auto_auto_auto]">
      <Field label="Kod" value={row.code} onChange={v=>update(i,'code',v.toUpperCase())} placeholder="TRY"/>
      <Field label="Ad" value={row.name} onChange={v=>update(i,'name',v)} placeholder="Türk Lirası"/>
      <Field label="Sembol" value={row.symbol} onChange={v=>update(i,'symbol',v)} placeholder="₺"/>
      <ToggleField label="Aktif" checked={row.isActive!==false} onChange={v=>update(i,'isActive',v)}/>
      <label className="space-y-2 text-xs font-medium text-muted-foreground">Varsayılan<select className={selectClass} value={row.isDefault?'yes':'no'} onChange={e=>{if(e.target.value==='yes')setCurrencies(xs=>xs.map((x,j)=>({...x,isDefault:j===i,isActive:j===i?true:x.isActive})));else update(i,'isDefault',false)}}><option value="no">Hayır</option><option value="yes">Evet</option></select></label>
      <Button variant="outline" mode="icon" disabled={row.isDefault} onClick={()=>setCurrencies(x=>x.filter((_,j)=>j!==i))}><Trash2/></Button>
    </div>)}{!currencies.length&&<Empty text="Henüz para birimi tanımlanmamış."/>}</div><div className="mt-4 text-xs text-muted-foreground">Varsayılan para birimi: <b className="text-foreground">{defaultCurrency||'—'}</b></div></CardContent></Card>
  </>;
}

export function SocialAuthSettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
  const[social,setSocial]=useState<any>({providers:{google:{enabled:false,clientId:'',clientSecret:''},facebook:{enabled:false,clientId:'',clientSecret:''}}});
  async function load(){setLoading(true);setError('');try{const auth=await request('/superadmin/customer-auth').catch(()=>({providers:{}}));setSocial({providers:{google:{...auth?.providers?.google,clientSecret:''},facebook:{...auth?.providers?.facebook,clientSecret:''}}})}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  async function save(){setSaving(true);setMessage('');setError('');try{await request('/superadmin/customer-auth',{method:'PATCH',body:JSON.stringify(social)});setMessage('Sosyal giriş ayarları kaydedildi.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}
  if(loading)return <div className="text-sm text-muted-foreground">Sosyal giriş ayarları yükleniyor…</div>;
  return <>
    <Header title="Sosyal Giriş" description="Müşteri girişinde kullanılacak sosyal sağlayıcıları yönetin." action={<Button onClick={()=>void save()} disabled={saving}><Save/>{saving?'Kaydediliyor…':'Kaydet'}</Button>}/>
    <Status message={message} error={error}/>
    <div className="grid gap-4 xl:grid-cols-2">{(['google','facebook'] as const).map(provider=>{const p=social.providers?.[provider]||{};return <Card key={provider}><CardHeader className="flex-row items-center justify-between"><CardTitle className="capitalize">{provider}</CardTitle><Switch checked={p.enabled!==false} onCheckedChange={v=>setSocial((s:any)=>({...s,providers:{...s.providers,[provider]:{...s.providers?.[provider],enabled:v}}}))}/></CardHeader><CardContent><div className="space-y-4"><Field label="Client ID" value={p.clientId} onChange={v=>setSocial((s:any)=>({...s,providers:{...s.providers,[provider]:{...s.providers?.[provider],clientId:v}}}))}/><Field label="Client Secret" type="password" value={p.clientSecret} onChange={v=>setSocial((s:any)=>({...s,providers:{...s.providers,[provider]:{...s.providers?.[provider],clientSecret:v}}}))} placeholder={p.secretConfigured?'Kayıtlı · değiştirmek için yeni değer girin':'Client Secret'}/></div></CardContent></Card>})}</div>
  </>;
}
