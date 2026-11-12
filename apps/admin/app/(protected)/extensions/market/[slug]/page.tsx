'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {LoaderCircle,Puzzle,ArrowLeft,Download} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
function errorText(value:any,fallback:string){return Array.isArray(value?.message)?value.message.join(', '):String(value?.message||fallback)}
export default function Page(){
 const params=useParams<{slug:string}>(),router=useRouter();const slug=String(params?.slug||'');
 const {session,refreshSession,refreshInstalledApps}=useAdminSession();
 const [app,setApp]=useState<any>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useCallback(async(path:string,options:RequestInit={})=>{
  if(!session)throw new Error('Oturum bulunamadı');
  const run=(token:string,tenant:string)=>fetch(API+path,{...options,credentials:'include',cache:'no-store',headers:{authorization:`Bearer ${token}`,'x-tenant-id':tenant,...(options.body?{'content-type':'application/json'}:{})}});
  let r=await run(session.accessToken,session.tenantId);
  if(r.status===401){const next=await refreshSession();if(next)r=await run(next.accessToken,next.tenantId)}
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(errorText(data,`HTTP ${r.status}`));return data;
 },[session,refreshSession]);
 useEffect(()=>{let active=true;if(!session?.accessToken||!slug)return;setLoading(true);void request('/admin/apps/store').then(j=>{if(active)setApp((Array.isArray(j?.items)?j.items:[]).find((x:any)=>x.slug===slug)||null)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[session?.accessToken,session?.tenantId,slug,request]);
 async function install(){if(busy||!app||app.installed)return;setBusy(true);setError('');try{
  const data=await request('/admin/apps/'+encodeURIComponent(slug)+'/install',{method:'POST',body:'{}'});
  if(data?.paymentRequired){if(typeof data.checkoutUrl==='string'&&data.checkoutUrl.startsWith('https://')){window.location.assign(data.checkoutUrl);return}throw new Error('Ücretli uygulama için ödeme bağlantısı bulunamadı.');}
  await refreshInstalledApps();router.push('/extensions/installed/'+encodeURIComponent(slug));
 }catch(e:any){setError(e.message||'Uygulama yüklenemedi')}finally{setBusy(false)}}
 const m=app?.marketplace||{};const shots=Array.isArray(m.screenshots)?m.screenshots.filter((s:any)=>typeof s==='string'&&(s.startsWith('https://')||s.startsWith('/'))):[];
 return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold">Uygulama İncele</h1><ToolbarDescription>Modül Marketi / {app?.name||slug}</ToolbarDescription></ToolbarHeading></Toolbar></Container>
 <Container className="grid gap-5"><div><Button asChild variant="outline" size="sm"><Link href="/extensions/market"><ArrowLeft/> Modül Marketine dön</Link></Button></div>
 {error&&<div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive" role="alert">{error}</div>}
 {loading?<div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin"/></div>:!app?<div className="rounded-xl border p-8">Uygulama bulunamadı.</div>:<>
 <div className="rounded-xl border bg-background p-6"><div className="flex flex-wrap items-center gap-4"><div className="grid size-16 place-items-center overflow-hidden rounded-xl border">{m.logoUrl?<img src={m.logoUrl} className="size-full object-contain" alt=""/>:<Puzzle className="size-8 text-primary"/>}</div><div className="min-w-0 grow"><h2 className="text-2xl font-semibold">{app.name}</h2><p className="mt-1 text-sm text-muted-foreground">{app.developer||'Ticarti'} · {app.category}</p><p className="mt-2 text-sm">{app.summary}</p></div><div className="grid gap-2 text-right"><strong className="text-lg">{app.included?'Pakete dahil':Number(app.price||0)>0?`${app.price} ${app.currency||'TRY'}`:'Ücretsiz'}</strong>{app.installed?<Button asChild><Link href={'/extensions/installed/'+encodeURIComponent(slug)}>Ayarla</Link></Button>:<Button disabled={busy} onClick={()=>void install()}>{busy?<LoaderCircle className="animate-spin"/>:<Download/>}{busy?'Yükleniyor…':'Yükle'}</Button>}</div></div></div>
 <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="grid content-start gap-5">
 {m.previewImageUrl||shots.length?<section className="rounded-xl border bg-background p-6"><h3 className="mb-4 text-lg font-semibold">Ekran Görüntüleri</h3><div className="grid gap-3 sm:grid-cols-2">{[...(m.previewImageUrl?[m.previewImageUrl]:[]),...shots].map((src:string,i:number)=><a key={src+i} href={src} target="_blank" rel="noopener noreferrer" aria-label={`${app.name} ekran görüntüsü ${i+1}`} className="overflow-hidden rounded-lg border"><img src={src} className="aspect-video w-full object-contain" alt={`${app.name} ekran görüntüsü ${i+1}`}/></a>)}</div></section>:null}
 <section className="rounded-xl border bg-background p-6"><h3 className="mb-3 text-lg font-semibold">Uygulama Hakkında</h3><p className="whitespace-pre-wrap text-sm leading-7">{app.description||app.summary||'Uygulama açıklaması eklenmemiş.'}</p></section>
 {m.usageGuide?<section className="rounded-xl border bg-background p-6"><h3 className="mb-3 text-lg font-semibold">Nasıl Kullanılır?</h3><p className="whitespace-pre-wrap text-sm leading-7">{m.usageGuide}</p></section>:null}
 {(app.permissions?.required?.length||app.permissions?.optional?.length)?<section className="rounded-xl border bg-background p-6"><h3 className="mb-3 text-lg font-semibold">Uygulama İzinleri</h3><div className="flex flex-wrap gap-2">{(app.permissions.required||[]).map((x:string)=><Badge key={x} appearance="light" variant="warning">Zorunlu · {x}</Badge>)}{(app.permissions.optional||[]).map((x:string)=><Badge key={x} appearance="light" variant="secondary">İsteğe bağlı · {x}</Badge>)}</div></section>:null}
 </div><aside className="rounded-xl border bg-background p-5 self-start"><h3 className="mb-4 font-semibold">Uygulama Bilgileri</h3><dl className="grid gap-3 text-sm"><dt className="text-muted-foreground">Geliştirici</dt><dd>{app.developer||'Ticarti'}</dd><dt className="text-muted-foreground">Tür</dt><dd>{app.integrationType||app.kind||app.category}</dd><dt className="text-muted-foreground">Kurulum sayısı</dt><dd>{Number(app.downloadCount||0).toLocaleString('tr-TR')}</dd><dt className="text-muted-foreground">Durum</dt><dd>{app.installed?'Kurulu':'Yüklü değil'}</dd></dl></aside></div>
 </>}</Container></>;
}
