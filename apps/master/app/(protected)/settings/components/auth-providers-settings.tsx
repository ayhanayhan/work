'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, LoaderCircle, Save } from 'lucide-react';

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

  if(!data)return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin"/></div>;

  return <>
    <Container><Toolbar><ToolbarHeading><div className="flex items-center gap-2"><KeyRound className="size-5 text-primary"/><h1 className="text-xl font-semibold text-mono">Harici Giriş Sağlayıcıları</h1></div><ToolbarDescription>Google, Facebook ve diğer OAuth sağlayıcılarını platform genelinde yönetin.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button onClick={save} disabled={busy}>{busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button></ToolbarActions></Toolbar></Container>
    {msg?<Container><div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="size-4"/>{msg}</div></Container>:null}
    {err?<Container><div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</div></Container>:null}

    <Container className="grid gap-5 pb-10">
      {data.providers.map((row,index)=><Card key={row.key}>
        <CardHeader><div className="flex items-start justify-between gap-4"><div><CardHeading>{row.label}</CardHeading><p className="mt-1 font-mono text-xs text-muted-foreground">{row.key}</p></div><Switch checked={row.enabled} onCheckedChange={enabled=>patch(index,{enabled})}/></div></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-medium">Client ID / App ID</span><Input value={row.clientId||''} onChange={e=>patch(index,{clientId:e.target.value})}/></label>
            <label className="grid gap-2"><span className="text-sm font-medium">Client secret · Secret Manager referansı</span><Input value={row.clientSecretRef||''} onChange={e=>patch(index,{clientSecretRef:e.target.value})}/><span className="text-xs text-muted-foreground">Secret değeri bu ekranda tutulmaz.</span></label>
          </div>
          <label className="grid gap-2"><span className="text-sm font-medium">Scopes</span><Input value={(row.scopes||[]).join(', ')} onChange={e=>patch(index,{scopes:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            Bu sağlayıcı aktif edildiğinde Login/Register ekranındaki ilgili giriş butonu kullanılabilir. Gerekli gizlilik ve kullanım koşulu eşleştirmeleri Sözleşmeler → “Google / Facebook / sosyal giriş” konumundan yönetilir.
          </div>
        </CardContent>
      </Card>)}
    </Container>
  </>;
}
