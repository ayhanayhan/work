'use client';
import {useEffect,useState} from 'react';
import {useAdminSession} from '@/app/components/AdminSession';
import {FormField} from '../../components/marketing-form-ui';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Option={value:string;label:string};
const permittedSuffix=/^[a-z0-9][a-z0-9_-]{0,63}$/i;
/** ZIP template keys may be page.faq or legacy page-faq; preserve the same
 * suffix for storage while showing each installed template only once. */
export function pageOptions(templates:unknown):Option[]{
  if(!templates||typeof templates!=='object'||Array.isArray(templates))return [];
  const found=new Map<string,Option>();
  for(const [key,value] of Object.entries(templates)){
    const match=/^page[.-]([a-z0-9][a-z0-9_-]{0,63})$/i.exec(key);
    if(!match||!value||typeof value!=='object'||Array.isArray(value))continue;
    const suffix=match[1];
    if(!found.has(suffix))found.set(suffix,{value:suffix,label:suffix.replace(/[-_]/g,' ')});
  }
  return [...found.values()].sort((a,b)=>a.label.localeCompare(b.label));
}

export function PageTemplatePicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const {session}=useAdminSession();
  const [options,setOptions]=useState<Option[]>([]);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    if(!session?.storeId||!session.accessToken)return;
    let alive=true;
    const controller=new AbortController();
    async function load(){
      setLoading(true);setMessage('');setOptions([]);
      const storeId=session!.storeId!;
      const headers={authorization:`Bearer ${session!.accessToken}`,'x-tenant-id':session!.tenantId||''};
      try{
        const listResponse=await fetch(`${API}/admin/themes?storeId=${encodeURIComponent(storeId)}`,{credentials:'include',headers,signal:controller.signal});
        if(!listResponse.ok)throw new Error('Tema listesi alınamadı.');
        const themes=await listResponse.json();
        const current=Array.isArray(themes)?themes.find((theme:any)=>theme?.current===true):null;
        if(!current?.id){if(alive)setMessage('Aktif tema bulunamadı; mevcut şablon seçimi korunuyor.');return;}
        const response=await fetch(`${API}/admin/themes/${encodeURIComponent(current.id)}/draft?storeId=${encodeURIComponent(storeId)}`,{credentials:'include',headers,signal:controller.signal});
        if(!response.ok)throw new Error('Tema şablonları alınamadı.');
        const data=await response.json();
        if(alive)setOptions(pageOptions(data?.templates));
      }catch(e:any){if(!controller.signal.aborted&&alive)setMessage(e?.message||'Şablonlar alınamadı.');}
      finally{if(alive)setLoading(false)}
    }
    void load();
    return()=>{alive=false;controller.abort()};
  },[session?.storeId,session?.accessToken,session?.tenantId]);
  const unknown=Boolean(value&&!options.some(x=>x.value===value));
  return <FormField label="Tema şablonu">
    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" value={value} onChange={e=>onChange(e.target.value)} disabled={loading}>
      <option value="">Varsayılan sayfa şablonu</option>
      {unknown&&<option value={value}>{value} (mevcut seçim; aktif temada bulunamadı)</option>}
      {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <p className="mt-1 text-xs text-muted-foreground">Şablonlar aktif tema ZIP'inden okunur. FAQ ve benzeri modüller seçilen şablonun section'larıdır.</p>
    {message&&<p role="status" className="mt-1 text-xs text-destructive">{message}</p>}
    {!loading&&!message&&options.length===0&&<p className="mt-1 text-xs text-muted-foreground">Aktif temada özel sayfa şablonu yok.</p>}
    {value&&!permittedSuffix.test(value)&&<p className="mt-1 text-xs text-destructive">Geçersiz şablon kodu. Varsayılan şablonu seçin.</p>}
  </FormField>;
}
