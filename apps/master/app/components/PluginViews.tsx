'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { AiAppView } from './AiViews';

export type PluginPage='store'|'installed'|'detail';

type Props={
  page:PluginPage;
  data:any;
  slug?:string;
  sid:string;
  req:(p:string,o?:any)=>Promise<any>;
  reload:()=>Promise<void>;
  refreshInstalledApps:()=>Promise<any[]>;
};

function AppIcon({app,size='normal'}:{app:any;size?:'normal'|'large'}){
  const logo=String(app?.marketplace?.logoUrl||'').trim();
  if(logo)return <span className={'plugin-icon plugin-logo '+(size==='large'?'plugin-icon-lg':'')}><img src={logo} alt=""/></span>;
  return <span className={'plugin-icon '+(size==='large'?'plugin-icon-lg':'')}><Icon icon={app?.icon||'iconoir:puzzle'} /></span>;
}
function money(price:number,currency:string,billingType:string,included:boolean){
  if(included)return 'Paketine dahil';
  if(!price)return 'Ücretsiz';
  const suffix=billingType==='MONTHLY'?'/ ay':billingType==='YEARLY'?'/ yıl':'';
  return `${Number(price).toLocaleString('tr-TR')} ${currency}${suffix}`;
}

export default function PluginView({page,data,slug,sid,req,reload,refreshInstalledApps}:Props){
  if(page==='store')return <PluginStore data={data} req={req} reload={reload} refreshInstalledApps={refreshInstalledApps}/>;
  if(page==='installed')return <InstalledApps data={data} req={req} reload={reload} refreshInstalledApps={refreshInstalledApps}/>;
  return <PluginDetail data={data} slug={slug||''} sid={sid} req={req} reload={reload} refreshInstalledApps={refreshInstalledApps}/>;
}

function PluginStore({data,req,reload,refreshInstalledApps}:Pick<Props,'data'|'req'|'reload'|'refreshInstalledApps'>){
  const items=Array.isArray(data?.items)?data.items:[];
  const[query,setQuery]=useState('');
  const[category,setCategory]=useState('Tümü');
  const[progress,setProgress]=useState<Record<string,number>>({});
  const[error,setError]=useState('');
  const[detail,setDetail]=useState<any|null>(null);
  const categories=useMemo<string[]>(()=>['Tümü',...Array.from(new Set<string>(items.map((x:any)=>String(x.category||'Diğer'))))],[items]);
  const filtered=items.filter((x:any)=>{
    const q=query.trim().toLocaleLowerCase('tr');
    const text=`${x.name} ${x.summary} ${x.category} ${x.developer}`.toLocaleLowerCase('tr');
    return (!q||text.includes(q))&&(category==='Tümü'||x.category===category);
  });

  async function install(app:any){
    if(app.installed)return;
    setError('');setProgress(x=>({...x,[app.slug]:8}));
    const timer=window.setInterval(()=>setProgress(x=>({...x,[app.slug]:Math.min(86,(x[app.slug]||8)+7)})),180);
    try{
      const r=await req(`/admin/apps/${encodeURIComponent(app.slug)}/install`,{method:'POST',body:'{}'});
      window.clearInterval(timer);
      if(r?.paymentRequired&&r?.checkoutUrl){setProgress(x=>({...x,[app.slug]:100}));window.location.href=r.checkoutUrl;return}
      setProgress(x=>({...x,[app.slug]:100}));
      await refreshInstalledApps();await reload();
      window.setTimeout(()=>setProgress(x=>{const n={...x};delete n[app.slug];return n}),650);
      setDetail(null);
    }catch(e:any){window.clearInterval(timer);setProgress(x=>{const n={...x};delete n[app.slug];return n});setError(e.message||'Eklenti kurulamadı')}
  }

  return <>
    <div className="card mb-3 plugin-market-hero"><div className="card-body py-3"><div className="row align-items-center g-3"><div className="col-lg-7"><div className="d-flex align-items-center gap-3"><span className="plugin-market-mark"><Icon icon="iconoir:puzzle"/></span><div><h3 className="mb-1">Eklenti Mağazası</h3><p className="text-muted mb-0">Kargo, fatura, muhasebe, pazaryeri, pazarlama ve AI uygulamalarını mağazana ekle.</p></div></div></div><div className="col-lg-5"><div className="input-group"><span className="input-group-text"><Icon icon="iconoir:search"/></span><input className="form-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Eklenti ara..."/></div></div></div></div></div>
    {error&&<div className="alert alert-danger">{error}</div>}
    <div className="plugin-category-tabs mb-3">{categories.map(c=><button type="button" key={c} onClick={()=>setCategory(c)} className={'btn btn-sm '+(category===c?'btn-primary':'btn-outline-secondary')}>{c}</button>)}</div>
    <div className="row g-3">{filtered.map((app:any)=>{const p=progress[app.slug];return <div className="col-sm-6 col-lg-4 col-xxl-3" key={app.id}><div className={'card h-100 plugin-card plugin-card-compact '+(app.isFeatured?'plugin-featured ':'')+(app.installed?'plugin-installed':'')}><div className="card-body p-3 d-flex flex-column"><div className="d-flex justify-content-between align-items-start gap-2"><AppIcon app={app}/><div className="d-flex flex-column align-items-end gap-1">{app.installed&&<span className="badge bg-success-subtle text-success"><Icon icon="iconoir:check-circle" className="me-1"/>Yüklü</span>}{app.isFeatured&&<span className="badge bg-primary-subtle text-primary">Öne çıkan</span>}</div></div><h5 className="mt-3 mb-1 plugin-card-title">{app.name}</h5><div className="text-muted fs-12 mb-2">{app.developer} · {app.category}</div><p className="text-muted plugin-card-summary flex-grow-1">{app.summary}</p><div className="plugin-card-meta"><span><Icon icon="iconoir:download"/> {Number(app.downloadCount||0).toLocaleString('tr-TR')}</span><strong>{money(app.price,app.currency,app.billingType,app.included)}</strong></div><div className="d-flex gap-2 mt-3">{app.installed?<Link className="btn btn-sm btn-success flex-grow-1" href={`/plugins/my-apps/${app.slug}`}><Icon icon="iconoir:settings" className="me-1"/>Ayarlar</Link>:<button type="button" className="btn btn-sm btn-primary flex-grow-1" onClick={()=>setDetail(app)}><Icon icon="iconoir:eye" className="me-1"/>İncele / Ekle</button>}</div>{p!==undefined&&<div className="mt-2"><div className="progress plugin-install-progress"><div className="progress-bar progress-bar-striped progress-bar-animated" style={{width:`${p}%`}}>{p}%</div></div></div>}</div></div></div>})}{!filtered.length&&<div className="col-12"><div className="card"><div className="card-body text-center text-muted py-5">Aramana uygun eklenti bulunamadı.</div></div></div>}</div>
    {detail&&<PluginStoreModal app={detail} progress={progress[detail.slug]} onClose={()=>setDetail(null)} onInstall={()=>void install(detail)}/>} 
  </>;
}

function PluginStoreModal({app,progress,onClose,onInstall}:{app:any;progress?:number;onClose:()=>void;onInstall:()=>void}){
  const m=app?.marketplace||{};const shots=Array.isArray(m.screenshots)?m.screenshots.filter(Boolean):[];
  return <div className="plugin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="plugin-modal-card"><div className="plugin-modal-head"><div className="d-flex align-items-center gap-3"><AppIcon app={app} size="large"/><div><div className="d-flex align-items-center gap-2 flex-wrap"><h3 className="mb-0">{app.name}</h3><span className="badge bg-light text-secondary">{app.category}</span></div><div className="text-muted mt-1">{app.developer}</div></div></div><button type="button" className="btn btn-sm btn-light" onClick={onClose}><Icon icon="iconoir:xmark"/></button></div><div className="plugin-modal-body"><div className="plugin-modal-main"><p className="plugin-modal-description">{app.description||app.summary}</p><div className="plugin-facts"><span><Icon icon="iconoir:download"/><b>{Number(app.downloadCount||0).toLocaleString('tr-TR')}</b><small>kurulum</small></span><span><Icon icon="iconoir:wallet"/><b>{money(app.price,app.currency,app.billingType,app.included)}</b><small>fiyat</small></span><span><Icon icon="iconoir:shield-check"/><b>{app.installed?'Yüklü':'Hazır'}</b><small>durum</small></span></div>{m.usageGuide&&<div className="plugin-detail-section"><h5>Nasıl kullanılır?</h5><div className="plugin-detail-copy">{String(m.usageGuide).split('\n').map((line:string,i:number)=><p key={i}>{line}</p>)}</div></div>}{shots.length>0&&<div className="plugin-detail-section"><h5>Ekran görüntüleri</h5><div className="plugin-screenshot-grid">{shots.map((src:string,i:number)=><button type="button" key={src+i} className="plugin-shot" onClick={()=>window.open(src,'_blank','noopener,noreferrer')}><img src={src} alt={`${app.name} ekran görüntüsü ${i+1}`}/></button>)}</div></div>}</div><aside className="plugin-modal-aside"><div className="plugin-price-box"><small className="text-muted d-block">{app.included?'Paket avantajı':'Uygulama fiyatı'}</small><strong>{money(app.price,app.currency,app.billingType,app.included)}</strong><p className="text-muted fs-12 mb-3">Kurulum tamamlandıktan sonra Uygulamalarım alanından ayarlarını yönetebilirsin.</p>{app.installed?<Link href={`/plugins/my-apps/${app.slug}`} className="btn btn-success w-100">Yüklü · Ayarlara Git</Link>:<button type="button" className="btn btn-primary w-100" disabled={progress!==undefined} onClick={onInstall}>{progress!==undefined?'Kuruluyor…':app.price>0&&!app.included?'Satın Al ve Kur':'Uygulamayı Ekle'}</button>}{progress!==undefined&&<div className="mt-3"><div className="progress plugin-install-progress"><div className="progress-bar progress-bar-striped progress-bar-animated" style={{width:`${progress}%`}}>{progress}%</div></div><small className="text-muted">Uygulama hazırlanıyor…</small></div>}</div></aside></div></div></div>;
}

function InstalledApps({data,req,reload,refreshInstalledApps}:Pick<Props,'data'|'req'|'reload'|'refreshInstalledApps'>){
  const rows=Array.isArray(data)?data:[];
  const[busy,setBusy]=useState('');const[error,setError]=useState('');
  async function state(row:any,enabled:boolean){setBusy(row.app.slug);setError('');try{await req(`/admin/apps/installed/${encodeURIComponent(row.app.slug)}/state`,{method:'PATCH',body:JSON.stringify({enabled})});await refreshInstalledApps();await reload()}catch(e:any){setError(e.message||'Durum değiştirilemedi')}finally{setBusy('')}}
  async function remove(row:any){if(!window.confirm(`${row.app.name} uygulamasını kaldırmak istiyor musun? Bağlantı pasife alınacak.`))return;setBusy(row.app.slug);setError('');try{await req(`/admin/apps/installed/${encodeURIComponent(row.app.slug)}`,{method:'DELETE'});await refreshInstalledApps();await reload()}catch(e:any){setError(e.message||'Eklenti kaldırılamadı')}finally{setBusy('')}}
  return <>{error&&<div className="alert alert-danger">{error}</div>}<div className="card mb-3"><div className="card-header d-flex justify-content-between align-items-center"><div><h4 className="card-title mb-1">Uygulamalarım</h4><p className="text-muted mb-0">Kurulu uygulamaları etkinleştir, ayarlarını yönet veya kaldır.</p></div><Link href="/plugins/store" className="btn btn-sm btn-primary"><Icon icon="iconoir:plus" className="me-1"/>Eklenti ekle</Link></div></div><div className="row g-3">{rows.map((row:any)=><div className="col-sm-6 col-lg-4 col-xxl-3" key={row.id}><div className={'card h-100 plugin-card plugin-card-compact '+(row.enabled?'plugin-installed':'')}><div className="card-body p-3 d-flex flex-column"><div className="d-flex justify-content-between align-items-start"><AppIcon app={row.app}/><span className={'badge '+(row.enabled?'bg-success-subtle text-success':'bg-secondary-subtle text-secondary')}>{row.enabled?'Aktif':'Pasif'}</span></div><h5 className="mt-3 mb-1">{row.app.name}</h5><div className="text-muted fs-12 mb-2">{row.app.category} · {row.source==='SUPERADMIN'?'Yönetici tarafından eklendi':row.source==='PLAN'?'Pakete dahil':'Mağazadan eklendi'}</div><p className="text-muted plugin-card-summary flex-grow-1">{row.app.summary}</p><div className="d-flex flex-wrap gap-2"><Link href={`/plugins/my-apps/${row.app.slug}`} className="btn btn-sm btn-primary">Ayarlar</Link><button className="btn btn-sm btn-outline-secondary" disabled={busy===row.app.slug} onClick={()=>void state(row,!row.enabled)}>{row.enabled?'Pasife Al':'Aktifleştir'}</button><button className="btn btn-sm btn-outline-danger" disabled={busy===row.app.slug} onClick={()=>void remove(row)}>Kaldır</button></div></div></div></div>)}{!rows.length&&<div className="col-12"><div className="card"><div className="card-body text-center py-5"><Icon icon="iconoir:puzzle" width="42" className="text-muted mb-3"/><h4>Henüz uygulama yok</h4><p className="text-muted">Eklenti mağazasından mağazana uygulama ekleyebilirsin.</p><Link href="/plugins/store" className="btn btn-primary">Eklenti Mağazasına Git</Link></div></div></div>}</div></>;
}

function FixedCurrencyApp({plugin,slug,req,reload,refreshInstalledApps}:any){
  const[busy,setBusy]=useState(false);const[enabled,setEnabled]=useState(plugin?.install?.enabled!==false);const[err,setErr]=useState('');
  async function change(next:boolean){setBusy(true);setErr('');try{await req(`/admin/apps/installed/${encodeURIComponent(slug)}/state`,{method:'PATCH',body:JSON.stringify({enabled:next})});setEnabled(next);await refreshInstalledApps();await reload()}catch(e:any){setErr(e.message||'Durum değiştirilemedi')}finally{setBusy(false)}}
  return <><div className="card mb-3"><div className="card-body"><div className="d-flex align-items-center gap-3"><AppIcon app={plugin.app}/><div className="flex-grow-1"><h3 className="mb-1">{plugin.app.name}</h3><p className="text-muted mb-0">{plugin.app.description||plugin.app.summary}</p></div><Link href="/plugins/my-apps" className="btn btn-outline-secondary btn-sm">Uygulamalarıma dön</Link></div></div></div>{err&&<div className="alert alert-danger">{err}</div>}<div className="card"><div className="card-body"><div className="d-flex justify-content-between align-items-center gap-3"><div><h4 className="mb-1">Durum</h4><p className="text-muted mb-0">Açık olduğunda ürün fiyat alanında mağazada aktif para birimleri için sabit fiyat kutuları görünür.</p></div><div className="form-check form-switch fs-4"><input className="form-check-input" type="checkbox" checked={enabled} disabled={busy} onChange={e=>void change(e.target.checked)}/></div></div></div></div></>;
}

function PluginDetail({data,slug,sid,req,reload,refreshInstalledApps}:Omit<Props,'page'>){
  const plugin=data?.plugin;const app=plugin?.app;
  if(!plugin||!app)return <div className="card"><div className="card-body">Uygulama bulunamadı.</div></div>;
  if(slug==='we-ai-assistant')return <AiAppView data={data?.ai||{}} sid={sid} req={req} reload={reload}/>;
  if(slug==='fixed-currency-prices')return <FixedCurrencyApp plugin={plugin} slug={slug} req={req} reload={reload} refreshInstalledApps={refreshInstalledApps}/>;
  const fields=Array.isArray(app.settingsSchema?.fields)?app.settingsSchema.fields:[];
  const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const credentials:any={};for(const f of fields)credentials[f.key]=String(fd.get(f.key)||'');setBusy(true);setMsg('');setErr('');try{await req(`/admin/apps/installed/${encodeURIComponent(slug)}/settings`,{method:'PATCH',body:JSON.stringify({credentials,config:{note:String(fd.get('note')||'')}})});setMsg('Entegrasyon ayarları kaydedildi.');await reload()}catch(e:any){setErr(e.message||'Kaydedilemedi')}finally{setBusy(false)}}
  return <><div className="card mb-3"><div className="card-body"><div className="d-flex align-items-center gap-3"><AppIcon app={app}/><div className="flex-grow-1"><div className="d-flex flex-wrap align-items-center gap-2"><h3 className="mb-0">{app.name}</h3><span className="badge bg-light text-secondary">{app.category}</span></div><p className="text-muted mb-0 mt-1">{app.description||app.summary}</p></div><Link href="/plugins/my-apps" className="btn btn-outline-secondary btn-sm">Uygulamalarıma dön</Link></div></div></div>{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}<div className="card"><div className="card-header"><h4 className="card-title mb-1">Entegrasyon Ayarları</h4><p className="text-muted mb-0">Bağlantı bilgileri şifreli saklanır. Mevcut gizli anahtarlar güvenlik nedeniyle tekrar gösterilmez.</p></div><form className="card-body pt-0" onSubmit={save}><div className="row g-3">{fields.map((f:any)=><div className="col-md-6" key={f.key}><label className="form-label">{f.label}</label><input className="form-control" name={f.key} type={f.type==='password'?'password':'text'} autoComplete={f.type==='password'?'new-password':'off'} placeholder={plugin.connection&&f.type==='password'?'Bağlantı mevcut — değiştirmek için yeni değer girin':''}/></div>)}<div className="col-12"><label className="form-label">Not</label><textarea name="note" className="form-control" rows={3} defaultValue={plugin.connection?.config?.note||plugin.install?.config?.note||''}/></div><div className="col-12 text-end"><button className="btn btn-primary" disabled={busy}>{busy?'Kaydediliyor…':'Ayarları Kaydet'}</button></div></div></form></div></>;
}
