'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

export type IntegrationPage='overview'|'marketing'|'shipping'|'invoice'|'marketplaces'|'payment';

type Provider={name:string;provider:string;type:string;icon:string;description:string};
const catalog:Record<Exclude<IntegrationPage,'overview'>,{title:string;description:string;providers:Provider[]}>= {
  marketing:{title:'Pazarlama Entegrasyonları',description:'Satış, mesajlaşma, reklam ve analiz kanallarınızı bağlayın.',providers:[
    {name:'WE AI',provider:'we-ai',type:'AI',icon:'iconoir:sparks',description:'AI içerik, ürün ve operasyon servisleri.'},
    {name:'WhatsApp',provider:'whatsapp',type:'MESSAGING',icon:'iconoir:chat-bubble',description:'AI destekli sipariş, destek ve satış mesajlaşması.'},
    {name:'Google Shopping',provider:'google-shopping',type:'MARKETING',icon:'iconoir:shopping-bag',description:'Ürün feed ve Merchant Center senkronizasyonu.'},
    {name:'Meta / Facebook Pixel',provider:'meta-pixel',type:'ANALYTICS',icon:'iconoir:facebook',description:'Meta Pixel ve dönüşüm olayları.'},
    {name:'SMS',provider:'sms',type:'MESSAGING',icon:'iconoir:message-text',description:'SMS servis sağlayıcısı bağlantısı.'},
    {name:'Google Analytics 4',provider:'google-analytics',type:'ANALYTICS',icon:'iconoir:stats-up-square',description:'GA4 e-ticaret olayları ve ölçümleme.'},
    {name:'Google Tag Manager',provider:'google-tag-manager',type:'ANALYTICS',icon:'iconoir:code-brackets-square',description:'Etiket ve ölçüm yönetimi.'},
  ]},
  shipping:{title:'Kargo Entegrasyonları',description:'Kargo firmaları, gönderi oluşturma ve takip bağlantıları.',providers:[
    {name:'Yurtiçi Kargo',provider:'yurtici',type:'SHIPPING',icon:'iconoir:delivery-truck',description:'Gönderi ve takip entegrasyonu.'},{name:'Aras Kargo',provider:'aras',type:'SHIPPING',icon:'iconoir:delivery-truck',description:'Gönderi ve takip entegrasyonu.'},{name:'MNG Kargo',provider:'mng',type:'SHIPPING',icon:'iconoir:delivery-truck',description:'Gönderi ve takip entegrasyonu.'},{name:'Sürat Kargo',provider:'surat',type:'SHIPPING',icon:'iconoir:delivery-truck',description:'Gönderi ve takip entegrasyonu.'},{name:'PTT Kargo',provider:'ptt',type:'SHIPPING',icon:'iconoir:delivery-truck',description:'Gönderi ve takip entegrasyonu.'},{name:'DHL / UPS / FedEx',provider:'global-shipping',type:'SHIPPING',icon:'iconoir:globe',description:'Global kargo bağlantıları.'}
  ]},
  invoice:{title:'Fatura Entegrasyonları',description:'e-Fatura, e-Arşiv ve muhasebe bağlantıları.',providers:[
    {name:'Paraşüt',provider:'parasut',type:'INVOICE',icon:'iconoir:reports',description:'Fatura ve muhasebe senkronizasyonu.'},{name:'Logo',provider:'logo',type:'INVOICE',icon:'iconoir:reports',description:'Logo e-Fatura / ERP entegrasyonu.'},{name:'Mikro',provider:'mikro',type:'INVOICE',icon:'iconoir:reports',description:'Mikro muhasebe bağlantısı.'},{name:'Nebim',provider:'nebim',type:'INVOICE',icon:'iconoir:reports',description:'Nebim ERP bağlantısı.'},{name:'Özel Entegratör',provider:'efatura-provider',type:'INVOICE',icon:'iconoir:cloud',description:'e-Fatura özel entegratör API bağlantısı.'}
  ]},
  marketplaces:{title:'Pazaryeri Entegrasyonları',description:'Ürün, stok, fiyat ve sipariş senkronizasyonu.',providers:[
    {name:'Trendyol',provider:'trendyol',type:'MARKETPLACE',icon:'iconoir:shop',description:'Ürün ve sipariş entegrasyonu.'},{name:'Hepsiburada',provider:'hepsiburada',type:'MARKETPLACE',icon:'iconoir:shop',description:'Ürün ve sipariş entegrasyonu.'},{name:'n11',provider:'n11',type:'MARKETPLACE',icon:'iconoir:shop',description:'Ürün ve sipariş entegrasyonu.'},{name:'Amazon',provider:'amazon',type:'MARKETPLACE',icon:'iconoir:shop',description:'Amazon marketplace bağlantısı.'},{name:'Pazarama',provider:'pazarama',type:'MARKETPLACE',icon:'iconoir:shop',description:'Ürün ve sipariş entegrasyonu.'},{name:'Çiçeksepeti',provider:'ciceksepeti',type:'MARKETPLACE',icon:'iconoir:shop',description:'Ürün ve sipariş entegrasyonu.'},{name:'PTTAVM',provider:'pttavm',type:'MARKETPLACE',icon:'iconoir:shop',description:'Ürün ve sipariş entegrasyonu.'}
  ]},
  payment:{title:'Ödeme Entegrasyonları',description:'Online ödeme sağlayıcılarını bağlayın.',providers:[
    {name:'iyzico',provider:'iyzico',type:'PAYMENT',icon:'iconoir:credit-card',description:'Kart ve ödeme API bağlantısı.'},{name:'PayTR',provider:'paytr',type:'PAYMENT',icon:'iconoir:credit-card',description:'Kart ve ödeme API bağlantısı.'},{name:'Param',provider:'param',type:'PAYMENT',icon:'iconoir:credit-card',description:'Kart ve ödeme API bağlantısı.'},{name:'Sipay',provider:'sipay',type:'PAYMENT',icon:'iconoir:credit-card',description:'Kart ve ödeme API bağlantısı.'},{name:'Stripe',provider:'stripe',type:'PAYMENT',icon:'iconoir:credit-card',description:'Global ödeme bağlantısı.'}
  ]},
};

const overview=[['marketing','Pazarlama','AI, WhatsApp, Google Shopping, Meta Pixel, SMS ve analiz'],['shipping','Kargo','Kargo firmaları ve gönderi takibi'],['invoice','Fatura','e-Fatura, e-Arşiv ve muhasebe'],['marketplaces','Pazaryerleri','Pazaryeri ürün ve sipariş senkronizasyonu'],['payment','Ödeme','Online ödeme sağlayıcıları']] as const;

export default function IntegrationView({page,data,req,reload}:{page:IntegrationPage;data:any;req:(p:string,o?:any)=>Promise<any>;reload:()=>Promise<void>}){
  const rows=Array.isArray(data?.integrations)?data.integrations:[];
  const[selected,setSelected]=useState<Provider|null>(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  if(page==='overview')return <div className="row g-3">{overview.map(([key,title,desc])=><div className="col-md-6 col-xl-4" key={key}><a href={'/integrations/'+key} className="card integration-overview-card h-100 text-decoration-none"><div className="card-body"><span className="setting-module-icon mb-3"><Icon icon={key==='marketing'?'iconoir:megaphone':key==='shipping'?'iconoir:delivery-truck':key==='invoice'?'iconoir:reports':key==='payment'?'iconoir:credit-card':'iconoir:shop'}/></span><h4>{title}</h4><p className="text-muted mb-0">{desc}</p></div></a></div>)}</div>;
  const section=catalog[page];
  const providers=section.providers;
  const connected=new Map<string,any>(rows.map((x:any)=>[String(x.provider),x]));
  async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await req('/admin/integrations',{method:'POST',body:JSON.stringify({type:selected.type,provider:selected.provider,name:String(f.get('name')||selected.name),credentials:{apiKey:String(f.get('apiKey')||''),apiSecret:String(f.get('apiSecret')||''),accountId:String(f.get('accountId')||'')},config:{note:String(f.get('note')||'')}})});setSelected(null);await reload()}catch(err:any){setError(err.message||'Entegrasyon kaydedilemedi')}finally{setBusy(false)}}
  async function toggle(row:any){setBusy(true);setError('');try{await req('/admin/integrations/'+row.id,{method:'PATCH',body:JSON.stringify({enabled:!row.enabled})});await reload()}catch(e:any){setError(e.message||'Durum değiştirilemedi')}finally{setBusy(false)}}
  return <>
    <div className="card mb-3"><div className="card-header"><h4 className="card-title mb-1">{section.title}</h4><p className="text-muted mb-0">{section.description}</p></div>{error&&<div className="card-body pt-0"><div className="alert alert-danger mb-0">{error}</div></div>}</div>
    <div className="row g-3">{providers.map(p=>{const row=connected.get(p.provider);return <div className="col-md-6 col-xl-4" key={p.provider}><div className="card h-100"><div className="card-body"><div className="d-flex align-items-start justify-content-between gap-3"><span className="integration-provider-icon"><Icon icon={p.icon}/></span>{row?<span className={'badge '+(row.enabled?'bg-success-subtle text-success':'bg-secondary-subtle text-secondary')}>{row.enabled?'Bağlı':'Pasif'}</span>:<span className="badge bg-light text-muted">Bağlı değil</span>}</div><h4 className="mt-3 mb-1">{p.name}</h4><p className="text-muted fs-12">{p.description}</p><div className="d-flex gap-2 mt-3">{row?<button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>void toggle(row)} disabled={busy}>{row.enabled?'Pasife Al':'Aktifleştir'}</button>:<button type="button" className="btn btn-sm btn-primary" onClick={()=>setSelected(p)}><Icon icon="iconoir:link" className="me-1"/>Bağla</button>}</div></div></div></div>})}</div>
    {selected&&<div className="media-modal-backdrop"><form className="media-modal card integration-connect-modal" onSubmit={create}><div className="card-header d-flex justify-content-between align-items-center"><div><h4 className="card-title mb-1">{selected.name} Bağlantısı</h4><p className="text-muted mb-0 fs-12">Kimlik bilgileri sunucuda şifreli saklanır ve listeleme API'sinde geri dönmez.</p></div><button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>setSelected(null)}><Icon icon="iconoir:xmark"/></button></div><div className="card-body pt-0"><div className="row g-3"><div className="col-12"><label className="form-label">Bağlantı Adı</label><input className="form-control" name="name" defaultValue={selected.name} required/></div><div className="col-md-6"><label className="form-label">API Key / Kullanıcı</label><input className="form-control" name="apiKey" autoComplete="off"/></div><div className="col-md-6"><label className="form-label">API Secret / Şifre</label><input className="form-control" name="apiSecret" type="password" autoComplete="new-password"/></div><div className="col-12"><label className="form-label">Hesap / Merchant ID</label><input className="form-control" name="accountId"/></div><div className="col-12"><label className="form-label">Not</label><textarea className="form-control" name="note" rows={2}/></div><div className="col-12 text-end"><button className="btn btn-primary" disabled={busy}>Bağlantıyı Kaydet</button></div></div></div></form></div>}
  </>;
}
