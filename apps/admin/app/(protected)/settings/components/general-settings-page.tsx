'use client';
import {ReactNode,useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Container} from '@/components/common/container';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {ExternalLink,ImagePlus,LoaderCircle,Plus,RotateCcw,Save,ShieldCheck,Store,Trash2} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
import {TicartiMediaDropzone} from '@/app/(protected)/components/ticarti-media-dropzone';
import {AdminAddressForm} from '@/app/(protected)/components/admin-address-form';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
// Use the runtime's complete IANA time-zone database, not a curated demo list.
const FALLBACK_TIMEZONES=['UTC','Europe/Istanbul'];
function allTimezones():string[]{
 try { const intl=Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]};
  const zones=intl.supportedValuesOf?.('timeZone')||[];
  return Array.from(new Set(['UTC',...zones])).sort((a,b)=>a.localeCompare(b));
 }catch{return FALLBACK_TIMEZONES;}
}
function timeZoneOffset(zone:string,date:Date):string{
 try {
  const part=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(date).find(x=>x.type==='timeZoneName')?.value||'GMT';
  if(part==='GMT'||part==='UTC')return 'UTC+00:00';
  const m=part.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/);
  if(!m)return part.replace('GMT','UTC');
  return `UTC${m[1]}${m[2].padStart(2,'0')}:${m[3]||'00'}`;
 }catch{return 'UTC';}
}
function TimezoneSelect({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const zones=useMemo(()=>allTimezones(),[]);
 const today=useMemo(()=>new Date(),[]);
 const options=useMemo(()=>Array.from(new Set([...zones,value])).sort((a,b)=>a.localeCompare(b)),[zones,value]);
 return <Field label="Saat dilimi" hint="Tüm IANA saat dilimleri. UTC farkları bugünün tarihine göre hesaplanır ve yaz/kış saatinde değişebilir."><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Saat dilimi seçiniz"/></SelectTrigger><SelectContent className="max-h-80">{options.map(zone=><SelectItem key={zone} value={zone}>{`${zone.replaceAll('_',' ')} (${timeZoneOffset(zone,today)})`}</SelectItem>)}</SelectContent></Select></Field>;
}
const SOCIALS=['Instagram','Facebook','X','TikTok','YouTube','LinkedIn','Pinterest','WhatsApp'];
type Social={platform:string;url:string};
function Field({label,hint,children}:{label:string;hint?:string;children:ReactNode}){return <div className="grid gap-2"><div><label className="text-sm font-medium">{label}</label>{hint&&<div className="text-xs text-muted-foreground mt-1">{hint}</div>}</div>{children}</div>}
function SectionCard({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){return <Card><CardHeader><div className="flex items-center justify-between gap-4"><CardHeading>{title}</CardHeading>{action}</div></CardHeader><CardContent className="grid gap-5">{children}</CardContent></Card>}
export default function GeneralSettingsPage(){
 const{session}=useAdminSession();const storeId=session?.storeId||'';const authHeaders=useMemo(()=>session?.accessToken?{authorization:`Bearer ${session.accessToken}`,'x-tenant-id':session.tenantId||''}:null,[session?.accessToken,session?.tenantId]);const[form,setForm]=useState<any>({settings:{},locales:[]}),[original,setOriginal]=useState<any>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const load=useCallback(async()=>{if(!storeId||!authHeaders)return;setLoading(true);setMessage('');try{const r=await fetch(`${API}/admin/store-settings/${encodeURIComponent(storeId)}`,{credentials:'include',headers:authHeaders});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Ayarlar yüklenemedi');const s=j?.settings&&typeof j.settings==='object'?j.settings:{};const next={...j,settings:s,general:s.general||{},localizedStore:s.localizedStore||{},socialAccounts:Array.isArray(s.socialAccounts)?s.socialAccounts:[]};setForm(next);setOriginal(structuredClone(next))}catch(e:any){setMessage(e?.message||'Ayarlar yüklenemedi')}finally{setLoading(false)}},[storeId,authHeaders]);useEffect(()=>{void load()},[load]);
 const set=(k:string,v:any)=>setForm((p:any)=>({...p,[k]:v}));const setGeneral=(k:string,v:any)=>setForm((p:any)=>({...p,general:{...(p.general||{}),[k]:v}}));const setLocalized=(loc:string,k:string,v:any)=>setForm((p:any)=>({...p,localizedStore:{...(p.localizedStore||{}),[loc]:{...(p.localizedStore?.[loc]||{}),[k]:v}}}));
 const socials:Social[]=Array.isArray(form.socialAccounts)?form.socialAccounts:[];const locales=useMemo(()=>Array.isArray(form.locales)&&form.locales.length?form.locales:[{locale:'tr-TR',label:'Türkçe',isDefault:true}],[form.locales]);
 const save=async()=>{if(!storeId||!authHeaders)return;setSaving(true);setMessage('');try{
  const general={...(form.general||{})};delete general.storeDefaultLocale;delete general.defaultCurrency;
  const settings={...(form.settings||{}),general,localizedStore:form.localizedStore||{},socialAccounts:socials};
  const body={name:form.name,email:form.email||null,phone:form.phone||null,companyName:form.companyName||null,addressText:form.addressText||null,timezone:form.timezone||null,defaultCountry:form.defaultCountry||'TR',logoUrl:form.logoUrl||null,faviconUrl:form.faviconUrl||null,settings};
  const request=async(path:string,method:string,payload:any)=>{const r=await fetch(`${API}${path}`,{method,credentials:'include',headers:{...authHeaders,'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(j?.message)?j.message.join(', '):j?.message||'Ayarlar kaydedilemedi');return j};
  const currentLocale=String(form.locale||locales.find((l:any)=>l.isDefault)?.locale||'');
  const nextLocale=String(form.general?.storeDefaultLocale||currentLocale);
  const currentCurrency=String(form.currency||form.currencies?.find((c:any)=>c.isDefault)?.code||'');
  const nextCurrency=String(form.general?.defaultCurrency||currentCurrency);
  if(nextLocale!==currentLocale&&!locales.some((l:any)=>l.locale===nextLocale&&l.isEnabled!==false))throw new Error('Seçilen mağaza dili etkin değil. Önce Dil / Para Birimi ayarlarından etkinleştirin.');
  const currencyRow=(form.currencies||[]).find((c:any)=>c.code===nextCurrency);
  if(nextCurrency!==currentCurrency&&(!currencyRow||currencyRow.isEnabled===false||!(Number(currencyRow.exchangeRate)>0)))throw new Error('Seçilen para birimi etkin değil veya geçerli döviz kuru bulunmuyor. Dil / Para Birimi ayarlarını kontrol edin.');
  await request(`/admin/site/${encodeURIComponent(storeId)}`,'PATCH',body);
  if(nextLocale!==currentLocale)await request(`/admin/store-settings/${encodeURIComponent(storeId)}/locales`,'POST',{locale:nextLocale,label:locales.find((l:any)=>l.locale===nextLocale)?.label||nextLocale,isDefault:true,isEnabled:true});
  if(nextCurrency!==currentCurrency)await request(`/admin/store-settings/${encodeURIComponent(storeId)}/currencies`,'POST',{code:nextCurrency,isDefault:true,isEnabled:true,exchangeRate:Number(currencyRow.exchangeRate),rounding:Number(currencyRow.rounding??2)});
  await load();setMessage('Genel ayarlar kaydedildi.');
 }catch(e:any){setMessage(`${e?.message||'Ayarlar kaydedilemedi'} — Bazı alanlar kaydedilmiş olabilir. Sayfayı yenileyip kontrol edin.`)}finally{setSaving(false)}};
 if(loading||!authHeaders)return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin"/></div>;
 return <><Container><Toolbar><ToolbarHeading><div className="flex items-center gap-2"><h1 className="text-xl font-semibold text-mono">Genel Ayarlar</h1></div><ToolbarDescription>Mağaza, firma, iletişim, marka ve genel sistem bilgileri.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button onClick={()=>void save()} disabled={saving}>{saving?<LoaderCircle className="animate-spin"/>:<Save/>}Kaydet</Button></ToolbarActions></Toolbar></Container>{message&&<Container><div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">{message}</div></Container>}
 <Container><div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-7.5"><div className="xl:col-span-2 flex flex-col gap-5 lg:gap-7.5">

  <SectionCard title="Mağaza Bilgileri ve İletişim"><Tabs defaultValue={String(locales[0]?.locale||'tr-TR')}><TabsList>{locales.map((l:any)=><TabsTrigger key={l.locale} value={l.locale}>{l.label||l.locale}</TabsTrigger>)}</TabsList>{locales.map((l:any)=><TabsContent key={l.locale} value={l.locale} className="grid gap-5 pt-5"><Field label="Mağaza adı"><Input value={String(form.localizedStore?.[l.locale]?.name??(l.isDefault?form.name:''))} onChange={e=>{setLocalized(l.locale,'name',e.target.value);if(l.isDefault)set('name',e.target.value)}}/></Field><Field label="Kısa açıklama"><Textarea rows={3} value={String(form.localizedStore?.[l.locale]?.description||'')} onChange={e=>setLocalized(l.locale,'description',e.target.value)}/></Field></TabsContent>)}</Tabs><div className="grid md:grid-cols-2 gap-5"><Field label="Telefon"><Input value={form.phone||''} onChange={e=>set('phone',e.target.value)}/></Field><Field label="WhatsApp"><Input value={form.general?.whatsapp||''} onChange={e=>setGeneral('whatsapp',e.target.value)}/></Field></div></SectionCard>
  <SectionCard title="Mağaza Adresi"><div className="grid gap-5"><Field label="Mağaza adı"><Input value={form.name||''} onChange={e=>{set('name',e.target.value);const defaultLocale=locales.find((l:any)=>l.isDefault)?.locale;if(defaultLocale)setLocalized(defaultLocale,'name',e.target.value)}}/></Field><AdminAddressForm showContact={false} showCompany={false} value={{country:form.defaultCountry||'TR',city:form.general?.city||'',state:form.general?.city||'',district:form.general?.district||'',postalCode:form.general?.postalCode||'',address1:form.addressText||''}} onChange={a=>{set('defaultCountry',a.country||'TR');setGeneral('city',a.city||'');setGeneral('district',a.district||'');setGeneral('postalCode',a.postalCode||'');set('addressText',a.address1||'')}}/></div></SectionCard>
  <SectionCard title="Yasal Firma ve Fatura Bilgileri"><div className="grid md:grid-cols-2 gap-5"><div className="md:col-span-2"><Field label="Firma unvanı"><Input value={form.companyName||''} onChange={e=>set('companyName',e.target.value)}/></Field></div><Field label="Vergi dairesi"><Input value={form.general?.invoice?.taxOffice||form.taxOffice||''} onChange={e=>setGeneral('invoice',{...(form.general?.invoice||{}),taxOffice:e.target.value})}/></Field><Field label="Vergi / T.C. kimlik no"><Input value={form.general?.invoice?.taxNumber||form.taxNumber||''} onChange={e=>setGeneral('invoice',{...(form.general?.invoice||{}),taxNumber:e.target.value})}/></Field><Field label="MERSİS no"><Input value={form.general?.invoice?.mersisNo||''} onChange={e=>setGeneral('invoice',{...(form.general?.invoice||{}),mersisNo:e.target.value})}/></Field></div><div className="text-xs text-muted-foreground">Bu bilgiler mağazanın yasal/fatura kimliğidir. Vergi oranları ve otomatik faturalama davranışı Vergi & Fatura ayarlarında yönetilir.</div></SectionCard>
  <SectionCard title="Dil, Para Birimi ve Saat Dilimi"><div className="grid md:grid-cols-2 gap-5">
  <TimezoneSelect value={form.timezone||'Europe/Istanbul'} onChange={v=>set('timezone',v)}/>
  <Field label="Mağaza vitrini varsayılan dili"><Select value={String(form.general?.storeDefaultLocale||form.locale||locales.find((l:any)=>l.isDefault)?.locale||'tr-TR')} onValueChange={v=>setGeneral('storeDefaultLocale',v)}><SelectTrigger><SelectValue placeholder="Dil seçiniz"/></SelectTrigger><SelectContent>{locales.map((l:any)=><SelectItem key={l.locale} value={l.locale}>{l.label||l.locale}</SelectItem>)}</SelectContent></Select></Field>
  <Field label="Yönetim paneli varsayılan dili"><Select value={String(form.general?.adminDefaultLocale||'tr')} onValueChange={v=>setGeneral('adminDefaultLocale',v)}><SelectTrigger><SelectValue placeholder="Dil seçiniz"/></SelectTrigger><SelectContent>{[{locale:'tr',label:'Türkçe'},{locale:'en',label:'English'},{locale:'de',label:'Deutsch'},{locale:'ru',label:'Русский'}].map(l=><SelectItem key={l.locale} value={l.locale}>{l.label}</SelectItem>)}</SelectContent></Select></Field>
  <Field label="Mağaza varsayılan para birimi"><Select value={String(form.general?.defaultCurrency||form.currency||form.currencies?.find((c:any)=>c.isDefault)?.code||'TRY')} onValueChange={v=>setGeneral('defaultCurrency',v)}><SelectTrigger><SelectValue placeholder="Para birimi seçiniz"/></SelectTrigger><SelectContent>{(Array.isArray(form.currencies)?form.currencies:[]).map((c:any)=><SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent></Select></Field>
  </div></SectionCard>
  <SectionCard title="Sosyal Medya Bağlantıları" action={<Button size="sm" variant="outline" onClick={()=>setForm((p:any)=>({...p,socialAccounts:[...socials,{platform:'Instagram',url:''}]}))}><Plus className="size-4"/> Hesap Ekle</Button>}><div className="grid gap-3">{socials.map((s,i)=><div key={i} className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-end"><Field label="Platform"><Select value={s.platform||'Instagram'} onValueChange={v=>setForm((p:any)=>({...p,socialAccounts:socials.map((x,n)=>n===i?{...x,platform:v}:x)}))}><SelectTrigger><SelectValue placeholder="Platform seçin"/></SelectTrigger><SelectContent>{SOCIALS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><Field label="Profil URL"><Input value={s.url||''} onChange={e=>setForm((p:any)=>({...p,socialAccounts:socials.map((x,n)=>n===i?{...x,url:e.target.value}:x)}))}/></Field><Button variant="ghost" size="icon" onClick={()=>setForm((p:any)=>({...p,socialAccounts:socials.filter((_,n)=>n!==i)}))}><Trash2 className="size-4"/></Button></div>)}</div><div className="text-xs text-muted-foreground">Tema sosyal medya alanları varsayılan olarak buradaki hesapları kullanır.</div></SectionCard>
 </div><div className="flex flex-col gap-5 lg:gap-7.5">
  <SectionCard title="Logo ve Marka Görselleri"><Field label="Logo"><TicartiMediaDropzone label="Site logosu" title="Site logosu seç" multiple={false} value={form.logoUrl||''} onChange={v=>set('logoUrl',String(v||''))}/></Field><Field label="Favicon"><TicartiMediaDropzone label="Favicon / ikon" title="Favicon seç" multiple={false} value={form.faviconUrl||''} onChange={v=>set('faviconUrl',String(v||''))}/></Field></SectionCard>
  <SectionCard title="Mağaza Yayın Durumu"><div className="grid gap-3"><div className="flex items-center justify-between"><span className="text-sm">Mağaza</span><Badge variant="success" appearance="light">Aktif</Badge></div><div className="flex items-center justify-between"><span className="text-sm">SSL</span><Badge variant="success" appearance="light">Aktif</Badge></div><div className="flex items-center justify-between"><span className="text-sm">Domain</span><Badge appearance="light">{form.domain?'Bağlı':'Bekliyor'}</Badge></div></div></SectionCard>
 </div></div></Container></>;
}
