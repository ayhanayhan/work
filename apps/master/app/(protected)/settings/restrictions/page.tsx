'use client';
import {useCallback,useEffect,useState} from 'react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Save,ShieldCheck} from 'lucide-react';
type Rule={warningDays:number;graceDays:number;retentionDays:number};
type Policy={trialDays:number;trial:Rule;paid:Rule;emailWarnings:boolean;retentionWarnings:boolean;deletionRequiresApproval:boolean};
export default function Page(){
 const {request,restoring}=useMasterSession();const [data,setData]=useState<Policy|null>(null);const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');
 const load=useCallback(async()=>{try{setData(await request('/superadmin/subscription-restrictions'))}catch(e:any){setMsg(e.message||'Ayarlar yüklenemedi')}},[request]);
 useEffect(()=>{if(!restoring)void load()},[load,restoring]);
 const edit=(kind:'trial'|'paid',field:keyof Rule,n:number)=>setData(d=>d?{...d,[kind]:{...d[kind],[field]:n}}:d);
 const save=async()=>{if(!data)return;setBusy(true);setMsg('');try{setData(await request('/superadmin/subscription-restrictions',{method:'PATCH',body:JSON.stringify(data)}));setMsg('Kısıtlama ayarları kaydedildi.')}catch(e:any){setMsg(e.message||'Kaydedilemedi')}finally{setBusy(false)}};
 const section=(kind:'trial'|'paid',title:string)=>data&&<Card><CardHeader><CardHeading>{title}</CardHeading></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
 {([['warningDays','İlk uyarı (gün)'],['graceDays','Ek kullanım süresi (gün)'],['retentionDays','Veri kurtarma süresi (gün)']] as const).map(([key,label])=><label key={key} className="grid gap-2 text-sm"><span>{label}</span><Input type="number" min={key==='retentionDays'?1:0} max={3650} value={data[kind][key]} onChange={e=>edit(kind,key,Number(e.target.value))}/></label>)}
 <p className="col-span-full text-xs text-muted-foreground">Bitişten sonra ek süre tanımlanmışsa kısıtlama bu sürenin sonunda başlar. Storefront otomatik bakım moduna geçer, Admin kilitlenir.</p></CardContent></Card>;
 return <><Container><Toolbar><ToolbarHeading><h1 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="size-5"/>Kısıtlama Ayarları</h1><ToolbarDescription>Deneme, lisans, ek kullanım ve veri koruma süreleri</ToolbarDescription></ToolbarHeading><ToolbarActions><Button onClick={()=>void save()} disabled={!data||busy}><Save className="size-4"/>Kaydet</Button></ToolbarActions></Toolbar></Container>
 <Container className="grid gap-5 pb-10">{msg&&<p className="rounded border p-3 text-sm">{msg}</p>}{!data?<p>Ayarlar yükleniyor...</p>:<>
 <Card><CardHeader><CardHeading>Yeni Mağaza</CardHeading></CardHeader><CardContent><label className="grid gap-2 text-sm max-w-xs">Deneme süresi (gün)<Input type="number" min={1} max={365} value={data.trialDays} onChange={e=>setData({...data,trialDays:Number(e.target.value)})}/></label></CardContent></Card>
 {section('trial','Deneme Süresi')}{section('paid','Ücretli Lisans')}
 <Card><CardHeader><CardHeading>Bildirimler ve Veri Güvenliği</CardHeading></CardHeader><CardContent className="grid gap-4">
 {([['emailWarnings','E-posta uyarıları'],['retentionWarnings','Veri kurtarma süresi bitmeden uyar'],['deletionRequiresApproval','Veri silme için Master onayı iste']] as const).map(([key,label])=><label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={data[key]} onChange={e=>setData({...data,[key]:e.target.checked})}/>{label}</label>)}
 <p className="text-sm text-muted-foreground">API yetki kontrolü ve yasal kayıtların korunması zorunludur, kapatılamaz. Otomatik kalıcı silme etkin değildir.</p>
 </CardContent></Card></>}</Container></>
}