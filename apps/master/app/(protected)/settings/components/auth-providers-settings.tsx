'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, LoaderCircle, Save, ExternalLink, AlertCircle } from 'lucide-react';

import { useMasterSession } from '@/app/components/MasterSession';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';

type Provider={key:string;label:string;enabled:boolean;clientId:string;clientSecretRef:string;scopes:string[]};
type State={providers:Provider[]};

export function AuthProvidersSettingsPage(){
  const {request,restoring}=useMasterSession();
  const[data,setData]=useState<State|null>(null);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');
  const[err,setErr]=useState('');

  useEffect(()=>{if(restoring)return;void request('/superadmin/auth-providers').then(setData).catch((e:any)=>setErr(e.message||'Ayarlar alınamadı.'))},[request,restoring]);

  const patch=(index:number,patch:Partial<Provider>)=>{if(!data)return;setData({...data,providers:data.providers.map((x,i)=>i===index?{...x,...patch}:x)})};

  const save=async()=>{if(!data)return;setBusy(true);setMsg('');setErr('');try{const next=await request('/superadmin/auth-providers',{method:'PATCH',body:JSON.stringify(data)});setData(next);setMsg('Harici giriş ayarları kaydedildi.');window.setTimeout(()=>setMsg(''),2200)}catch(e:any){setErr(e.message||'Kaydedilemedi.')}finally{setBusy(false)}};

  if(!data)return <div className="grid min-h-[60vh] place-items-center gap-3 text-sm">{err?<div className="text-destructive">{err}<button type="button" className="ml-3 underline" onClick={()=>{setErr('');void request('/superadmin/auth-providers').then(setData).catch((e:any)=>setErr(e.message||'Ayarlar alınamadı.'))}}>Yeniden dene</button></div>:<LoaderCircle className="animate-spin"/>}</div>;

  return <>
    <Container><Toolbar><ToolbarHeading><div className="flex items-center gap-2"><KeyRound className="size-5 text-primary"/><h1 className="text-xl font-semibold text-mono">Harici Giriş Sağlayıcıları</h1></div><ToolbarDescription>Login ve Register ekranlarındaki Google ve LinkedIn girişlerini buradan yönetin. Diğer sağlayıcılar henüz giriş ekranına bağlı değildir.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button onClick={save} disabled={busy}>{busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button></ToolbarActions></Toolbar></Container>
    {msg?<Container><div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="size-4"/>{msg}</div></Container>:null}
    {err?<Container><div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</div></Container>:null}

    <Container className="grid gap-5 pb-10">
      <div className="rounded-lg border bg-muted/20 p-4 text-sm flex flex-wrap gap-x-6 gap-y-2"><span className="font-medium">Bağlı ekranlar</span><a href="https://login.ticarti.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Login <ExternalLink className="size-3"/></a><a href="https://login.ticarti.com/register" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Register <ExternalLink className="size-3"/></a><span className="text-muted-foreground">Kaydedilen ayarlar, sayfalarda oturum açma sağlayıcılarının durumunu belirler.</span></div>
      {data.providers.map((row,index)=><Card key={row.key}>
        <CardHeader><div className="flex items-start justify-between gap-4"><div><CardHeading>{row.label}</CardHeading><p className="mt-2 text-xs text-muted-foreground">{['GOOGLE','LINKEDIN'].includes(row.key)?'Login ve Register bağlantısı mevcut':'Henüz Login/Register üzerinde desteklenmiyor'}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{row.key}</p></div><Switch checked={row.enabled} onCheckedChange={enabled=>patch(index,{enabled})}/></div></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-medium">Client ID / App ID</span><Input value={row.clientId||''} onChange={e=>patch(index,{clientId:e.target.value})}/></label>
            <label className="grid gap-2"><span className="text-sm font-medium">Client secret · Secret Manager referansı</span><Input value={row.clientSecretRef||''} onChange={e=>patch(index,{clientSecretRef:e.target.value})}/><span className="text-xs text-muted-foreground">Secret değeri bu ekranda tutulmaz.</span></label>
          </div>
          <label className="grid gap-2"><span className="text-sm font-medium">Scopes</span><Input value={(row.scopes||[]).join(', ')} onChange={e=>patch(index,{scopes:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
          {['GOOGLE','LINKEDIN'].includes(row.key)?
           <div className="rounded-lg border bg-muted/20 p-4 text-sm space-y-2">
            <p className="font-medium">{row.enabled&&row.clientId?'Giriş ekranlarında etkin':'Giriş ekranlarında devre dışı'}</p>
            <p className="text-muted-foreground">OAuth bağlantısı Login/Register API tarafından bu kayıttan okunur. Client ID ve etkinlik durumu butonları kontrol eder; Secret Manager içeriği ve sağlayıcı konsolu ayarları ayrıca doğrulanmalıdır.</p>
            {row.enabled&&(!row.clientId||!row.clientSecretRef)?<p className="flex items-center gap-2 text-amber-700"><AlertCircle className="size-4"/> Etkinleştirilmiş sağlayıcı için Client ID ve secret referansını doldurun.</p>:null}
            <p className="text-xs font-medium">OAuth callback URL (sağlayıcı paneline ekleyin):</p>
            <code className="block break-all rounded border bg-background p-2 text-xs select-all">{'https://login.ticarti.com/api/v1/merchant-auth/'+row.key.toLowerCase()+'/callback'}</code>
           </div>:
           <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">Bu sağlayıcının Login/Register üzerinde giriş akışı henüz uygulanmadı. Açık olması bu ekranlarda buton göstermez.</div>}

        </CardContent>
      </Card>)}
    </Container>
  </>;
}
