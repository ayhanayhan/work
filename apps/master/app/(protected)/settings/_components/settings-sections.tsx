'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useEffect, useMemo, useState } from 'react';
import { useMasterSession } from '@/app/components/MasterSession';

type Row={ [key:string]:any };

function DetailHead({title,description}:{title:string;description:string}){
  return <div className="settings-v15-detail-head"><div><h4 className="mb-1">{title}</h4><p className="text-muted mb-0">{description}</p><ol className="breadcrumb settings-v15-inline-breadcrumb mb-0"><li className="breadcrumb-item"><Link href="/dashboard">Commerce</Link></li><li className="breadcrumb-item"><Link href="/settings">Ayarlar</Link></li><li className="breadcrumb-item active">{title}</li></ol></div></div>;
}

function Notice({message,error}:{message:string;error:string}){
  if(!message&&!error)return null;
  return <div className={'alert '+(error?'alert-danger':'alert-success')}>{error||message}</div>;
}

export function GeneralSettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
  const[company,setCompany]=useState<Row>({});const[branding,setBranding]=useState<Row>({});

  async function load(){setLoading(true);setError('');try{const settings=await request('/superadmin/platform-settings');setCompany(settings?.company||{});setBranding(settings?.branding||{});}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);

  async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setMessage('');setError('');try{await request('/superadmin/platform-settings',{method:'PATCH',body:JSON.stringify({company,branding})});setMessage('Genel ayarlar kaydedildi.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}

  if(loading)return <div className="text-muted">Ayarlar yükleniyor…</div>;
  return <div className="settings-v15-detail">
    <DetailHead title="Genel Ayarlar" description="Platformun temel firma ve marka bilgileri."/>
    <form onSubmit={save}>
      <Notice message={message} error={error}/>
      <div className="row">
        <div className="col-xl-8">
          <div className="card">
            <div className="card-header"><div className="row"><div className="col"><h4 className="card-title mb-0">Firma Ayarları</h4><p className="text-muted mb-0 mt-1">Platformun temel sistem bilgileri.</p></div></div></div>
            <div className="card-body pt-0">
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Marka adı</label><input className="form-control" value={company.name||''} onChange={e=>setCompany({...company,name:e.target.value})}/></div>
                <div className="col-md-6"><label className="form-label">Firma / ticari unvan</label><input className="form-control" value={company.legalName||''} onChange={e=>setCompany({...company,legalName:e.target.value})}/></div>
                <div className="col-md-6"><label className="form-label">E-posta</label><input className="form-control" type="email" value={company.email||''} onChange={e=>setCompany({...company,email:e.target.value})}/></div>
                <div className="col-md-6"><label className="form-label">Telefon</label><input className="form-control" value={company.phone||''} onChange={e=>setCompany({...company,phone:e.target.value})}/></div>
                <div className="col-md-6"><label className="form-label">Web sitesi</label><input className="form-control" value={company.website||''} onChange={e=>setCompany({...company,website:e.target.value})}/></div>
                <div className="col-md-6"><label className="form-label">Vergi numarası</label><input className="form-control" value={company.taxNumber||''} onChange={e=>setCompany({...company,taxNumber:e.target.value})}/></div>
                <div className="col-md-12"><label className="form-label">Adres</label><textarea className="form-control" value={company.address||''} onChange={e=>setCompany({...company,address:e.target.value})}/></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card">
            <div className="card-header"><h4 className="card-title mb-0">Marka Görselleri</h4></div>
            <div className="card-body pt-0">
              {[['Logo','logoUrl'],['İkon','iconUrl'],['Beyaz logo','whiteLogoUrl'],['Beyaz ikon','whiteIconUrl']].map(([label,key])=><div key={key} style={{marginBottom:18}}>
                <label className="form-label">{label}</label>
                <div className="brand-preview">{branding[key]?<img src={branding[key]} alt=""/>:<span>Görsel seçilmedi</span>}</div>
                <input className="form-control" value={branding[key]||''} onChange={e=>setBranding({...branding,[key]:e.target.value})} placeholder="https://..."/>
              </div>)}
            </div>
          </div>
        </div>
      </div>
      <div className="settings-sticky-actions"><button type="submit" className="btn btn-primary px-4" disabled={saving}><Icon icon="iconoir:floppy-disk" className="me-2"/>{saving?'Kaydediliyor…':'Ayarları Kaydet'}</button></div>
    </form>
  </div>;
}

export function LanguageSettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');const[locales,setLocales]=useState<Row[]>([]);
  async function load(){setLoading(true);setError('');try{const settings=await request('/superadmin/platform-settings');setLocales(Array.isArray(settings?.locales)?settings.locales:[])}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  const defaultLocale=useMemo(()=>locales.find(x=>x.isDefault)?.locale||'', [locales]);
  function update(index:number,key:string,value:any){setLocales(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r))}
  async function save(){setSaving(true);setMessage('');setError('');try{await request('/superadmin/platform-settings',{method:'PATCH',body:JSON.stringify({locales})});setMessage('Dil ayarları kaydedildi.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}
  if(loading)return <div className="text-muted">Diller yükleniyor…</div>;
  return <div className="settings-v15-detail"><DetailHead title="Diller" description="Platform dillerini ve varsayılan dili yönetin."/><Notice message={message} error={error}/>
    <div className="card"><div className="card-header"><div className="row"><div className="col"><h4 className="card-title mb-0">Platform Dilleri</h4></div><div className="col-auto"><button className="btn btn-primary" type="button" onClick={()=>setLocales(x=>[...x,{locale:'',label:'',isActive:true,isDefault:false,sortOrder:x.length}])}><Icon icon="iconoir:plus" className="me-1"/>Dil Ekle</button></div></div></div><div className="card-body pt-0">
      {locales.length?locales.map((row,i)=><div className="settings-list-row" key={i}>
        <div><label className="form-label">Dil kodu</label><input className="form-control" value={row.locale||''} onChange={e=>update(i,'locale',e.target.value)}/></div>
        <div><label className="form-label">Görünen ad</label><input className="form-control" value={row.label||''} onChange={e=>update(i,'label',e.target.value)}/></div>
        <label className="switch-wrap"><input type="checkbox" checked={row.isActive!==false} onChange={e=>update(i,'isActive',e.target.checked)}/>Aktif</label>
        <div><label className="form-label">Varsayılan</label><select className="form-select" value={row.isDefault?'yes':'no'} onChange={e=>{if(e.target.value==='yes')setLocales(xs=>xs.map((x,j)=>({...x,isDefault:j===i,isActive:j===i?true:x.isActive})));else update(i,'isDefault',false)}}><option value="no">Hayır</option><option value="yes">Evet</option></select></div>
        <button type="button" className="btn btn-outline-danger icon-button" disabled={row.isDefault} onClick={()=>setLocales(x=>x.filter((_,j)=>j!==i))}><Icon icon="iconoir:trash"/></button>
      </div>):<div className="empty-state">Henüz dil tanımlanmamış.</div>}
      <div className="settings-default-note">Varsayılan dil: <b>{defaultLocale||'—'}</b></div>
    </div></div>
    <div className="settings-sticky-actions"><button className="btn btn-primary px-4" onClick={()=>void save()} disabled={saving}><Icon icon="iconoir:floppy-disk" className="me-2"/>{saving?'Kaydediliyor…':'Ayarları Kaydet'}</button></div>
  </div>;
}

export function CurrencySettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');const[currencies,setCurrencies]=useState<Row[]>([]);
  async function load(){setLoading(true);setError('');try{const settings=await request('/superadmin/platform-settings');setCurrencies(Array.isArray(settings?.currencies)?settings.currencies:[])}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  const defaultCurrency=useMemo(()=>currencies.find(x=>x.isDefault)?.code||'', [currencies]);
  function update(index:number,key:string,value:any){setCurrencies(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r))}
  async function save(){setSaving(true);setMessage('');setError('');try{await request('/superadmin/platform-settings',{method:'PATCH',body:JSON.stringify({currencies})});setMessage('Para birimi ayarları kaydedildi.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}
  if(loading)return <div className="text-muted">Para birimleri yükleniyor…</div>;
  return <div className="settings-v15-detail"><DetailHead title="Para Birimleri" description="Platform para birimlerini ve varsayılan para birimini yönetin."/><Notice message={message} error={error}/>
    <div className="card"><div className="card-header"><div className="row"><div className="col"><h4 className="card-title mb-0">Para Birimleri</h4></div><div className="col-auto"><button className="btn btn-primary" type="button" onClick={()=>setCurrencies(x=>[...x,{code:'',name:'',symbol:'',isActive:true,isDefault:false,sortOrder:x.length}])}><Icon icon="iconoir:plus" className="me-1"/>Para Birimi Ekle</button></div></div></div><div className="card-body pt-0">
      {currencies.length?currencies.map((row,i)=><div className="settings-list-row currency" key={i}>
        <div><label className="form-label">Kod</label><input className="form-control" value={row.code||''} onChange={e=>update(i,'code',e.target.value.toUpperCase())}/></div>
        <div><label className="form-label">Ad</label><input className="form-control" value={row.name||''} onChange={e=>update(i,'name',e.target.value)}/></div>
        <div><label className="form-label">Sembol</label><input className="form-control" value={row.symbol||''} onChange={e=>update(i,'symbol',e.target.value)}/></div>
        <label className="switch-wrap"><input type="checkbox" checked={row.isActive!==false} onChange={e=>update(i,'isActive',e.target.checked)}/>Aktif</label>
        <div><label className="form-label">Varsayılan</label><select className="form-select" value={row.isDefault?'yes':'no'} onChange={e=>{if(e.target.value==='yes')setCurrencies(xs=>xs.map((x,j)=>({...x,isDefault:j===i,isActive:j===i?true:x.isActive})));else update(i,'isDefault',false)}}><option value="no">Hayır</option><option value="yes">Evet</option></select></div>
        <button type="button" className="btn btn-outline-danger icon-button" disabled={row.isDefault} onClick={()=>setCurrencies(x=>x.filter((_,j)=>j!==i))}><Icon icon="iconoir:trash"/></button>
      </div>):<div className="empty-state">Henüz para birimi tanımlanmamış.</div>}
      <div className="settings-default-note">Varsayılan para birimi: <b>{defaultCurrency||'—'}</b></div>
    </div></div>
    <div className="settings-sticky-actions"><button className="btn btn-primary px-4" onClick={()=>void save()} disabled={saving}><Icon icon="iconoir:floppy-disk" className="me-2"/>{saving?'Kaydediliyor…':'Ayarları Kaydet'}</button></div>
  </div>;
}

export function SocialAuthSettings(){
  const{request}=useMasterSession();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
  const[social,setSocial]=useState<any>({providers:{google:{enabled:false,clientId:'',clientSecret:''},facebook:{enabled:false,clientId:'',clientSecret:''}}});
  async function load(){setLoading(true);setError('');try{const auth=await request('/superadmin/customer-auth').catch(()=>({providers:{}}));setSocial({providers:{google:{...auth?.providers?.google,clientSecret:''},facebook:{...auth?.providers?.facebook,clientSecret:''}}})}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  async function save(){setSaving(true);setMessage('');setError('');try{await request('/superadmin/customer-auth',{method:'PATCH',body:JSON.stringify(social)});setMessage('Sosyal giriş ayarları kaydedildi.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}
  if(loading)return <div className="text-muted">Sosyal giriş ayarları yükleniyor…</div>;
  return <div className="settings-v15-detail"><DetailHead title="Sosyal Giriş" description="Google ve Facebook müşteri giriş ayarları."/><Notice message={message} error={error}/>
    <div className="social-auth-grid">{(['google','facebook'] as const).map(provider=>{const p=social.providers?.[provider]||{};return <div className="card" key={provider}><div className="card-header"><div className="row"><div className="col"><h4 className="card-title mb-0" style={{textTransform:'capitalize'}}>{provider}</h4></div><div className="col-auto"><label className="switch-wrap"><input type="checkbox" checked={p.enabled!==false} onChange={e=>setSocial((s:any)=>({...s,providers:{...s.providers,[provider]:{...s.providers?.[provider],enabled:e.target.checked}}}))}/>Aktif</label></div></div></div><div className="card-body pt-0"><div className="row g-3"><div className="col-12"><label className="form-label">Client ID</label><input className="form-control" value={p.clientId||''} onChange={e=>setSocial((s:any)=>({...s,providers:{...s.providers,[provider]:{...s.providers?.[provider],clientId:e.target.value}}}))}/></div><div className="col-12"><label className="form-label">Client Secret</label><input className="form-control" type="password" value={p.clientSecret||''} placeholder={p.secretConfigured?'Kayıtlı · değiştirmek için yeni değer girin':'Client Secret'} onChange={e=>setSocial((s:any)=>({...s,providers:{...s.providers,[provider]:{...s.providers?.[provider],clientSecret:e.target.value}}}))}/></div></div></div></div>})}</div>
    <div className="settings-sticky-actions"><button className="btn btn-primary px-4" onClick={()=>void save()} disabled={saving}><Icon icon="iconoir:floppy-disk" className="me-2"/>{saving?'Kaydediliyor…':'Ayarları Kaydet'}</button></div>
  </div>;
}
