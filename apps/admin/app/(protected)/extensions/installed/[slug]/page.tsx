'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';import {Switch} from '@/components/ui/switch';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {LoaderCircle,Puzzle,ArrowLeft,Save,Trash2} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Field={key:string;label?:string;type?:string;scope?:string;default?:any;options?:any[];required?:boolean;help?:string;placeholder?:string};
function fieldsOf(app:any):Field[]{const schema=app?.settingsSchema||{};const fields=schema?.manifest?.settings?.fields||schema?.settings?.fields||schema?.fields||[];return Array.isArray(fields)?fields.filter((f:any)=>f&&typeof f.key==='string'&&/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(f.key)):[]}
function msgOf(j:any,fallback:string){return Array.isArray(j?.message)?j.message.join(', '):String(j?.message||fallback)}
export default function Page(){
 const {slug:raw}=useParams<{slug:string}>(),slug=String(raw||'');
 const router=useRouter();
 const {session,refreshSession,refreshInstalledApps}=useAdminSession();
 const [detail,setDetail]=useState<any>(null),[permissions,setPermissions]=useState<{required:string[];optional:string[]}>({required:[],optional:[]});
 const [values,setValues]=useState<Record<string,any>>({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[statusBusy,setStatusBusy]=useState(false),[removeBusy,setRemoveBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[tab,setTab]=useState('general');
 const request=useCallback(async(path:string,options:RequestInit={})=>{
  if(!session)throw new Error('Oturum bulunamadı');
  const run=(token:string,tenant:string)=>fetch(API+path,{...options,credentials:'include',cache:'no-store',headers:{authorization:`Bearer ${token}`,'x-tenant-id':tenant,...(options.body?{'content-type':'application/json'}:{})}});
  let r=await run(session.accessToken,session.tenantId);
  if(r.status===401){const next=await refreshSession();if(next)r=await run(next.accessToken,next.tenantId)}
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(msgOf(j,`HTTP ${r.status}`));return j;
 },[session,refreshSession]);
 const load=useCallback(async()=>{
  if(!session?.accessToken||!slug)return;
  setLoading(true);setError('');try{
   const row=await request('/admin/apps/installed/'+encodeURIComponent(slug));
   const fields=fieldsOf(row?.app);const current={...(row?.install?.config||{}),...(row?.connection?.config||{})};const next:Record<string,any>={};
   for(const f of fields)if(f.scope!=='credentials'&&f.type!=='secret'&&f.type!=='password')next[f.key]=current[f.key]??f.default??(f.type==='boolean'?false:'');
   setValues(next);setDetail(row);
   // The merchant API does not expose /permissions; render declared scopes read-only.
   const manifest=row?.app?.settingsSchema?.manifest||{};
   const p=manifest.permissions||row?.app?.settingsSchema?.permissions||row?.app?.marketplace?.permissions||{};
   setPermissions({required:Array.isArray(p.required)?p.required:[],optional:Array.isArray(p.optional)?p.optional:[]});
  }catch(e:any){setError(e.message||'Uygulama yüklenemedi')}finally{setLoading(false)}
 },[session?.accessToken,session?.tenantId,slug,request]);
 useEffect(()=>{void load()},[load]);
 const app=detail?.app,fields=useMemo(()=>fieldsOf(app),[app]);
 const isSecret=(f:Field)=>f.scope==='credentials'||f.type==='secret'||f.type==='password';
 const settingFields=fields.filter(f=>!isSecret(f));const secretFields=fields.filter(isSecret);
 async function save(){if(busy||!detail)return;setBusy(true);setError('');setNotice('');try{
  const base={...(detail.install?.config||{}),...(detail.connection?.config||{})};const config:any={...base},credentials:any={};
  for(const f of fields){const v=values[f.key];if(isSecret(f)){if(String(v??'').trim())credentials[f.key]=v}else config[f.key]=v??f.default??''}
  await request('/admin/apps/installed/'+encodeURIComponent(slug)+'/settings',{method:'PATCH',body:JSON.stringify({config,credentials})});
  setNotice('Uygulama ayarları kaydedildi.');await refreshInstalledApps();
  // Keep the success message visible; only secret inputs are cleared.
  setValues(prev=>{const updated={...prev};for(const f of secretFields)delete updated[f.key];return updated});
 }catch(e:any){setError(e.message||'Ayarlar kaydedilemedi')}finally{setBusy(false)}}
 async function toggle(){if(!detail||statusBusy)return;setStatusBusy(true);setError('');setNotice('');try{const enabled=!(detail.install?.enabled&&detail.install?.status==='ACTIVE');await request('/admin/apps/installed/'+encodeURIComponent(slug)+'/state',{method:'PATCH',body:JSON.stringify({enabled})});setDetail((d:any)=>({...d,install:{...d.install,enabled,status:enabled?'ACTIVE':'DISABLED'}}));await refreshInstalledApps();setNotice(enabled?'Uygulama etkinleştirildi.':'Uygulama pasife alındı.')}catch(e:any){setError(e.message)}finally{setStatusBusy(false)}}
 async function removeApp(){
  if(!detail||removeBusy)return;
  if(!window.confirm(`${app?.name||'Bu uygulama'} uygulamasını mağazanızdan kaldırmak istediğinize emin misiniz?`))return;
  setRemoveBusy(true);setError('');setNotice('');
  try{
   await request('/admin/apps/installed/'+encodeURIComponent(slug),{method:'DELETE'});
   await refreshInstalledApps();
   router.push('/extensions/installed');
   router.refresh();
  }catch(e:any){setError(e?.message||'Uygulama kaldırılamadı');setRemoveBusy(false)}
 }
 function input(f:Field){const value=values[f.key]??(isSecret(f)?'':f.default??'');const update=(v:any)=>setValues(x=>({...x,[f.key]:v}));
  return <div key={f.key} className="grid gap-2"><label className="text-sm font-medium" htmlFor={'setting-'+f.key}>{f.label||f.key}{f.required?' *':''}</label>
  {f.type==='boolean'?<div className="flex h-10 items-center"><Switch checked={Boolean(value)} onCheckedChange={update}/></div>:
  f.type==='select'?<select id={'setting-'+f.key} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={String(value)} onChange={e=>update(e.target.value)}>{(f.options||[]).map((o:any)=><option key={String(o.value??o)} value={String(o.value??o)}>{String(o.label??o)}</option>)}</select>:
  <Input id={'setting-'+f.key} type={isSecret(f)?'password':f.type==='number'?'number':f.type==='url'?'url':f.type==='email'?'email':'text'} value={value} onChange={e=>update(e.target.value)} autoComplete={isSecret(f)?'new-password':'off'} placeholder={isSecret(f)?'Değiştirmek istemiyorsanız boş bırakın':f.placeholder||''}/>}
  {f.help&&<small className="text-muted-foreground">{f.help}</small>}
  </div>}
 const active=!!detail?.install?.enabled&&detail?.install?.status==='ACTIVE';const logo=app?.marketplace?.logoUrl;
 return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold">{app?.name||'Uygulama Ayarları'}</h1><ToolbarDescription>Eklentilerim / Uygulama Ayarları</ToolbarDescription></ToolbarHeading></Toolbar></Container>
 <Container className="grid gap-5"><div><Button size="sm" variant="outline" asChild><Link href="/extensions/installed"><ArrowLeft/> Eklentilerime dön</Link></Button></div>
 {error&&<div role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}</div>}{notice&&<div role="status" className="rounded-lg border border-success/40 p-4 text-sm">{notice}</div>}
 {loading?<div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin"/></div>:!detail?<div className="rounded-xl border p-8">Uygulama bulunamadı veya mağazanızda kurulu değil.</div>:<>
 <div className="rounded-xl border bg-background p-6"><div className="flex flex-wrap items-center gap-4"><div className="grid size-16 place-items-center overflow-hidden rounded-xl border">{logo?<img src={logo} alt="" className="size-full object-contain"/>:<Puzzle className="size-8 text-primary"/>}</div><div className="min-w-0 grow"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{app.name}</h2><Badge appearance="light" variant={active?'success':'secondary'}>{active?'Aktif':'Pasif'}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{app.summary||app.description}</p><p className="mt-1 text-xs text-muted-foreground">{app.developer||'Ticarti'} · {app.category}</p></div><Button variant={active?'outline':'primary'} disabled={statusBusy} onClick={()=>void toggle()}>{statusBusy?'İşleniyor…':active?'Pasife al':'Etkinleştir'}</Button></div></div>
 <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]"><section className="min-w-0 rounded-xl border bg-background p-6">
 <Tabs value={tab} onValueChange={setTab}><TabsList className="mb-6 h-auto flex-wrap"><TabsTrigger value="general">Genel Ayarlar</TabsTrigger><TabsTrigger value="connection">Bağlantı Bilgileri</TabsTrigger><TabsTrigger value="permissions">İzinler</TabsTrigger><TabsTrigger value="about">Uygulama Hakkında</TabsTrigger></TabsList>
 <TabsContent value="general" className="grid gap-5"><h3 className="font-semibold">Genel Ayarlar</h3>{settingFields.length?<div className="grid gap-5 md:grid-cols-2">{settingFields.map(input)}</div>:<p className="text-sm text-muted-foreground">Bu uygulamanın genel ayar alanları henüz uygulama tanımında bulunmuyor.</p>}</TabsContent>
 <TabsContent value="connection" className="grid gap-5"><h3 className="font-semibold">Bağlantı Bilgileri</h3><p className="text-sm text-muted-foreground">Kaydedilmiş gizli anahtarlar güvenlik nedeniyle gösterilmez. Boş bırakılan alanlar korunur.</p>{secretFields.length?<div className="grid gap-5 md:grid-cols-2">{secretFields.map(input)}</div>:<p className="text-sm text-muted-foreground">Bu uygulama için bağlantı bilgisi alanları henüz uygulama tanımında bulunmuyor.</p>}</TabsContent>
 <TabsContent value="permissions" className="grid gap-5"><h3 className="font-semibold">Uygulama İzinleri</h3><p className="text-sm text-muted-foreground">İzinler uygulama tanımından görüntülenir. İzin yönetimi henüz mağaza API’sinde desteklenmiyor.</p>{permissions.required.map(scope=><label key={scope} className="flex items-center gap-3 text-sm"><input type="checkbox" checked readOnly/><span>{scope}</span><Badge appearance="light">Zorunlu</Badge></label>)}{permissions.optional.map(scope=><div key={scope} className="flex items-center gap-3 text-sm"><span>{scope}</span><Badge appearance="light" variant="secondary">İsteğe bağlı</Badge></div>)}{!permissions.required.length&&!permissions.optional.length&&<p className="text-sm text-muted-foreground">Ek izin tanımlanmamış.</p>}</TabsContent>
 <TabsContent value="about" className="grid gap-4"><h3 className="font-semibold">Uygulama Hakkında</h3><p className="whitespace-pre-wrap text-sm leading-7">{app.description||app.summary||'Uygulama açıklaması bulunmuyor.'}</p>{app.marketplace?.usageGuide&&<><h4 className="font-semibold">Nasıl Kullanılır?</h4><p className="whitespace-pre-wrap text-sm leading-7">{app.marketplace.usageGuide}</p></>}</TabsContent></Tabs>
 <div className="mt-8 flex justify-end gap-3 border-t pt-5"><Button variant="outline" asChild><Link href="/extensions/installed">Vazgeç</Link></Button><Button disabled={busy||!fields.length} onClick={()=>void save()}>{busy?<LoaderCircle className="animate-spin"/>:<Save/>}{busy?'Kaydediliyor…':'Değişiklikleri Kaydet'}</Button></div>
 </section><aside className="rounded-xl border bg-background p-5"><h3 className="font-semibold">Uygulama Durumu</h3><dl className="mt-4 grid gap-2 text-sm"><dt className="text-muted-foreground">Durum</dt><dd>{active?'Aktif':'Pasif'}</dd><dt className="mt-2 text-muted-foreground">Geliştirici</dt><dd>{app.developer||'Ticarti'}</dd><dt className="mt-2 text-muted-foreground">Kategori</dt><dd>{app.category}</dd><dt className="mt-2 text-muted-foreground">Kurulum tarihi</dt><dd>{detail.install?.installedAt?new Date(detail.install.installedAt).toLocaleDateString('tr-TR'):'—'}</dd></dl><div className="mt-6 border-t pt-5"><h4 className="text-sm font-medium">Uygulamayı kaldır</h4><p className="mt-1 text-xs text-muted-foreground">Uygulamayı mağazanızdan kaldırır. Tekrar kullanmak için yeniden yüklemeniz gerekir.</p><Button variant="outline" size="sm" className="mt-3 text-destructive hover:text-destructive" disabled={removeBusy} onClick={()=>void removeApp()}>{removeBusy?<LoaderCircle className="animate-spin"/>:<Trash2/>}{removeBusy?'Kaldırılıyor…':'Uygulamayı Kaldır'}</Button></div></aside></div>
 </>}</Container></>;
}
