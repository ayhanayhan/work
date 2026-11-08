'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {PhoneCall,RefreshCw,Save,Mail,Search,LoaderCircle} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Card,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';

type Lead={id:string;phone:string;source:string;page:string;locale:string;status:string;
 createdAt:string;updatedAt?:string;internalNote?:string;legacy?:boolean;notificationStatus?:string};
type Template={enabled:boolean;recipient:string;subject:string;body:string;providerConfigured?:boolean};
const statuses:Record<string,string>={NEW:'Yeni',IN_PROGRESS:'İşlemde',CONTACTED:'Arandı',CLOSED:'Kapalı'};
const defaultTemplate:Template={enabled:false,recipient:'',subject:'Ticarti · Yeni telefon talebi ({{source}})',
 body:'Yeni iletişim talebi\nTelefon: {{phone}}\nKaynak: {{source}}\nSayfa: {{page}}\nDil: {{locale}}\nTarih: {{createdAt}}'};
const date=(value:string)=>{const parsed=new Date(value);return Number.isNaN(parsed.getTime())?value:parsed.toLocaleString('tr-TR')};

export default function CallbackInbox(){
 const {request,restoring}=useMasterSession();
 const [rows,setRows]=useState<Lead[]>([]);
 const [template,setTemplate]=useState<Template>(defaultTemplate);
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('ALL');
 const [selected,setSelected]=useState<string|null>(null);
 const [status,setStatus]=useState('NEW'),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(restoring)return;
  setLoading(true);setError('');
  try{
   const [leads,settings]=await Promise.all([
    request('/superadmin/contact/callbacks'),
    request('/superadmin/contact/callback-email-template')
   ]);
   setRows(Array.isArray(leads)?leads:[]);
   setTemplate({...defaultTemplate,...settings});
  }catch(e:any){setError(e?.message||'Talepler alınamadı.');}
  finally{setLoading(false);}
 },[request,restoring]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>rows.filter(lead=>{
  if(filter!=='ALL'&&lead.status!==filter)return false;
  const q=search.toLocaleLowerCase('tr').trim();
  return !q||[lead.phone,lead.source,lead.page,lead.locale,lead.internalNote||''].join(' ')
   .toLocaleLowerCase('tr').includes(q);
 }),[rows,search,filter]);
 const current=rows.find(x=>x.id===selected);
 const open=(lead:Lead)=>{setSelected(lead.id);setStatus(lead.status);setNote(lead.internalNote||'');setError('');setNotice('');};
 const saveLead=async()=>{
  if(!current)return;
  setBusy(true);setError('');setNotice('');
  try{
   const updated=await request('/superadmin/contact/callbacks/'+encodeURIComponent(current.id),{
    method:'PATCH',body:JSON.stringify({status,internalNote:note})
   });
   setRows(prev=>prev.map(x=>x.id===current.id?{...x,...updated}:x));
   setSelected(null);setNotice('Talep güncellendi.');
  }catch(e:any){setError(e?.message||'Kaydedilemedi.');}
  finally{setBusy(false)}
 };
 const saveTemplate=async()=>{
  setBusy(true);setError('');setNotice('');
  try{
   const updated=await request('/superadmin/contact/callback-email-template',{
    method:'PATCH',body:JSON.stringify(template)
   });
   setTemplate(updated);
   setNotice('Bildirim şablonu kaydedildi.');
  }catch(e:any){setError(e?.message||'Şablon kaydedilemedi.');}
  finally{setBusy(false)}
 };
 return <Container className="grid gap-5 pb-12">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-semibold">Telefon Talepleri</h1>
    <p className="mt-1 text-sm text-muted-foreground">Anasayfa ve blog üzerinden bırakılan arama talepleri tek yerde.</p></div>
   <Button variant="outline" disabled={loading||busy} onClick={()=>void load()}>
    <RefreshCw className="size-4"/>Yenile</Button>
  </div>
  {error?<p className="rounded-md border border-destructive p-3 text-sm text-destructive" role="alert">{error}</p>:null}
  {notice?<p className="rounded-md border p-3 text-sm" role="status">{notice}</p>:null}
  <Card><CardContent className="grid gap-4 p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 font-semibold"><PhoneCall className="size-4"/>Aranacak kişiler ({filtered.length})</h2>
    <div className="flex flex-wrap gap-2">
     <div className="relative"><Search className="absolute left-2 top-2.5 size-4 text-muted-foreground"/>
      <Input className="pl-8" value={search} placeholder="Telefon veya sayfa ara" onChange={e=>setSearch(e.target.value)}/></div>
     <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}>
      <option value="ALL">Tüm durumlar</option>{Object.entries(statuses).map(([key,value])=><option key={key} value={key}>{value}</option>)}
     </select>
    </div>
   </div>
   {loading?<div className="p-10 text-center text-sm">Yükleniyor…</div>:filtered.length?
   <div className="overflow-x-auto">
    <table className="w-full min-w-[650px] border-collapse text-sm">
     <thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Telefon</th>
      <th className="p-3">Kaynak</th><th className="p-3">Tarih</th><th className="p-3">Bildirim</th><th className="p-3">Durum</th><th className="p-3"></th></tr></thead>
     <tbody>{filtered.map(lead=><tr key={lead.id} className="border-b">
      <td className="p-3"><a className="font-medium underline" href={'tel:'+lead.phone}>{lead.phone}</a>
       <div className="max-w-64 truncate text-xs text-muted-foreground">{lead.page||'/'}</div></td>
      <td className="p-3">{lead.source==='HOME'?'Anasayfa':'Blog'} <span className="text-xs text-muted-foreground">({lead.locale||'tr'})</span></td>
      <td className="p-3">{date(lead.createdAt)}</td>
      <td className="p-3 text-xs">{lead.notificationStatus==='SENT'?'Gönderildi':
       lead.notificationStatus==='FAILED'?'Gönderilemedi':
       lead.notificationStatus==='NOT_CONFIGURED'?'Kurulum gerekli':
       lead.notificationStatus==='DISABLED'?'Kapalı':
       lead.notificationStatus==='LEGACY'?'Eski kayıt':'Bekliyor'}</td>
      <td className="p-3">{statuses[lead.status]||lead.status}</td>
      <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={()=>open(lead)}>İncele</Button></td>
     </tr>)}</tbody>
    </table>
   </div>:<p className="py-8 text-center text-sm text-muted-foreground">Henüz talep bulunmuyor.</p>}
  </CardContent></Card>
  {current?<Card><CardContent className="grid gap-4 p-5">
   <div className="flex items-center justify-between">
    <h2 className="font-semibold">Talep · {current.phone}</h2>
    <Button variant="outline" size="sm" onClick={()=>setSelected(null)}>Kapat</Button>
   </div>
   <p className="text-sm text-muted-foreground">{current.source==='HOME'?'Anasayfa':'Blog'} · {current.page||'/'} · {date(current.createdAt)}</p>
   <label className="grid gap-2 text-sm">Durum
    <select className="h-10 rounded-md border bg-background px-3" value={status} onChange={e=>setStatus(e.target.value)}>
     {Object.entries(statuses).map(([key,value])=><option key={key} value={key}>{value}</option>)}
    </select></label>
   <label className="grid gap-2 text-sm">İç not
    <Textarea rows={3} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <div className="flex justify-end"><Button disabled={busy} onClick={()=>void saveLead()}>
    {busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Talebi Kaydet</Button></div>
  </CardContent></Card>:null}
  <Card><CardContent className="grid gap-4 p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="flex items-center gap-2 font-semibold"><Mail className="size-4"/>Telefon talebi e-posta şablonu</h2>
     <p className="mt-1 text-sm text-muted-foreground">Talep geldiğinde belirtilen yönetici adresine bildirim gönder. Varsayılan olarak kapalıdır.</p></div>
    <div className="flex items-center gap-2 text-sm">
     <Switch checked={template.enabled} onCheckedChange={enabled=>setTemplate(x=>({...x,enabled}))}/>
     {template.enabled?'Aktif':'Pasif'}
    </div>
   </div>
   {!template.providerConfigured?<p className="rounded-md border p-3 text-sm text-amber-700">
    Gerçek e-posta gönderimi için API sunucusunda RESEND_API_KEY ve CALLBACK_EMAIL_FROM tanımlanmalı;
    şablonu aktif etmek tek başına e-posta göndermez.
   </p>:null}
   <label className="grid gap-2 text-sm">Bildirim alıcısı
    <Input type="email" placeholder="destek@ticarti.com" value={template.recipient}
      onChange={e=>setTemplate(x=>({...x,recipient:e.target.value}))}/></label>
   <label className="grid gap-2 text-sm">E-posta konusu
    <Input value={template.subject} onChange={e=>setTemplate(x=>({...x,subject:e.target.value}))}/></label>
   <label className="grid gap-2 text-sm">Şablon içeriği
    <Textarea rows={6} value={template.body} onChange={e=>setTemplate(x=>({...x,body:e.target.value}))}/></label>
   <p className="text-xs text-muted-foreground">Kullanılabilir değişkenler: {'{{phone}}'}, {'{{source}}'}, {'{{page}}'}, {'{{locale}}'}, {'{{createdAt}}'}.
    E-posta gönderimi için API sunucusunda RESEND_API_KEY ve CALLBACK_EMAIL_FROM tanımlanmalıdır.</p>
   <div className="flex justify-end"><Button disabled={busy} onClick={()=>void saveTemplate()}>
    {busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Şablonu Kaydet</Button></div>
  </CardContent></Card>
 </Container>;
}
