'use client';

import { useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

export default function MediaLibraryView({data,sid,req,upload,reload}:{data:any;sid:string;req:(p:string,o?:any)=>Promise<any>;upload:(f:File)=>Promise<any>;reload:()=>Promise<void>}){
  const rows=Array.isArray(data?.media)?data.media:[];
  const[query,setQuery]=useState('');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const input=useRef<HTMLInputElement|null>(null);
  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('tr');return q?rows.filter((x:any)=>String(x.originalName||x.fileName||'').toLocaleLowerCase('tr').includes(q)||String(x.alt||'').toLocaleLowerCase('tr').includes(q)):rows},[rows,query]);
  async function uploadFiles(files:FileList|null){if(!files?.length)return;setBusy(true);setError('');try{for(const file of Array.from(files))await upload(file);await reload()}catch(e:any){setError(e.message||'Dosya yüklenemedi')}finally{setBusy(false);if(input.current)input.current.value=''}}
  async function remove(id:string){if(!confirm('Bu medya dosyasını silmek istiyor musunuz?'))return;setBusy(true);setError('');try{await req('/admin/media/'+id+'?storeId='+encodeURIComponent(sid),{method:'DELETE'});await reload()}catch(e:any){setError(e.message||'Dosya silinemedi')}finally{setBusy(false)}}
  return <>
    <div className="card mb-3"><div className="card-header"><div className="row align-items-center"><div className="col"><h4 className="card-title mb-1">Medya Kütüphanesi</h4><p className="text-muted mb-0">Ürün, logo, sayfa, blog ve tasarım görsellerini tek yerden yönetin.</p></div><div className="col-auto"><label className="btn btn-primary mb-0"><Icon icon="iconoir:upload" className="me-1"/>Medya Ekle<input ref={input} hidden multiple type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>void uploadFiles(e.target.files)}/></label></div></div></div>
      <div className="card-body pt-0"><div className="row g-2 align-items-center"><div className="col-md-6"><div className="input-group"><span className="input-group-text"><Icon icon="iconoir:search"/></span><input className="form-control" placeholder="Dosya adı veya alt metin ara..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="col-md-6 text-md-end text-muted fs-12">{rows.length} medya dosyası · JPEG / PNG / WEBP / AVIF · Maks. 10 MB</div></div>{error&&<div className="alert alert-danger mt-3 mb-0">{error}</div>}</div>
    </div>
    {busy&&<div className="alert alert-info"><span className="spinner-border spinner-border-sm me-2"/>İşlem sürüyor...</div>}
    <div className="media-library-grid">{filtered.map((asset:any)=><div className="card media-library-card" key={asset.id}><div className="media-library-image position-relative"><img src={asset.publicUrl} alt={asset.alt||asset.originalName||''}/>{asset.source==='AI'&&<span className="ai-generated-badge">AI</span>}</div><div className="card-body"><div className="d-flex justify-content-between gap-2 align-items-start"><div className="min-w-0"><strong className="d-block text-truncate" title={asset.originalName}>{asset.originalName||asset.fileName}</strong><small className="text-muted">{asset.mimeType} · {(Number(asset.size||0)/1024).toFixed(0)} KB</small></div><button className="btn btn-sm btn-outline-danger" type="button" onClick={()=>void remove(asset.id)}><Icon icon="iconoir:trash"/></button></div><div className="input-group input-group-sm mt-3"><input className="form-control" readOnly value={asset.publicUrl}/><button type="button" className="btn btn-outline-secondary" onClick={()=>void navigator.clipboard?.writeText(asset.publicUrl)}><Icon icon="iconoir:copy"/></button></div></div></div>)}</div>
    {!filtered.length&&<div className="card"><div className="card-body py-5 text-center"><Icon icon="iconoir:media-image" className="display-5 text-muted"/><h4 className="mt-3">{query?'Aramaya uygun medya bulunamadı':'Henüz medya eklenmemiş'}</h4><p className="text-muted">Görseller yüklendiğinde burada WordPress benzeri bir medya kütüphanesinde toplanır.</p></div></div>}
  </>;
}
