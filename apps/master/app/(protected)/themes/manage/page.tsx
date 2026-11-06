'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,LoaderCircle,Palette,RefreshCw,Search} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card,CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';

type ThemeRow={id:string;name:string;slug:string;description?:string|null;version:string;previewImageUrl?:string|null;isActive:boolean;isDefault:boolean;_count?:{installations:number}};

export default function ThemeManagementIndex(){
  const {request,restoring}=useMasterSession();
  const [items,setItems]=useState<ThemeRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const rows=await request('/superadmin/themes');
      setItems(Array.isArray(rows)?rows:[]);
    }catch(e:any){setError(e?.message||'Temalar yüklenemedi.')}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const filtered=useMemo(()=>items.filter(item=>[item.name,item.slug,item.description||''].join(' ').toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))),[items,search]);
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Tema Düzenleme</h1><ToolbarDescription>Güncellemek istediğiniz tema paketini seçin. İçerikler, sayfa bölümleri ve paket erişimleri korunur.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" asChild><Link href="/themes"><ArrowLeft className="size-4"/>Tema Kataloğu</Link></Button><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <Card><CardContent className="relative p-5"><Search className="absolute start-8 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} className="ps-9" placeholder="Tema adı veya kodu ara"/></CardContent></Card>
      {error?<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
      {loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="size-6 animate-spin"/></div>:
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(theme=><Card key={theme.id}><CardContent className="grid gap-4 p-5">
          {theme.previewImageUrl?<img src={theme.previewImageUrl} alt="" className="aspect-video w-full rounded-lg border object-cover"/>:<div className="grid aspect-video place-items-center rounded-lg border bg-muted"><Palette className="size-9 text-muted-foreground"/></div>}
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{theme.name}</h2><Badge appearance="light" variant={theme.isActive?'success':'secondary'}>{theme.isActive?'Aktif':'Pasif'}</Badge>{theme.isDefault?<Badge appearance="light" variant="primary">Varsayılan</Badge>:null}</div><p className="mt-1 text-xs text-muted-foreground">{theme.slug} · v{theme.version} · {theme._count?.installations||0} kurulum</p><p className="mt-2 line-clamp-2 min-h-8 text-sm text-muted-foreground">{theme.description||'Tema açıklaması tanımlanmamış.'}</p></div>
          <Button asChild><Link href={'/themes/manage/'+encodeURIComponent(theme.id)}>Temayı Düzenle<ArrowRight className="size-4"/></Link></Button>
        </CardContent></Card>)}{!filtered.length?<Card><CardContent className="py-14 text-center text-sm text-muted-foreground">Tema bulunamadı.</CardContent></Card>:null}</div>}
    </Container>
  </>;
}
