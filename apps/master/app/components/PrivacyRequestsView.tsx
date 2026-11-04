'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

const labels:any={ACCESS:'Verilerime erişim',DELETE:'Silme',RECTIFY:'Düzeltme',PORTABILITY:'Taşınabilirlik',RESTRICT:'Kısıtlama',OBJECT:'İtiraz'};
const statusLabels:any={RECEIVED:'Alındı',VERIFYING:'Doğrulanıyor',IN_PROGRESS:'İşlemde',COMPLETED:'Tamamlandı',REJECTED:'Reddedildi'};

export default function PrivacyRequestsView({data,sid,req,reload}:{data:any;sid:string;req:(p:string,o?:any)=>Promise<any>;reload:()=>Promise<void>}){
  const rows=Array.isArray(data?.requests)?data.requests:[];
  const[status,setStatus]=useState('');
  const[query,setQuery]=useState('');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const filtered=useMemo(()=>rows.filter((r:any)=>(!status||r.status===status)&&(!query.trim()||String(r.email||'').toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')))),[rows,status,query]);
  async function update(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await req('/admin/privacy/requests/'+f.get('id'),{method:'PATCH',body:JSON.stringify({storeId:sid,status:f.get('status'),responseNote:f.get('responseNote')})});await reload()}catch(err:any){setError(err.message||'Talep güncellenemedi')}finally{setBusy(false)}}
  return <>
    <div className="row g-3 mb-3">{[['Toplam',rows.length,'iconoir:shield-check'],['Yeni',rows.filter((x:any)=>x.status==='RECEIVED').length,'iconoir:bell-notification'],['İşlemde',rows.filter((x:any)=>['VERIFYING','IN_PROGRESS'].includes(x.status)).length,'iconoir:clock'],['Tamamlanan',rows.filter((x:any)=>x.status==='COMPLETED').length,'iconoir:check-circle']].map(([label,value,icon])=><div className="col-md-3" key={String(label)}><div className="card"><div className="card-body"><div className="d-flex align-items-center justify-content-between"><div><span className="text-muted">{label}</span><h3 className="mb-0 mt-1">{value}</h3></div><span className="setting-module-icon"><Icon icon={String(icon)}/></span></div></div></div></div>)}</div>
    <div className="card"><div className="card-header"><div className="row align-items-center"><div className="col"><h4 className="card-title mb-1">KVKK / GDPR Talepleri</h4><p className="text-muted mb-0">Müşterilerin erişim, düzeltme, silme ve diğer veri sahibi taleplerini takip edin.</p></div></div></div><div className="card-body pt-0">
      {error&&<div className="alert alert-danger">{error}</div>}
      <div className="row g-2 mb-3"><div className="col-md-7"><div className="input-group"><span className="input-group-text"><Icon icon="iconoir:search"/></span><input className="form-control" placeholder="E-posta ara..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="col-md-5"><select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tüm durumlar</option>{Object.entries(statusLabels).map(([k,v])=><option value={k} key={k}>{String(v)}</option>)}</select></div></div>
      <div className="table-responsive"><table className="table table-hover table-centered"><thead className="table-light"><tr><th>Müşteri</th><th>Talep</th><th>Durum</th><th>Son Tarih</th><th>Oluşturma</th></tr></thead><tbody>{filtered.map((r:any)=><tr key={r.id}><td><strong>{r.email}</strong></td><td>{labels[r.type]||r.type}</td><td><span className={'badge '+(r.status==='COMPLETED'?'bg-success-subtle text-success':r.status==='REJECTED'?'bg-danger-subtle text-danger':'bg-warning-subtle text-warning')}>{statusLabels[r.status]||r.status}</span></td><td>{r.dueAt?new Date(r.dueAt).toLocaleDateString('tr-TR'):'-'}</td><td>{new Date(r.createdAt).toLocaleString('tr-TR')}</td></tr>)}</tbody></table></div>
      {!filtered.length&&<div className="text-center text-muted py-4">Talep bulunamadı.</div>}
    </div></div>
    {rows.length>0&&<div className="card"><div className="card-header"><h4 className="card-title mb-0">Talep İşlemi</h4></div><div className="card-body pt-0"><form className="row g-3" onSubmit={update}><div className="col-md-4"><label className="form-label">Talep</label><select name="id" className="form-select">{rows.map((r:any)=><option value={r.id} key={r.id}>{r.email} · {labels[r.type]||r.type}</option>)}</select></div><div className="col-md-3"><label className="form-label">Durum</label><select name="status" className="form-select"><option value="VERIFYING">Doğrulanıyor</option><option value="IN_PROGRESS">İşlemde</option><option value="COMPLETED">Tamamlandı</option><option value="REJECTED">Reddedildi</option></select></div><div className="col-md-5"><label className="form-label">İşlem Notu</label><input name="responseNote" className="form-control" placeholder="İç not / yanıt özeti"/></div><div className="col-12 text-end"><button className="btn btn-primary" disabled={busy}>Talebi Güncelle</button></div></form></div></div>}
  </>;
}
