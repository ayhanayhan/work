'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EllipsisVertical, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import { useAdminSession } from '@/app/components/AdminSession';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHeading, CardTable } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

type Kind='custom-fields'|'options'|'tags'|'units';
type Row={id:string;name:string;code?:string;type?:string;active?:boolean;values?:unknown[];precision?:number};

const configs:Record<Kind,{key:string;title:string;description:string;button:string}>={
  'custom-fields':{key:'customFields',title:'Ürün Özellikleri',description:'Filtreleme ve ürün bilgi alanlarında kullanılacak özellikleri yönetin.',button:'Yeni Özellik'},
  options:{key:'variantTypes',title:'Seçenekler & Varyantlar',description:'Beden, renk ve varyant seçenek şablonlarını merkezi yönetin.',button:'Yeni Seçenek'},
  tags:{key:'tags',title:'Etiket Tanımları',description:'Ürünlerde tekrar kullanılacak etiket tanımlarını yönetin.',button:'Yeni Etiket'},
  units:{key:'units',title:'Birim Tanımları',description:'Ürün ölçü ve satış birimlerini yönetin.',button:'Yeni Birim'},
};

export function CatalogDefinitionManager({kind}:{kind:Kind}){
  const cfg=configs[kind];
  const {session}=useAdminSession();
  const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState('');
  const [editing,setEditing]=useState<Row|null>(null),[open,setOpen]=useState(false);
  const [name,setName]=useState(''),[code,setCode]=useState(''),[type,setType]=useState('text'),[values,setValues]=useState(''),[active,setActive]=useState(true),[precision,setPrecision]=useState('0');
  const headers=useCallback((json=false)=>({...json?{'content-type':'application/json'}:{},authorization:`Bearer ${session?.accessToken||''}`,'x-tenant-id':session?.tenantId||''}),[session?.accessToken,session?.tenantId]);
  const load=useCallback(async()=>{if(!session?.storeId)return;setLoading(true);setError('');try{const r=await fetch(`${API}/admin/catalog/definitions?storeId=${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Tanımlar alınamadı.');setRows(Array.isArray(j?.[cfg.key])?j[cfg.key]:[])}catch(e:any){setError(e?.message||'Tanımlar alınamadı.')}finally{setLoading(false)}},[cfg.key,headers,session?.storeId]);
  useEffect(()=>{void load()},[load]);
  const start=(row?:Row)=>{setEditing(row||null);setName(row?.name||'');setCode(row?.code||'');setType(row?.type||'text');setValues(Array.isArray(row?.values)?row!.values!.map((x:any)=>typeof x==='string'?x:(x?.name||'')).filter(Boolean).join(', '):'');setActive(row?.active!==false);setPrecision(String(row?.precision??0));setOpen(true)};
  const save=async()=>{if(!session?.storeId||!name.trim())return;setSaving(true);setError('');try{const payload:any={storeId:session.storeId,name:name.trim(),code:code.trim()||undefined,active};if(kind==='custom-fields')payload.type=type;if(kind==='options')payload.values=values.split(',').map(x=>x.trim()).filter(Boolean);if(kind==='units')payload.precision=Number(precision||0);const url=editing?`${API}/admin/catalog/definitions/${kind}/${editing.id}`:`${API}/admin/catalog/definitions/${kind}`;const r=await fetch(url,{method:editing?'PATCH':'POST',credentials:'include',headers:headers(true),body:JSON.stringify(payload)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(j?.message)?j.message.join(', '):(j?.message||'Kaydedilemedi.'));setOpen(false);await load()}catch(e:any){setError(e?.message||'Kaydedilemedi.')}finally{setSaving(false)}};
  const remove=async(row:Row)=>{if(!session?.storeId||!confirm(`“${row.name}” silinsin mi?`))return;setError('');try{const r=await fetch(`${API}/admin/catalog/definitions/${kind}/${row.id}?storeId=${encodeURIComponent(session.storeId)}`,{method:'DELETE',credentials:'include',headers:headers()});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Silinemedi.');await load()}catch(e:any){setError(e?.message||'Silinemedi.')}};
  const filtered=useMemo(()=>rows.filter(x=>`${x.name} ${x.code||''}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))),[rows,query]);
  const detail=(r:Row)=>kind==='options'?(Array.isArray(r.values)&&r.values.length?r.values.map((x:any)=>typeof x==='string'?x:(x?.name||'')).join(', '):'Değer yok'):kind==='custom-fields'?(r.type||'text'):kind==='units'?`${r.code||'-'} · ${r.precision??0} basamak`:(r.code||'-');
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">{cfg.title}</h1><ToolbarDescription>{cfg.description}</ToolbarDescription></ToolbarHeading><ToolbarActions><Button onClick={()=>start()}><Plus/>{cfg.button}</Button></ToolbarActions></Toolbar></Container>
    <Container><Card><CardHeader><CardHeading><div className="relative"><Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2"/><Input className="ps-9 w-64" value={query} onChange={e=>setQuery(e.target.value)} placeholder={`${cfg.title} ara...`}/></div></CardHeading></CardHeader>{error&&<div className="mx-5 mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}<CardTable>{loading?<div className="grid min-h-44 place-items-center"><LoaderCircle className="animate-spin"/></div>:<Table><TableHeader><TableRow><TableHead>Ad</TableHead><TableHead>Detay</TableHead><TableHead>Durum</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader><TableBody>{filtered.map(r=><TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-muted-foreground">{detail(r)}</TableCell><TableCell><Badge appearance="light" variant={r.active===false?'secondary':'success'}>{r.active===false?'Pasif':'Aktif'}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button mode="icon" variant="ghost" onClick={()=>start(r)}><EllipsisVertical/></Button><Button mode="icon" variant="ghost" onClick={()=>void remove(r)}><Trash2 className="size-4"/></Button></div></TableCell></TableRow>)}</TableBody></Table>}</CardTable></Card></Container>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{editing?'Düzenle':cfg.button}</DialogTitle></DialogHeader><div className="grid gap-4"><div className="grid gap-2"><label className="text-sm font-medium">Ad</label><Input value={name} onChange={e=>setName(e.target.value)} autoFocus/></div><div className="grid gap-2"><label className="text-sm font-medium">Kod</label><Input value={code} onChange={e=>setCode(e.target.value)} placeholder="Opsiyonel"/></div>{kind==='custom-fields'&&<div className="grid gap-2"><label className="text-sm font-medium">Alan tipi</label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="text">Metin</SelectItem><SelectItem value="number">Sayı</SelectItem><SelectItem value="boolean">Evet / Hayır</SelectItem><SelectItem value="json">Çoklu / JSON</SelectItem></SelectContent></Select></div>}{kind==='options'&&<div className="grid gap-2"><label className="text-sm font-medium">Değerler</label><Input value={values} onChange={e=>setValues(e.target.value)} placeholder="S, M, L, XL"/><div className="text-xs text-muted-foreground">Virgülle ayırın.</div></div>}{kind==='units'&&<div className="grid gap-2"><label className="text-sm font-medium">Ondalık basamak</label><Input type="number" min={0} max={6} value={precision} onChange={e=>setPrecision(e.target.value)}/></div>}{['options','tags'].includes(kind)&&<div className="flex items-center justify-between rounded-lg border p-3"><div><div className="font-medium">Aktif</div><div className="text-xs text-muted-foreground">Bu tanım seçimlerde kullanılabilir.</div></div><Switch checked={active} onCheckedChange={setActive}/></div>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>İptal</Button><Button onClick={()=>void save()} disabled={saving||!name.trim()}>{saving&&<LoaderCircle className="animate-spin"/>}Kaydet</Button></div></div></DialogContent></Dialog>
  </>;
}
