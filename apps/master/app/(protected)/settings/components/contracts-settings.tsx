'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, FileText, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';

import { useMasterSession } from '@/app/components/MasterSession';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';

type ContractRow = {
  key: string;
  label: string;
  contentKey: string;
  isActive: boolean;
  placements: string[];
  sortOrder?: number;
};

type OptionRow = { key: string; label: string; sortOrder?: number };

type ContractSettings = {
  contracts: ContractRow[];
  placementOptions: OptionRow[];
  contentOptions: OptionRow[];
};

export function PlatformContractsSettingsPage() {
  const { request, restoring } = useMasterSession();
  const [data,setData] = useState<ContractSettings|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [newPlacement,setNewPlacement] = useState('');
  const [newPlacementLabel,setNewPlacementLabel] = useState('');
  const [newContentKey,setNewContentKey] = useState('');
  const [newContentLabel,setNewContentLabel] = useState('');
  const [expandedPlacements,setExpandedPlacements] = useState<Record<string,boolean>>({});
  const toggleExpanded=(key:string)=>setExpandedPlacements(x=>({...x,[key]:!x[key]}));

  useEffect(()=>{
    if(restoring) return;
    void request('/superadmin/contract-settings').then(setData).catch((e:any)=>setError(e.message||'Sözleşme ayarları alınamadı.'));
  },[request,restoring]);

  const sortedContracts = useMemo(()=>[...(data?.contracts||[])].sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)),[data]);

  const save = async()=>{
    if(!data) return;
    setBusy(true);setMessage('');setError('');
    try{
      const next=await request('/superadmin/contract-settings',{method:'PATCH',body:JSON.stringify(data)});
      setData(next);
      setMessage('Sözleşme eşleştirmeleri kaydedildi.');
      window.setTimeout(()=>setMessage(''),2200);
    }catch(e:any){setError(e.message||'Kaydedilemedi.')}finally{setBusy(false)}
  };

  const patchContract=(index:number,patch:Partial<ContractRow>)=>{
    if(!data)return;
    setData({...data,contracts:data.contracts.map((x,i)=>i===index?{...x,...patch}:x)});
  };

  const togglePlacement=(index:number,key:string,checked:boolean)=>{
    if(!data)return;
    const row=data.contracts[index];
    const placements=checked?Array.from(new Set([...(row.placements||[]),key])):(row.placements||[]).filter(x=>x!==key);
    patchContract(index,{placements});
  };

  const addContract=()=>{
    if(!data)return;
    setData({...data,contracts:[...data.contracts,{key:'NEW_CONTRACT_'+Date.now(),label:'Yeni Sözleşme',contentKey:'',isActive:true,placements:[],sortOrder:data.contracts.length}]});
  };

  const addPlacement=()=>{
    if(!data)return;
    const label=newPlacementLabel.trim();
    const key=(newPlacement.trim()||label).toUpperCase().replace(/[^A-Z0-9_]+/g,'_').replace(/^_+|_+$/g,'');
    if(!key||!label||data.placementOptions.some(x=>x.key===key))return;
    setData({...data,placementOptions:[...data.placementOptions,{key,label,sortOrder:data.placementOptions.length}]});
    setNewPlacement('');setNewPlacementLabel('');
  };

  const addContentOption=()=>{
    if(!data)return;
    const key=newContentKey.trim();
    const label=newContentLabel.trim();
    if(!key||!label||data.contentOptions.some(x=>x.key===key))return;
    setData({...data,contentOptions:[...data.contentOptions,{key,label,sortOrder:data.contentOptions.length}]});
    setNewContentKey('');setNewContentLabel('');
  };

  if(!data)return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin"/></div>;

  return <>
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2"><FileText className="size-5 text-primary"/><h1 className="text-xl font-semibold text-mono">Sözleşmeler</h1></div>
          <ToolbarDescription>Sözleşmeleri içerik sayfalarıyla ve platformdaki kullanım alanlarıyla eşleştirin.</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions><Button onClick={save} disabled={busy}>{busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button></ToolbarActions>
      </Toolbar>
    </Container>

    {message?<Container><div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="size-4"/>{message}</div></Container>:null}
    {error?<Container><div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div></Container>:null}

    <Container className="grid gap-5 pb-10">
      <Card>
        <CardHeader className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardHeading>Sözleşme Eşleştirmeleri</CardHeading><p className="mt-1 text-sm text-muted-foreground">Sayfa içeriği ve slug İçerik bölümünden yönetilir. Burada yalnızca hangi yasal içeriğin nerede kullanılacağını seçersiniz.</p></div>
            <Button variant="outline" onClick={addContract}><Plus className="size-4"/>Sözleşme ekle</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {sortedContracts.map((row)=>{
            const index=data.contracts.findIndex(x=>x===row);
            return <div key={row.key+'-'+index} className="rounded-xl border">
              <div className="sticky top-16 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
                <div className="min-w-0"><div className="font-semibold">{row.label || row.key}</div><div className="text-xs text-muted-foreground">{(row.placements||[]).length} gösterim konumu seçildi</div></div>
                <Button variant="outline" size="sm" onClick={()=>toggleExpanded(row.key)}>{expandedPlacements[row.key]?<ChevronUp className="size-4"/>:<ChevronDown className="size-4"/>}{expandedPlacements[row.key]?'Konumları gizle':'Gösterim konumları'}</Button>
              </div>
              <div className="grid gap-4 p-4 xl:grid-cols-[1.1fr_1.1fr_130px_auto] xl:items-end">
                <label className="grid gap-2"><span className="text-sm font-medium">Sözleşme / politika</span><Input value={row.label} onChange={e=>patchContract(index,{label:e.target.value})}/><span className="font-mono text-[11px] text-muted-foreground">{row.key}</span></label>
                <label className="grid gap-2"><span className="text-sm font-medium">İçerik sayfası</span><Select value={row.contentKey||'__none'} onValueChange={v=>patchContract(index,{contentKey:v==='__none'?'':v})}><SelectTrigger><SelectValue placeholder="Sayfa seçin"/></SelectTrigger><SelectContent><SelectItem value="__none">Sayfa seçilmedi</SelectItem>{data.contentOptions.map(x=><SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent></Select><span className="text-[11px] text-muted-foreground">Slug ve içerik burada değiştirilmez.</span></label>
                <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={row.isActive!==false} onCheckedChange={isActive=>patchContract(index,{isActive})}/>Aktif</label>
                <Button variant="outline" size="icon" onClick={()=>setData({...data,contracts:data.contracts.filter((_,i)=>i!==index)})}><Trash2 className="size-4"/></Button>
              </div>

              {expandedPlacements[row.key]?<div className="border-t p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-sm font-medium">Kullanım konumları</div><div className="text-xs text-muted-foreground">Bu sözleşmenin platformun hangi alanlarında gösterileceğini seçin.</div></div>{row.contentKey?<Badge appearance="light" variant="success">Eşlendi</Badge>:<Badge appearance="light" variant="warning">Sayfa eksik</Badge>}</div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.placementOptions.map(option=><label key={option.key} className="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-sm"><Switch checked={(row.placements||[]).includes(option.key)} onCheckedChange={checked=>togglePlacement(index,option.key,checked)}/><span>{option.label}</span></label>)}
                </div>
              </div>:null}
            </div>
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardHeading>Kullanım Konumları</CardHeading><p className="mt-1 text-sm text-muted-foreground">Footer, kayıt, checkout, newsletter gibi alanlara ileride yeni konumlar ekleyebilirsiniz.</p></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="grid gap-2"><span className="text-sm font-medium">Konum adı</span><Input value={newPlacementLabel} onChange={e=>setNewPlacementLabel(e.target.value)} placeholder="Örn. Kampanya formu"/></label>
              <label className="grid gap-2"><span className="text-sm font-medium">Sistem anahtarı</span><Input value={newPlacement} onChange={e=>setNewPlacement(e.target.value)} placeholder="CAMPAIGN_FORM"/></label>
              <Button variant="outline" onClick={addPlacement}><Plus className="size-4"/>Ekle</Button>
            </div>
            <div className="flex flex-wrap gap-2">{data.placementOptions.map(x=><Badge key={x.key} appearance="light" variant="secondary">{x.label}</Badge>)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardHeading>İçerik Referansları</CardHeading><p className="mt-1 text-sm text-muted-foreground">İçerik bölümünde oluşturduğunuz yasal sayfaların mantıksal referanslarını burada seçenek olarak tutabilirsiniz.</p></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="grid gap-2"><span className="text-sm font-medium">Görünen ad</span><Input value={newContentLabel} onChange={e=>setNewContentLabel(e.target.value)} placeholder="Örn. Bayi Sözleşmesi"/></label>
              <label className="grid gap-2"><span className="text-sm font-medium">İçerik anahtarı</span><Input value={newContentKey} onChange={e=>setNewContentKey(e.target.value)} placeholder="dealer-agreement"/></label>
              <Button variant="outline" onClick={addContentOption}><Plus className="size-4"/>Ekle</Button>
            </div>
            <div className="flex flex-wrap gap-2">{data.contentOptions.map(x=><Badge key={x.key} appearance="light" variant="secondary">{x.label}</Badge>)}</div>
          </CardContent>
        </Card>
      </div>
    </Container>
  </>;
}
