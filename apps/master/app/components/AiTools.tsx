'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

export function AiTranslateButton({sid,req,sourceLocale,targetLocale,fields,onResult,className='btn btn-sm btn-outline-primary'}:{sid:string;req:(p:string,o?:any)=>Promise<any>;sourceLocale:string;targetLocale:string;fields:Record<string,string>;onResult:(fields:Record<string,string>)=>void;className?:string}){
  const[enabled,setEnabled]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  useEffect(()=>{let live=true;req('/admin/ai/status').then((x:any)=>{if(live)setEnabled(!!x?.config?.translationEnabled)}).catch(()=>{});return()=>{live=false}},[]);
  if(!enabled||!targetLocale||targetLocale===sourceLocale)return null;
  async function run(){setBusy(true);setError('');try{const r=await req('/admin/ai/translate',{method:'POST',body:JSON.stringify({storeId:sid,sourceLocale,targetLocale,fields,emptyOnly:true})});onResult(r.fields||{})}catch(e:any){setError(e.message||'Çeviri yapılamadı')}finally{setBusy(false)}}
  return <span className="d-inline-flex align-items-center gap-2"><button type="button" className={className} disabled={busy} onClick={()=>void run()}><Icon icon="iconoir:translate" className="me-1"/>{busy?'Çevriliyor…':'AI ile Çevir'}</button>{error&&<small className="text-danger">{error}</small>}</span>;
}

const USE_CASES=[['STUDIO','Stüdyo ürün fotoğrafı'],['LIFESTYLE','Kullanım / lifestyle'],['DETAIL','Detay / makro'],['HERO','Hero / banner'],['CATEGORY','Kategori görseli'],['BLOG','Blog kapağı'],['SOCIAL','Sosyal medya']] as const;

export function AiImageGenerator({sid,req,onGenerated,defaultUseCase='STUDIO',sourceImageUrl,label='AI ile Görsel Oluştur'}:{sid:string;req:(p:string,o?:any)=>Promise<any>;onGenerated:(asset:any)=>void;defaultUseCase?:string;sourceImageUrl?:string;label?:string}){
  const[enabled,setEnabled]=useState(false);const[open,setOpen]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[prompt,setPrompt]=useState('');const[useCase,setUseCase]=useState(defaultUseCase);const[mode,setMode]=useState<'PROMPT'|'REFERENCE'>(sourceImageUrl?'REFERENCE':'PROMPT');const[reference,setReference]=useState(sourceImageUrl||'');
  useEffect(()=>{let live=true;req('/admin/ai/status').then((x:any)=>{if(live)setEnabled(!!x?.config?.imageEnabled)}).catch(()=>{});return()=>{live=false}},[]);
  useEffect(()=>{if(sourceImageUrl)setReference(sourceImageUrl)},[sourceImageUrl]);
  if(!enabled)return null;
  async function generate(){if(!prompt.trim()){setError('Prompt gerekli');return}setBusy(true);setError('');try{const r=await req('/admin/ai/image',{method:'POST',body:JSON.stringify({storeId:sid,prompt,useCase,size:'1024x1024',sourceImageUrl:mode==='REFERENCE'?(reference||sourceImageUrl||null):null})});if(r.asset){onGenerated(r.asset);setOpen(false);setPrompt('')}}catch(e:any){setError(e.message||'Görsel oluşturulamadı')}finally{setBusy(false)}}
  return <>
    <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>setOpen(true)}><Icon icon="iconoir:sparks" className="me-1"/>{label}</button>
    {open&&<div className="media-modal-backdrop"><div className="media-modal card ai-image-modal"><div className="card-header d-flex justify-content-between align-items-center"><div><h4 className="card-title mb-1">AI Görsel Oluştur</h4><p className="text-muted mb-0 fs-12">Prompttan veya mevcut bir görseli referans alarak yeni medya üretin.</p></div><button type="button" className="btn btn-sm btn-light" onClick={()=>setOpen(false)}><Icon icon="iconoir:xmark"/></button></div><div className="card-body pt-0"><div className="row g-3">
      <div className="col-md-6"><label className="form-label">Yöntem</label><select className="form-select" value={mode} onChange={e=>setMode(e.target.value as any)}><option value="PROMPT">Prompttan oluştur</option><option value="REFERENCE">Görselden oluştur</option></select></div>
      <div className="col-md-6"><label className="form-label">Görsel tipi</label><select className="form-select" value={useCase} onChange={e=>setUseCase(e.target.value)}>{USE_CASES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      {mode==='REFERENCE'&&<div className="col-12"><label className="form-label">Referans görsel URL</label><input className="form-control" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Medya kütüphanesindeki görsel URL'si"/></div>}
      <div className="col-12"><label className="form-label">Prompt</label><textarea className="form-control" rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ürünü, ortamı, ışığı, kamera açısını ve istediğiniz sonucu tarif edin."/></div>
      <div className="col-12"><div className="alert alert-info py-2 mb-0 fs-12"><Icon icon="iconoir:info-circle" className="me-1"/>AI ile üretilen medya kaynak bilgisiyle işaretlenir. Ürün görseli olarak kullanıldığında storefront'ta küçük AI rozeti gösterilir.</div></div>
      {error&&<div className="col-12"><div className="alert alert-danger mb-0">{error}</div></div>}
      <div className="col-12 text-end"><button type="button" className="btn btn-primary" onClick={()=>void generate()} disabled={busy}>{busy?<><span className="spinner-border spinner-border-sm me-2"/>Oluşturuluyor…</>:<><Icon icon="iconoir:sparks" className="me-1"/>Görsel Oluştur</>}</button></div>
    </div></div></div></div>}
  </>;
}

export function AiBadge(){return <span className="ai-generated-badge" title="AI ile oluşturuldu"><Icon icon="iconoir:sparks"/> AI</span>}
