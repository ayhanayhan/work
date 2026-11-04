'use client';
import {ReactNode,useEffect,useMemo,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useAdminSession} from '@/app/components/AdminSession';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
export type AdminAddressValue={
 id?:string;title?:string;firstName?:string;lastName?:string;phone?:string;company?:string;
 address1?:string;address2?:string;district?:string;city?:string;state?:string;postalCode?:string;country?:string;
 taxOffice?:string;taxNumber?:string;isDefault?:boolean;[key:string]:any;
};
type GeoOption={id:string;name:string;code?:string|null;countryCode?:string|null;level?:string|null};
const norm=(v:unknown)=>String(v||'').trim().toLocaleLowerCase('tr-TR');
const labelFor=(x:GeoOption,language:string)=>{const code=String(x.code||x.countryCode||'').toUpperCase();if((x.level==='COUNTRY'||code.length===2)&&code){try{return new Intl.DisplayNames([language],{type:'region'}).of(code)||x.name}catch{}}return x.name};
function Field({label,children,className=''}:{label:string;children:ReactNode;className?:string}){return <div className={`grid gap-1.5 ${className}`}><Label>{label}</Label>{children}</div>}
export function AdminAddressLocationFields({value,onChange,className=''}:{value:AdminAddressValue;onChange:(next:AdminAddressValue)=>void;className?:string}){
 const{session}=useAdminSession();const{i18n}=useTranslation();const language=i18n.language||'tr';
 const headers=useMemo(()=>session?.accessToken?{authorization:`Bearer ${session.accessToken}`,'x-tenant-id':session.tenantId||''}:null,[session?.accessToken,session?.tenantId]);
 const[countries,setCountries]=useState<GeoOption[]>([]),[cities,setCities]=useState<GeoOption[]>([]),[districts,setDistricts]=useState<GeoOption[]>([]);
 const[busy,setBusy]=useState({country:false,city:false,district:false}),[error,setError]=useState('');
 const countryNode=countries.find(x=>norm(x.code)===norm(value.country)||norm(x.countryCode)===norm(value.country)||norm(x.name)===norm(value.country));
 const cityNode=cities.find(x=>norm(x.name)===norm(value.city)||norm(x.code)===norm(value.city)||norm(x.name)===norm(value.state));
 const districtNode=districts.find(x=>norm(x.name)===norm(value.district)||norm(x.code)===norm(value.district));
 useEffect(()=>{if(!headers)return;const c=new AbortController();setBusy(x=>({...x,country:true}));setError('');fetch(`${API}/admin/locations?level=COUNTRY`,{credentials:'include',headers,signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(j=>{if(!c.signal.aborted)setCountries(Array.isArray(j)?j:[])}).catch(()=>{if(!c.signal.aborted)setError('Ülke listesi yüklenemedi.')}).finally(()=>{if(!c.signal.aborted)setBusy(x=>({...x,country:false}))});return()=>c.abort()},[headers]);
 useEffect(()=>{setCities([]);setDistricts([]);if(!headers||!countryNode)return;const c=new AbortController();setBusy(x=>({...x,city:true}));fetch(`${API}/admin/locations?parentId=${encodeURIComponent(countryNode.id)}&level=ADMIN1`,{credentials:'include',headers,signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(j=>{if(!c.signal.aborted)setCities(Array.isArray(j)?j:[])}).catch(()=>{if(!c.signal.aborted)setError('İl / şehir listesi yüklenemedi.')}).finally(()=>{if(!c.signal.aborted)setBusy(x=>({...x,city:false}))});return()=>c.abort()},[headers,countryNode?.id]);
 useEffect(()=>{setDistricts([]);if(!headers||!cityNode)return;const c=new AbortController();setBusy(x=>({...x,district:true}));fetch(`${API}/admin/locations?parentId=${encodeURIComponent(cityNode.id)}&level=ADMIN2`,{credentials:'include',headers,signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(j=>{if(!c.signal.aborted)setDistricts(Array.isArray(j)?j:[])}).catch(()=>{if(!c.signal.aborted)setError('İlçe listesi yüklenemedi.')}).finally(()=>{if(!c.signal.aborted)setBusy(x=>({...x,district:false}))});return()=>c.abort()},[headers,cityNode?.id]);
 const patch=(x:Partial<AdminAddressValue>)=>onChange({...value,...x});
 return <div className={`grid gap-3 md:grid-cols-2 ${className}`}>
  <Field label="Ülke"><Select value={countryNode?.id||undefined} disabled={busy.country} onValueChange={id=>{const x=countries.find(n=>n.id===id);if(x)patch({country:x.code||x.countryCode||x.name,city:'',state:'',district:''})}}><SelectTrigger><SelectValue placeholder={busy.country?'Ülkeler yükleniyor':'Ülke seçiniz'}/></SelectTrigger><SelectContent>{countries.map(x=><SelectItem key={x.id} value={x.id}>{labelFor(x,language)}</SelectItem>)}</SelectContent></Select></Field>
  <Field label="İl / Şehir"><Select value={cityNode?.id||undefined} disabled={!countryNode||busy.city} onValueChange={id=>{const x=cities.find(n=>n.id===id);if(x)patch({city:x.name,state:x.name,district:''})}}><SelectTrigger><SelectValue placeholder={busy.city?'İller yükleniyor':!countryNode?'Önce ülke seçiniz':'İl / şehir seçiniz'}/></SelectTrigger><SelectContent>{cities.map(x=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></Field>
  <Field label="İlçe"><Select value={districtNode?.id||undefined} disabled={!cityNode||busy.district} onValueChange={id=>{const x=districts.find(n=>n.id===id);if(x)patch({district:x.name})}}><SelectTrigger><SelectValue placeholder={busy.district?'İlçeler yükleniyor':!cityNode?'Önce il seçiniz':'İlçe seçiniz'}/></SelectTrigger><SelectContent>{districts.map(x=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></Field>
  <Field label="Posta kodu"><Input value={value.postalCode||''} onChange={e=>patch({postalCode:e.target.value})}/></Field>
  {error&&<div className="md:col-span-2 text-sm text-destructive">{error}</div>}
 </div>;
}
export function AdminAddressForm({value,onChange,showContact=true,showCompany=true,showTitle=false,showTax=false,className=''}:{value:AdminAddressValue;onChange:(next:AdminAddressValue)=>void;showContact?:boolean;showCompany?:boolean;showTitle?:boolean;showTax?:boolean;className?:string}){
 const patch=(x:Partial<AdminAddressValue>)=>onChange({...value,...x});
 return <div className={`grid gap-3 ${className}`}>
  {showTitle&&<Field label="Adres başlığı"><Input value={value.title||''} onChange={e=>patch({title:e.target.value})}/></Field>}
  {showContact&&<div className="grid gap-3 md:grid-cols-2"><Field label="Ad"><Input value={value.firstName||''} onChange={e=>patch({firstName:e.target.value})}/></Field><Field label="Soyad"><Input value={value.lastName||''} onChange={e=>patch({lastName:e.target.value})}/></Field></div>}
  {showCompany&&<Field label="Firma"><Input value={value.company||''} onChange={e=>patch({company:e.target.value})}/></Field>}
  {showContact&&<Field label="Telefon"><Input value={value.phone||''} onChange={e=>patch({phone:e.target.value})}/></Field>}
  <Field label="Adres"><Textarea rows={4} value={value.address1||''} onChange={e=>patch({address1:e.target.value})}/></Field>
  <AdminAddressLocationFields value={value} onChange={onChange}/>
  {showTax&&<div className="grid gap-3 md:grid-cols-2"><Field label="Vergi dairesi"><Input value={value.taxOffice||''} onChange={e=>patch({taxOffice:e.target.value})}/></Field><Field label="Vergi / T.C. No"><Input value={value.taxNumber||''} onChange={e=>patch({taxNumber:e.target.value})}/></Field></div>}
 </div>;
}
