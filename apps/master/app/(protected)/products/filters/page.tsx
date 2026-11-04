'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useAdminSession} from '@/app/components/AdminSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Card,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Preset={id:string;name:string;values:any;selected:boolean;isActive?:boolean};
export default function VariantFiltersPage(){
  const {session}=useAdminSession();
  const [presets,setPresets]=useState<Preset[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [locale,setLocale]=useState('tr-TR');
  const [locales,setLocales]=useState<{locale:string;label:string}[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const headers=useCallback((json=false)=>({...json?{'content-type':'application/json'}:{},authorization:`Bearer ${session?.accessToken||''}`,'x-tenant-id':session?.tenantId||''}),[session?.accessToken,session?.tenantId]);
  const load=useCallback(async()=>{
    if(!session?.storeId)return;
    setBusy(true);
    try{
      const [a,b]=await Promise.all([
        fetch(`${API}/admin/catalog/variant-filters?storeId=${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()}),
        fetch(`${API}/admin/store-settings/${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()})
      ]);
      if(!a.ok||!b.ok)throw new Error('Filtre seçenekleri alınamadı.');
      const [data,settings]=await Promise.all([a.json(),b.json()]);
      setPresets(Array.isArray(data.presets)?data.presets:[]);
      setSelected(Array.isArray(data.selectedIds)?data.selectedIds:[]);
      const supported=(Array.isArray(settings.locales)?settings.locales:[]).filter((x:any)=>x.isEnabled!==false);
      setLocales(supported.map((x:any)=>({locale:String(x.locale),label:String(x.label||x.locale)})));
      setLocale(String(supported.find((x:any)=>x.isDefault)?.locale||settings.locale||'tr-TR'));
      setNotice('');
    }catch(e:any){setNotice(e.message||'Yükleme başarısız.')}finally{setBusy(false)}
  },[session?.storeId,headers]);
  useEffect(()=>{void load()},[load]);
  const ordered=useMemo(()=>[...presets].sort((a,b)=>{
    const ai=selected.indexOf(a.id),bi=selected.indexOf(b.id);
    return ai<0&&bi<0?a.name.localeCompare(b.name):ai<0?1:bi<0?-1:ai-bi;
  }),[presets,selected]);
  const title=(p:Preset)=>String(p.values?.translations?.[locale]||p.name);
  const persist=async()=>{
    if(!session?.storeId)return;setBusy(true);
    try{
      const res=await fetch(`${API}/admin/catalog/variant-filters`,{method:'PUT',credentials:'include',headers:headers(true),body:JSON.stringify({storeId:session.storeId,selectedIds:selected})});
      if(!res.ok){const v=await res.json().catch(()=>({}));throw new Error(v.message||'Kaydetme başarısız.');}
      setNotice('Filtre tercihleri kaydedildi.');
    }catch(e:any){setNotice(e.message||'Kaydetme başarısız.')}finally{setBusy(false)}
  };
  const toggle=(id:string,checked:boolean)=>setSelected(rows=>checked?[...new Set([...rows,id])]:rows.filter(x=>x!==id));
  const move=(id:string,delta:number)=>setSelected(rows=>{const a=[...rows],i=a.indexOf(id),j=i+delta;if(i<0||j<0||j>=a.length)return rows;[a[i],a[j]]=[a[j],a[i]];return a;});
  return <Container>
    <Toolbar><ToolbarHeading><h1 className="text-xl font-semibold">Varyant Filtreleri</h1>
      <ToolbarDescription>Varyant tanımlarını filtre olarak etkinleştirin. İsimler seçilen dile göre değişir; filtreleme kimlik üzerinden yapılır.</ToolbarDescription>
    </ToolbarHeading></Toolbar>
    <Card><CardContent className="space-y-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{selected.length} filtre etkin</span>
        <Select value={locale} onValueChange={setLocale}><SelectTrigger className="w-44"><SelectValue placeholder="Dil"/></SelectTrigger>
          <SelectContent>{(locales.length?locales:[{locale:'tr-TR',label:'Türkçe'}]).map(x=><SelectItem key={x.locale} value={x.locale}>{x.label}</SelectItem>)}</SelectContent>
        </Select></div>
      <div className="divide-y rounded-lg border">{ordered.map(p=>{
        const checked=selected.includes(p.id),index=selected.indexOf(p.id);
        const count=Array.isArray(p.values?.items)?p.values.items.length:0;
        const kind=String(p.values?.displayType||'button');
        return <div key={p.id} className="flex items-center gap-3 px-4 py-3">
          <Checkbox checked={checked} onCheckedChange={x=>toggle(p.id,x===true)}/>
          <button type="button" className="flex-1 text-left" onClick={()=>toggle(p.id,!checked)}><span className="block text-sm font-medium">{title(p)}</span>
            <span className="text-xs text-muted-foreground">{count} değer · {kind==='color'?'Renk kodu':kind==='select'?'Seçim listesi':'Buton'}</span></button>
          {checked&&<div className="flex gap-1"><Button type="button" size="sm" variant="outline" disabled={index<=0} onClick={()=>move(p.id,-1)}>↑</Button>
            <Button type="button" size="sm" variant="outline" disabled={index===selected.length-1} onClick={()=>move(p.id,1)}>↓</Button></div>}
        </div>;
      })}{!ordered.length&&<div className="p-5 text-sm text-muted-foreground">Etkin varyant tanımı bulunamadı. Önce Varyant Seçenekleri sayfasından tanım oluşturun.</div>}</div>
      {notice&&<p role="status" className="text-sm">{notice}</p>}
      <div className="flex justify-end"><Button disabled={busy} onClick={persist}>{busy?'İşleniyor…':'Filtreleri Kaydet'}</Button></div>
    </CardContent></Card>
  </Container>;
}
