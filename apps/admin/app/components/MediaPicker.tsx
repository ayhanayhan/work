'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

type Props={
  sid:string;
  req:(path:string,options?:any)=>Promise<any>;
  upload:(file:File)=>Promise<any>;
  value?:string|null;
  onChange:(url:string,asset?:any)=>void;
  label?:string;
  buttonLabel?:string;
  compact?:boolean;
  pickerOnly?:boolean;
};

export default function MediaPicker({sid,req,upload,value,onChange,label='Görsel',buttonLabel='Medyadan Seç',compact=false,pickerOnly=false}:Props){
  const[open,setOpen]=useState(false);
  const[items,setItems]=useState<any[]>([]);
  const[query,setQuery]=useState('');
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const inputRef=useRef<HTMLInputElement|null>(null);

  async function load(){
    setLoading(true);setError('');
    try{const rows=await req('/admin/media?storeId='+encodeURIComponent(sid));setItems(Array.isArray(rows)?rows:[])}catch(e:any){setError(e.message||'Medya yüklenemedi')}finally{setLoading(false)}
  }
  useEffect(()=>{if(open)void load()},[open]);
  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('tr');return q?items.filter(x=>String(x.originalName||x.fileName||'').toLocaleLowerCase('tr').includes(q)||String(x.alt||'').toLocaleLowerCase('tr').includes(q)):items},[items,query]);
  async function add(file?:File){if(!file)return;setLoading(true);setError('');try{const asset=await upload(file);setItems(rows=>[asset,...rows]);onChange(asset.publicUrl,asset);setOpen(false)}catch(e:any){setError(e.message||'Görsel yüklenemedi')}finally{setLoading(false);if(inputRef.current)inputRef.current.value=''}}

  return <>
    <div className={compact?'media-picker compact':'media-picker'}>
      {label&&<label className="form-label d-block">{label}</label>}
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {!pickerOnly&&(value?<div className="media-picker-preview"><img src={value} alt=""/></div>:<div className="media-picker-preview empty"><Icon icon="iconoir:media-image"/></div>)}
        <button type="button" className="btn btn-outline-primary" onClick={()=>setOpen(true)}><Icon icon="iconoir:media-image" className="me-1"/>{buttonLabel}</button>
        {!pickerOnly&&<label className="btn btn-outline-secondary mb-0"><Icon icon="iconoir:upload" className="me-1"/>Yükle<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={e=>void add(e.target.files?.[0])}/></label>}
        {!pickerOnly&&value&&<button type="button" className="btn btn-outline-danger" onClick={()=>onChange('')}><Icon icon="iconoir:trash"/></button>}
      </div>
    </div>
    {open&&<div className="media-modal-backdrop" role="dialog" aria-modal="true">
      <div className="media-modal card">
        <div className="card-header d-flex align-items-center justify-content-between"><div><h4 className="card-title mb-1">Medya Kütüphanesi</h4><p className="text-muted mb-0 fs-12">Daha önce yüklenen görsellerden seçin veya yeni görsel ekleyin.</p></div><button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>setOpen(false)}><Icon icon="iconoir:xmark"/></button></div>
        <div className="card-body pt-0">
          <div className="d-flex gap-2 mb-3"><div className="input-group"><span className="input-group-text"><Icon icon="iconoir:search"/></span><input className="form-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Dosya ara..."/></div><label className="btn btn-primary mb-0 text-nowrap"><Icon icon="iconoir:upload" className="me-1"/>Yeni yükle<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={e=>void add(e.target.files?.[0])}/></label></div>
          {error&&<div className="alert alert-danger">{error}</div>}
          {loading&&<div className="text-muted py-4 text-center"><span className="spinner-border spinner-border-sm me-2"/>Yükleniyor...</div>}
          {!loading&&<div className="media-grid">{filtered.map(asset=><button type="button" key={asset.id} className={'media-grid-item '+(value===asset.publicUrl?'selected':'')} onClick={()=>{onChange(asset.publicUrl,asset);setOpen(false)}}><img src={asset.publicUrl} alt={asset.alt||asset.originalName||''}/><span>{asset.originalName||asset.fileName}</span>{value===asset.publicUrl&&<i><Icon icon="iconoir:check-circle"/></i>}</button>)}</div>}
          {!loading&&!filtered.length&&<div className="empty-state py-5 text-center"><Icon icon="iconoir:media-image" className="display-6 text-muted"/><h5 className="mt-3">Henüz görsel yok</h5><p className="text-muted">İlk görseli yükleyerek medya kütüphanesini oluşturun.</p></div>}
        </div>
      </div>
    </div>}
  </>;
}
