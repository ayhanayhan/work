'use client';

import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, LoaderCircle, Save } from 'lucide-react';

import { useMasterSession } from '@/app/components/MasterSession';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';

type ServiceRow = {
  label: string;
  enabled: boolean;
  provider: string;
  model: string;
  baseUrl: string;
};

type AiSettings = {
  services: Record<string, ServiceRow>;
  creditPolicy: { enabled?: boolean };
};

const PROVIDERS = [
  { value: 'openai-compatible', label: 'OpenAI uyumlu', baseUrl: 'https://api.openai.com/v1' },
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { value: 'google', label: 'Google', baseUrl: 'https://generativelanguage.googleapis.com' },
  { value: 'custom', label: 'Özel endpoint', baseUrl: '' },
];

export function AiServicesSettingsPage() {
  const { request, restoring } = useMasterSession();
  const [data,setData] = useState<AiSettings|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');

  useEffect(()=>{
    if(restoring) return;
    void request('/superadmin/ai-services').then(setData);
  },[request,restoring]);

  const patch=(key:string,patch:Partial<ServiceRow>)=>{
    if(!data) return;
    setData({...data,services:{...data.services,[key]:{...data.services[key],...patch}}});
  };

  const providerChange=(key:string,provider:string)=>{
    const base=PROVIDERS.find(x=>x.value===provider)?.baseUrl ?? '';
    patch(key,{provider,baseUrl:base || data?.services[key]?.baseUrl || ''});
  };

  const save=async()=>{
    if(!data) return;
    setBusy(true); setMessage('');
    try{
      const next=await request('/superadmin/ai-services',{method:'PATCH',body:JSON.stringify(data)});
      setData(next);
      setMessage('AI servis ayarları kaydedildi.');
      window.setTimeout(()=>setMessage(''),2200);
    } finally { setBusy(false); }
  };

  if(!data) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin"/></div>;

  return <>
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary"/>
            <h1 className="text-xl font-semibold text-mono">AI Servisleri</h1>
          </div>
          <ToolbarDescription>Metin, görsel, embedding, ses, güvenlik ve video servislerini merkezi olarak yönetin.</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={save} disabled={busy}>
            {busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}
            Ayarları kaydet
          </Button>
        </ToolbarActions>
      </Toolbar>
    </Container>

    {message?<Container><div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="size-4"/>{message}</div></Container>:null}

    <Container className="grid gap-5 pb-10">
      <div className="grid gap-5 xl:grid-cols-2">
        {Object.entries(data.services).map(([key,row])=><Card key={key}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardHeading>{row.label}</CardHeading>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{key}</p>
              </div>
              <Switch checked={row.enabled!==false} onCheckedChange={enabled=>patch(key,{enabled})}/>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Sağlayıcı</span>
              <Select value={row.provider} onValueChange={provider=>providerChange(key,provider)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{PROVIDERS.map(p=><SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Model adı</span>
              <Input value={row.model||''} onChange={e=>patch(key,{model:e.target.value})} placeholder="Model kimliği"/>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Base URL</span>
              <Input value={row.baseUrl||''} onChange={e=>patch(key,{baseUrl:e.target.value})}/>
            </label>
          </CardContent>
        </Card>)}
      </div>

      <Card>
        <CardHeader>
          <CardHeading>Kredi politikası</CardHeading>
          <p className="mt-1 text-sm text-muted-foreground">AI metin, görsel ve diğer servislerin kullanımını ortak kredi altyapısı üzerinden ölçün.</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-5 rounded-lg border p-4">
            <div>
              <div className="font-medium">AI kredi ölçümü</div>
              <div className="mt-1 text-sm text-muted-foreground">Servis kullanımlarını platform AI kredi altyapısına dahil eder.</div>
            </div>
            <Switch checked={data.creditPolicy?.enabled!==false} onCheckedChange={enabled=>setData({...data,creditPolicy:{...data.creditPolicy,enabled}})}/>
          </div>
          <div className="mt-4 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            Gizli API anahtarları bu ekranda gösterilmez. Provider credential'ları Secret Manager üzerinden yönetilir.
          </div>
        </CardContent>
      </Card>
    </Container>
  </>;
}
