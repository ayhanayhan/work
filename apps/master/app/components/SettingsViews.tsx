'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import MediaPicker from './MediaPicker';
import SettingsV17Router from './SettingsV17';

export type SettingsPage='home'|'general'|'addresses'|'regional'|'logs'|'cache'|'checkout'|'shipping'|'payment'|'contracts'|'maintenance'|'license'|'domains'|'languages'|'tax'|'mobile'|'invoice'|'shipping-label'|'stock-locations'|'email-templates'|'sms-templates'|'email-domain'|'notifications'|'devices'|'api-keys'|'webhooks'|'images'|'delete-store';

type CommonProps={
  data:any;
  sid:string;
  req:(path:string,options?:any)=>Promise<any>;
  upload:(file:File)=>Promise<any>;
  reload:()=>Promise<void>;
};

type SocialLink={platform:string;url:string};

type AddressDraft={
  key:string;label:string;address1:string;address2:string;postalCode:string;phone:string;country:string;state:string;isDefault:boolean;
};

const socialPlatforms=['Instagram','Facebook','X / Twitter','TikTok','YouTube','LinkedIn','Pinterest','WhatsApp','Diğer'];
type SettingsModule={id:SettingsPage;icon:string;title:string;description:string};
type SettingsGroup={title:string;subtitle:string;items:SettingsModule[]};
const settingsGroups:SettingsGroup[]=[
  {title:'MAĞAZA & MARKA',subtitle:'Kimlik, alan adı ve dil',items:[
    {id:'general',icon:'iconoir:shop',title:'Mağaza Ayarları',description:'Mağaza adı, iletişim bilgileri ve adres.'},
    {id:'domains',icon:'iconoir:globe',title:'Alan Adları',description:'Özel alan adı bağlama ve storefront adresi.'},
    {id:'languages',icon:'iconoir:language',title:'Diller ve Para Birimleri',description:'Mağaza dilleri, para birimleri ve döviz kurları.'},
    {id:'mobile',icon:'iconoir:smartphone-device',title:'Mobil Uygulama',description:'Mobil uygulama kimliği ve marka ayarları.'},
    {id:'images',icon:'iconoir:media-image',title:'Görsel Boyutları',description:'WebP/AVIF sıkıştırma, ürün kartı ve vitrin görsel ölçüleri.'},
  ]},
  {title:'ÖDEME & VERGİ',subtitle:'Tahsilat ve faturalama',items:[
    {id:'payment',icon:'iconoir:credit-card',title:'Ödeme Yöntemleri',description:'Ödeme tipleri, ücretler ve durumları.'},
    {id:'tax',icon:'iconoir:page',title:'Vergiler',description:'Ülke ve kategori bazlı vergi bölgeleri.'},
    {id:'invoice',icon:'iconoir:page-edit',title:'Faturalar',description:'Fatura numarası, otomatik düzenleme ve e-belge tercihleri.'},
  ]},
  {title:'KARGO & TESLİMAT',subtitle:'Gönderi ve stok noktaları',items:[
    {id:'shipping',icon:'iconoir:delivery-truck',title:'Kargo',description:'Teslimat yöntemleri ve kargo ücretleri.'},
    {id:'shipping-label',icon:'iconoir:tag',title:'Kargo Etiketi',description:'Etiket boyutu, logo ve yazdırma tercihleri.'},
    {id:'stock-locations',icon:'iconoir:warehouse',title:'Stok Lokasyonları',description:'Depo, mağaza ve sevkiyat noktaları.'},
  ]},
  {title:'İLETİŞİM & ŞABLONLAR',subtitle:'Müşteriye giden mesajlar',items:[
    {id:'email-templates',icon:'iconoir:mail',title:'E-Posta Şablonları',description:'Sipariş, kargo ve sepet e-postalarının içerikleri.'},
    {id:'sms-templates',icon:'iconoir:message-text',title:'SMS Şablonları',description:'Sipariş ve kargo SMS metinleri.'},
    {id:'email-domain',icon:'iconoir:mail',title:'E-Posta Domain Ayarları',description:'Gönderici alan adı, DKIM/SPF hazırlığı ve reply-to.'},
    {id:'notifications',icon:'iconoir:bell-notification',title:'Bildirimler',description:'Mağaza içi yönetici bildirim tercihleri.'},
  ]},
  {title:'OPERASYON & YASAL',subtitle:'Mağaza davranışı ve yasal içerikler',items:[
    {id:'checkout',icon:'iconoir:cart',title:'Checkout',description:'Tek sayfa ödeme ve müşteri alanı davranışları.'},
    {id:'contracts',icon:'iconoir:page-edit',title:'Sözleşmeler',description:'Mesafeli satış, KVKK, iade ve yasal sayfa eşleştirmeleri.'},
    {id:'maintenance',icon:'iconoir:tools',title:'Yapım Aşamasında',description:'Bakım modu ve açılış geri sayımı.'},
    {id:'cache',icon:'iconoir:database-backup',title:'Cache',description:'Storefront ve uygulama önbelleği.'},
    {id:'delete-store',icon:'iconoir:trash',title:'Mağazamı Sil',description:'E-posta onayıyla 15 günlük kalıcı silme sürecini yönetin.'},
  ]},
  {title:'GÜVENLİK',subtitle:'Hesap ve erişim',items:[
    {id:'devices',icon:'iconoir:devices',title:'Giriş Yapılan Cihazlar',description:'Aktif yönetici oturumlarını görün ve tanımadıklarınızı kaldırın.'},
  ]},
  {title:'GELİŞMİŞ',subtitle:'API ve teknik',items:[
    {id:'api-keys',icon:'iconoir:key',title:'API Anahtarları',description:'Commerce API için güvenli erişim anahtarları oluşturun.'},
    {id:'webhooks',icon:'iconoir:web-window-energy-consumption',title:'Webhooks',description:'Sipariş ve stok olaylarını dış sistemlere bildirin.'},
  ]},
];
const settingsModules:SettingsModule[]=settingsGroups.flatMap(group=>group.items);

function countryName(code:string){
  try{return new Intl.DisplayNames(['tr'],{type:'region'}).of(code)||code}catch{return code}
}

function localDateTime(value?:string|null){
  if(!value)return '';
  const d=new Date(value); if(Number.isNaN(d.getTime()))return '';
  const pad=(n:number)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsViewRouter({page,...props}:CommonProps&{page:SettingsPage}){
  if(page==='logs')return <LogsSettings {...props}/>;
  return <SettingsStudio page={page} {...props}/>;
}

function SettingsStudio({page,...props}:CommonProps&{page:SettingsPage}){
  const params=useSearchParams();
  const requested=String(params.get('tab')||'');
  const fallback=page==='home'?'':page;
  const active=(settingsModules.some(x=>x.id===requested)?requested:fallback) as SettingsPage|'';
  if(!active)return <SettingsHome data={props.data}/>;
  const item=settingsModules.find(x=>x.id===active);
  return <div className="settings-v15-detail"><div className="settings-v15-detail-head"><div><h4 className="mb-1">{item?.title||'Ayarlar'}</h4><p className="text-muted mb-0">{item?.description||''}</p><ol className="breadcrumb settings-v15-inline-breadcrumb mb-0"><li className="breadcrumb-item"><Link href="/dashboard">Commerce</Link></li><li className="breadcrumb-item"><Link href="/settings">Ayarlar</Link></li><li className="breadcrumb-item active">{item?.title||'Ayarlar'}</li></ol></div></div>{renderSetting(active,props)}</div>;
}

function renderSetting(active:SettingsPage,props:CommonProps){
  if(['domains','languages','regional','tax','shipping','shipping-label','stock-locations','notifications'].includes(active))return <SettingsV17Router page={active} {...props}/>;
  if(active==='license')return <LicenseSettings {...props}/>;
  if(active==='general')return <GeneralSettings {...props}/>;
  if(active==='domains')return <DomainsSettings {...props}/>;
  if(active==='languages')return <RegionalSettings {...props} initialTab="languages"/>;
  if(active==='tax')return <RegionalSettings {...props} initialTab="tax"/>;
  if(active==='mobile')return <MobileAppSettings {...props}/>;
  if(active==='payment')return <PaymentSettings {...props}/>;
  if(active==='invoice')return <InvoiceSettings {...props}/>;
  if(active==='shipping')return <ShippingSettings {...props}/>;
  if(active==='shipping-label')return <ShippingLabelSettings {...props}/>;
  if(active==='stock-locations')return <StockLocationsSettings {...props}/>;
  if(active==='email-templates')return <TemplateSettings {...props} kind="email"/>;
  if(active==='sms-templates')return <TemplateSettings {...props} kind="sms"/>;
  if(active==='email-domain')return <EmailDomainSettings {...props}/>;
  if(active==='notifications')return <NotificationSettings {...props}/>;
  if(active==='devices')return <DeviceSettings {...props}/>;
  if(active==='api-keys')return <ApiKeysSettings {...props}/>;
  if(active==='webhooks')return <WebhooksSettings {...props}/>;
  if(active==='checkout')return <CheckoutSettings {...props}/>;
  if(active==='regional')return <RegionalSettings {...props}/>;
  if(active==='maintenance')return <MaintenanceSettings {...props}/>;
  if(active==='contracts')return <ContractSettings {...props}/>;
  if(active==='cache')return <CacheSettings {...props}/>;
  if(active==='images')return <ImageSettings {...props}/>;
  if(active==='delete-store')return <DeleteStoreSettings {...props}/>;
  return <div className="card"><div className="card-body">Ayar bulunamadı.</div></div>;
}

function SettingsHome({data}:{data:any}){
  return <div className="settings-v15-home">{settingsGroups.map(group=><section key={group.title} className="settings-v15-group"><div className="settings-v15-group-title"><b>{group.title}</b><span>{group.subtitle}</span></div><div className="settings-v15-grid">{group.items.map(item=><Link href={`/settings?tab=${item.id}`} className="settings-v15-card text-decoration-none" key={item.id}><span className="setting-module-icon"><Icon icon={item.icon}/></span><div><b>{item.title}</b><p>{item.description}</p></div><Icon icon="iconoir:nav-arrow-right" className="settings-v15-arrow"/></Link>)}</div></section>)}</div>;
}

function GeneralSettings(props:CommonProps){
  const params=useSearchParams();
  const tab=params.get('subtab')==='comments'?'comments':params.get('subtab')==='address'?'address':'store';
  return <>
    <ul className="nav nav-tabs mb-3">
      <li className="nav-item"><Link className={'nav-link '+(tab==='store'?'active':'')} href="/settings?tab=general&subtab=store"><Icon icon="iconoir:shop" className="me-1"/> Mağaza Ayarları</Link></li>
      <li className="nav-item"><Link className={'nav-link '+(tab==='address'?'active':'')} href="/settings?tab=general&subtab=address"><Icon icon="iconoir:map-pin" className="me-1"/> Mağaza Adresi</Link></li>
      <li className="nav-item"><Link className={'nav-link '+(tab==='comments'?'active':'')} href="/settings?tab=general&subtab=comments"><Icon icon="iconoir:chat-bubble" className="me-1"/> Yorum Ayarları</Link></li>
    </ul>
    {tab==='comments'?<CommentSettings {...props}/>:tab==='address'?<AddressesSettings {...props}/>:<StoreGeneralSettings {...props}/>} 
  </>;
}

function StoreGeneralSettings({data,sid,req,upload,reload}:CommonProps){
  const s=data?.settings||{};
  const refs=data?.refs||{countries:[],locales:[],currencies:[],timezones:[]};
  const[logoUrl,setLogoUrl]=useState(s.logoUrl||'');
  const[faviconUrl,setFaviconUrl]=useState(s.faviconUrl||'');
  const[socialLinks,setSocialLinks]=useState<SocialLink[]>(Array.isArray(s.settings?.socialLinks)?s.settings.socialLinks:[]);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');


  async function uploadAsset(file:File,kind:'logo'|'favicon'){
    setError('');
    try{const asset=await upload(file);if(kind==='logo')setLogoUrl(asset.publicUrl);else setFaviconUrl(asset.publicUrl)}catch(e:any){setError(e.message||'Görsel yüklenemedi')}
  }

  function changeSocial(index:number,key:keyof SocialLink,value:string){setSocialLinks(rows=>rows.map((x,i)=>i===index?{...x,[key]:value}:x))}

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setSaving(true);setMessage('');setError('');
    const f=new FormData(e.currentTarget);
    const settings={...(s.settings||{}),adminLocale:String(f.get('adminLocale')||'tr-TR'),socialLinks:socialLinks.filter(x=>x.url.trim())};
    try{
      await req('/admin/site/'+sid,{method:'PATCH',body:JSON.stringify({
        name:String(f.get('name')||''),companyName:String(f.get('companyName')||'')||null,taxOffice:String(f.get('taxOffice')||'')||null,taxNumber:String(f.get('taxNumber')||'')||null,email:String(f.get('email')||''),phone:String(f.get('phone')||''),logoUrl:logoUrl||null,faviconUrl:faviconUrl||null,
        timezone:String(f.get('timezone')||'Europe/Istanbul'),settings
      })});
      setMessage('Genel ayarlar kaydedildi.');await reload();
    }catch(e:any){setError(e.message||'Ayarlar kaydedilemedi')}finally{setSaving(false)}
  }

  return <form onSubmit={save}>
    {message&&<div className="alert alert-success d-flex align-items-center" role="alert"><Icon icon="iconoir:check-circle" className="me-2"/>{message}</div>}
    {error&&<div className="alert alert-danger d-flex align-items-center" role="alert"><Icon icon="iconoir:warning-triangle" className="me-2"/>{error}</div>}

    <div className="row">
      <div className="col-xl-8">
        <div className="card">
          <div className="card-header"><div className="row align-items-center"><div className="col"><h4 className="card-title mb-0">Mağaza Ayarları</h4><p className="text-muted mb-0 mt-1">Mağazanın temel sistem bilgileri.</p></div></div></div>
          <div className="card-body pt-0">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Marka / mağaza adı</label><input className="form-control" name="name" defaultValue={s.name||''} required/></div>
              <div className="col-md-6"><label className="form-label">Firma / ticari unvan</label><input className="form-control" name="companyName" defaultValue={s.companyName||''} placeholder="Sözleşmelerde kullanılacak resmi unvan"/></div>
              <div className="col-md-6"><label className="form-label">Vergi dairesi</label><input className="form-control" name="taxOffice" defaultValue={s.taxOffice||''}/></div>
              <div className="col-md-6"><label className="form-label">Vergi numarası</label><input className="form-control" name="taxNumber" defaultValue={s.taxNumber||''}/></div>
              <div className="col-md-6"><label className="form-label">E-posta</label><input className="form-control" name="email" type="email" defaultValue={s.email||''}/></div>
              <div className="col-md-6"><label className="form-label">Telefon</label><input className="form-control" name="phone" defaultValue={s.phone||''}/></div>
              <div className="col-md-6"><label className="form-label">Yönetim sayfası dili</label><select className="form-select" name="adminLocale" defaultValue={s.settings?.adminLocale||'tr-TR'}>{(refs.locales||[]).map((x:string)=><option key={x} value={x}>{x}</option>)}</select></div>
              <div className="col-md-12"><label className="form-label">Zaman dilimi</label><select className="form-select" name="timezone" defaultValue={s.timezone||'Europe/Istanbul'}>{(refs.timezones||[]).map((x:string)=><option key={x} value={x}>{x}</option>)}</select></div>
            </div>
          </div>
        </div>


        <div className="card">
          <div className="card-header"><div className="row align-items-center"><div className="col"><h4 className="card-title mb-0">Sosyal Medya Hesapları</h4><p className="text-muted mb-0 mt-1">İstediğiniz kadar hesap ekleyebilirsiniz.</p></div><div className="col-auto"><button type="button" className="btn btn-sm btn-primary" onClick={()=>setSocialLinks(x=>[...x,{platform:'Instagram',url:''}])}><Icon icon="iconoir:plus" className="me-1"/> Hesap ekle</button></div></div></div>
          <div className="card-body pt-0">
            {socialLinks.length===0?<div className="text-center py-4 text-muted">Henüz sosyal medya hesabı eklenmedi.</div>:socialLinks.map((row,i)=><div className="social-row" key={i}><div><label className="form-label">Platform</label><select className="form-select" value={row.platform} onChange={e=>changeSocial(i,'platform',e.target.value)}>{socialPlatforms.map(x=><option key={x}>{x}</option>)}</select></div><div><label className="form-label">Hesap URL</label><input className="form-control" type="url" value={row.url} onChange={e=>changeSocial(i,'url',e.target.value)} placeholder="https://..."/></div><button type="button" className="btn btn-outline-danger" onClick={()=>setSocialLinks(x=>x.filter((_,idx)=>idx!==i))} aria-label="Hesabı kaldır"><Icon icon="iconoir:trash"/></button></div>)}
          </div>
        </div>
      </div>

      <div className="col-xl-4">
        <div className="card">
          <div className="card-header"><h4 className="card-title mb-0">Marka Görselleri</h4></div>
          <div className="card-body pt-0">
            <MediaPicker sid={sid} req={req} upload={upload} value={logoUrl} onChange={setLogoUrl} label="Logo"/>
            <div className="mt-4"><MediaPicker sid={sid} req={req} upload={upload} value={faviconUrl} onChange={setFaviconUrl} label="Favicon" compact/></div>
          </div>
        </div>

                <div className="card"><div className="card-header"><h4 className="card-title mb-0">Sistem Bilgisi</h4></div><div className="card-body pt-0"><dl className="row mb-0 fs-12"><dt className="col-5 text-muted">Site ID</dt><dd className="col-7 text-break">{s.id||'-'}</dd><dt className="col-5 text-muted">Public slug</dt><dd className="col-7">{s.publicSlug||'-'}</dd><dt className="col-5 text-muted">Durum</dt><dd className="col-7"><span className="badge bg-success-subtle text-success">{s.status||'ACTIVE'}</span></dd></dl></div></div>
      </div>
    </div>

    <div className="settings-sticky-actions"><button type="submit" className="btn btn-primary px-4" disabled={saving}>{saving?<><span className="spinner-border spinner-border-sm me-2"/>Kaydediliyor…</>:<><Icon icon="iconoir:floppy-disk" className="me-2"/>Ayarları Kaydet</>}</button></div>
  </form>;
}

function CommentSettings({data,sid,req,reload}:CommonProps){
  const settings=data?.settings?.settings||{};
  const cfg=settings.commentSettings||{};
  const product={enabled:cfg.productReviews?.enabled??true,autoApprove:cfg.productReviews?.autoApprove??false,allowGuest:cfg.productReviews?.allowGuest??true};
  const blog={enabled:cfg.blogComments?.enabled??true,autoApprove:cfg.blogComments?.autoApprove??false,allowGuest:cfg.blogComments?.allowGuest??true};
  const[saving,setSaving]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setMsg('');setErr('');const f=new FormData(e.currentTarget);try{await req('/admin/store-settings/'+sid+'/comment-settings',{method:'PATCH',body:JSON.stringify({productReviews:{enabled:f.get('productEnabled')==='on',autoApprove:f.get('productAutoApprove')==='on',allowGuest:f.get('productAllowGuest')==='on'},blogComments:{enabled:f.get('blogEnabled')==='on',autoApprove:f.get('blogAutoApprove')==='on',allowGuest:f.get('blogAllowGuest')==='on'}})});setMsg('Yorum ayarları kaydedildi.');await reload()}catch(x:any){setErr(x.message||'Yorum ayarları kaydedilemedi')}finally{setSaving(false)}}
  const block=(title:string,prefix:string,v:any,desc:string)=><div className="card"><div className="card-header"><h4 className="card-title mb-0">{title}</h4><p className="text-muted mb-0 mt-1">{desc}</p></div><div className="card-body pt-0"><div className="row g-3"><div className="col-md-4"><div className="form-check form-switch"><input className="form-check-input" name={prefix+'Enabled'} type="checkbox" defaultChecked={v.enabled} id={prefix+'Enabled'}/><label className="form-check-label fw-semibold" htmlFor={prefix+'Enabled'}>Yorum izni</label></div><div className="form-text">Kapalıysa yeni yorum gönderilemez.</div></div><div className="col-md-4"><div className="form-check form-switch"><input className="form-check-input" name={prefix+'AutoApprove'} type="checkbox" defaultChecked={v.autoApprove} id={prefix+'AutoApprove'}/><label className="form-check-label fw-semibold" htmlFor={prefix+'AutoApprove'}>Otomatik onay</label></div><div className="form-text">Açıksa yeni yorumlar moderasyon beklemeden yayınlanır.</div></div><div className="col-md-4"><div className="form-check form-switch"><input className="form-check-input" name={prefix+'AllowGuest'} type="checkbox" defaultChecked={v.allowGuest} id={prefix+'AllowGuest'}/><label className="form-check-label fw-semibold" htmlFor={prefix+'AllowGuest'}>Misafir yorumu</label></div><div className="form-text">Üye olmayan ziyaretçilerin yorum yapmasına izin verir.</div></div></div></div></div>;
  return <form onSubmit={save}>{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}{block('Ürün Yorumları','product',product,'Ürün detay sayfalarındaki değerlendirme ve yorum davranışı.')}{block('Blog Yorumları','blog',blog,'Blog yazılarının altındaki yorum davranışı.')}<div className="settings-sticky-actions"><button className="btn btn-primary px-4" disabled={saving}><Icon icon="iconoir:floppy-disk" className="me-2"/>{saving?'Kaydediliyor…':'Yorum Ayarlarını Kaydet'}</button></div></form>;
}

function AddressesSettings({data,sid,req,reload}:CommonProps){
  const s=data?.settings||{};const refs=data?.refs||{countries:[]};
  const rows=Array.isArray(s.addresses)?s.addresses:[];
  const editorRef=useRef<HTMLDivElement|null>(null);
  const[editing,setEditing]=useState<any|null>(null);
  const[showEditor,setShowEditor]=useState(false);
  const[country,setCountry]=useState('TR');const[province,setProvince]=useState('');const[subdivisions,setSubdivisions]=useState<any[]>([]);
  const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');

  useEffect(()=>{req('/admin/reference-data?country='+encodeURIComponent(country)).then((x:any)=>setSubdivisions(Array.isArray(x.subdivisions)?x.subdivisions:[])).catch(()=>setSubdivisions([]))},[country]);
  function openNew(){setEditing(null);setCountry(s.defaultCountry||'TR');setProvince('');setShowEditor(true);setTimeout(()=>editorRef.current?.scrollIntoView({behavior:'smooth'}),20)}
  function openEdit(row:any){setEditing(row);setCountry(row.country||s.defaultCountry||'TR');setProvince(row.state||row.city||'');setShowEditor(true);setTimeout(()=>editorRef.current?.scrollIntoView({behavior:'smooth'}),20)}
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setMessage('');const f=new FormData(e.currentTarget);const label=String(f.get('label')||'Adres');const key=editing?.key||('address-'+Date.now());try{await req('/admin/store-settings/'+sid+'/addresses',{method:'POST',body:JSON.stringify({key,label,address1:String(f.get('address1')||''),address2:String(f.get('address2')||''),postalCode:String(f.get('postalCode')||''),phone:String(f.get('phone')||''),country,state:province,city:province,district:null,admin1Id:null,admin2Id:null,localityId:null,neighborhoodId:null,isDefault:f.get('isDefault')==='on'})});setMessage(editing?'Adres güncellendi.':'Adres eklendi.');setShowEditor(false);setEditing(null);await reload()}catch(e:any){setError(e.message||'Adres kaydedilemedi')}finally{setSaving(false)}}

  return <>
    {message&&<div className="alert alert-success">{message}</div>}{error&&<div className="alert alert-danger">{error}</div>}
    <div className="card">
      <div className="card-header"><div className="row align-items-center"><div className="col"><h4 className="card-title mb-0">Adresler</h4><p className="text-muted mb-0 mt-1">Ülke ve il/eyalet seviyesinde sade adres yönetimi.</p></div><div className="col-auto"><button type="button" className="btn btn-primary" onClick={openNew}><Icon icon="iconoir:plus" className="me-1"/> Adres Ekle</button></div></div></div>
      <div className="card-body pt-0"><div className="table-responsive"><table className="table table-hover mb-0 table-centered"><thead className="table-light"><tr><th>Etiket</th><th>Adres</th><th>İl / Eyalet</th><th>Ülke</th><th>Varsayılan</th><th className="text-end">İşlem</th></tr></thead><tbody>{rows.length?rows.map((r:any)=><tr key={r.id||r.key}><td className="fw-semibold">{r.label}</td><td>{r.address1}</td><td>{r.state||r.city||'-'}</td><td>{countryName(r.country)}</td><td>{r.isDefault?<span className="badge bg-success-subtle text-success">Varsayılan</span>:<span className="text-muted">—</span>}</td><td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>openEdit(r)}><Icon icon="iconoir:edit-pencil" className="me-1"/> Düzenle</button></td></tr>):<tr><td colSpan={6} className="text-center text-muted py-4">Henüz adres eklenmedi.</td></tr>}</tbody></table></div></div>
    </div>
    {showEditor&&<div ref={editorRef} className="card address-editor"><div className="card-header"><div className="row align-items-center"><div className="col"><h4 className="card-title mb-0">{editing?'Adresi Düzenle':'Yeni Adres'}</h4></div><div className="col-auto"><button type="button" className="btn btn-sm btn-light" onClick={()=>setShowEditor(false)}>Kapat</button></div></div></div><div className="card-body pt-0"><form onSubmit={save}><div className="row g-3">
      <div className="col-md-6"><label className="form-label">Adres etiketi</label><input className="form-control" name="label" defaultValue={editing?.label||''} placeholder="Merkez, İade, Depo..." required/></div>
      <div className="col-md-6"><label className="form-label">Telefon</label><input className="form-control" name="phone" defaultValue={editing?.phone||''}/></div>
      <div className="col-md-6"><label className="form-label">Ülke</label><select className="form-select" value={country} onChange={e=>{setCountry(e.target.value);setProvince('')}}>{(refs.countries||[]).map((c:string)=><option value={c} key={c}>{countryName(c)}</option>)}</select></div>
      <div className="col-md-6"><label className="form-label">İl / Eyalet</label>{subdivisions.length?<select className="form-select" value={province} onChange={e=>setProvince(e.target.value)} required><option value="">Seçiniz</option>{subdivisions.map((x:any)=><option value={x.name} key={x.code}>{x.name}</option>)}</select>:<input className="form-control" value={province} onChange={e=>setProvince(e.target.value)} required/>}</div>
      <div className="col-12"><label className="form-label">Adres</label><input className="form-control" name="address1" defaultValue={editing?.address1||''} required/></div>
      <div className="col-md-8"><label className="form-label">Adres devamı</label><input className="form-control" name="address2" defaultValue={editing?.address2||''}/></div>
      <div className="col-md-4"><label className="form-label">Posta kodu</label><input className="form-control" name="postalCode" defaultValue={editing?.postalCode||''}/></div>
      <div className="col-12"><div className="form-check"><input className="form-check-input" type="checkbox" name="isDefault" id="addressDefault" defaultChecked={!!editing?.isDefault}/><label className="form-check-label" htmlFor="addressDefault">Varsayılan mağaza adresi</label></div></div>
      <div className="col-12 d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={()=>setShowEditor(false)}>Vazgeç</button><button className="btn btn-primary" disabled={saving}>{saving?'Kaydediliyor…':'Kaydet'}</button></div>
    </div></form></div></div>}
  </>;
}

function RegionalSettings({data,sid,req,reload,initialTab='tax'}:CommonProps&{initialTab?:'tax'|'languages'|'currencies'|'units'}){
  const r=data?.regional||{};const refs=data?.refs||{locales:[],currencies:[]};const[tab,setTab]=useState<'tax'|'languages'|'currencies'|'units'>(initialTab);const[selectedLocales,setSelectedLocales]=useState<string[]>((r.locales||[]).filter((x:any)=>x.isEnabled!==false).map((x:any)=>x.locale));const[selectedCurrencies,setSelectedCurrencies]=useState<string[]>((r.currencies||[]).filter((x:any)=>x.isEnabled!==false).map((x:any)=>x.code));const[defaultLocale,setDefaultLocale]=useState(r.defaultLocale||'tr-TR');const[defaultCurrency,setDefaultCurrency]=useState(r.defaultCurrency||'TRY');const[weightUnit,setWeightUnit]=useState(r.weightUnit||'kg');const[dimensionUnit,setDimensionUnit]=useState(r.dimensionUnit||'cm');const[defaultRate,setDefaultRate]=useState(Number(r.tax?.defaultRate??20));const[pricesIncludeTax,setPricesIncludeTax]=useState(r.tax?.pricesIncludeTax!==false);const[enabledRates,setEnabledRates]=useState<number[]>(Array.isArray(r.tax?.enabledRates)?r.tax.enabledRates:[20]);const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');
  async function save(){setBusy(true);setMsg('');setErr('');try{await req('/admin/store-settings/'+sid+'/regional',{method:'PATCH',body:JSON.stringify({locales:selectedLocales,defaultLocale,currencies:selectedCurrencies,defaultCurrency,weightUnit,dimensionUnit,tax:{defaultRate,pricesIncludeTax,enabledRates}})});setMsg('Bölgesel ayarlar kaydedildi.');await reload()}catch(e:any){setErr(e.message||'Kaydedilemedi')}finally{setBusy(false)}}
  const add=(kind:'locale'|'currency',value:string)=>{if(!value)return;if(kind==='locale')setSelectedLocales(x=>x.includes(value)?x:[...x,value]);else setSelectedCurrencies(x=>x.includes(value)?x:[...x,value])};
  return <>{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}<div className="card"><div className="card-header"><h4 className="card-title mb-1">Bölgesel Ayarlar</h4><p className="text-muted mb-0">Vergi, dil, para birimi ve ölçü sistemini mağaza bazında yönetin.</p></div><div className="card-body pt-0"><ul className="nav nav-tabs mb-3">{[['tax','Vergiler'],['languages','Diller'],['currencies','Para Birimleri'],['units','Ölçü Birimleri']].map(([k,l])=><li className="nav-item" key={k}><button type="button" className={'nav-link '+(tab===k?'active':'')} onClick={()=>setTab(k as any)}>{l}</button></li>)}</ul>{tab==='tax'&&<div className="row g-3"><div className="col-md-4"><label className="form-label">Varsayılan vergi oranı</label><select className="form-select" value={defaultRate} onChange={e=>setDefaultRate(Number(e.target.value))}>{[0,1,8,10,18,20].map(x=><option key={x} value={x}>%{x}</option>)}</select></div><div className="col-md-4"><label className="form-label">Kullanılabilir oranlar</label><select className="form-select" multiple value={enabledRates.map(String)} onChange={e=>setEnabledRates(Array.from(e.currentTarget.selectedOptions, o=>Number((o as HTMLOptionElement).value)))}>{[0,1,8,10,18,20].map(x=><option key={x} value={x}>%{x}</option>)}</select></div><div className="col-md-4"><label className="form-label">Fiyat gösterimi</label><select className="form-select" value={pricesIncludeTax?'included':'excluded'} onChange={e=>setPricesIncludeTax(e.target.value==='included')}><option value="included">Vergi dahil</option><option value="excluded">Vergi hariç</option></select></div></div>}{tab==='languages'&&<SelectorManager title="Mağaza dilleri" options={refs.locales||[]} values={selectedLocales} defaultValue={defaultLocale} onAdd={v=>add('locale',v)} onRemove={v=>setSelectedLocales(x=>x.filter(y=>y!==v))} onDefault={setDefaultLocale}/>} {tab==='currencies'&&<SelectorManager title="Para birimleri" options={refs.currencies||[]} values={selectedCurrencies} defaultValue={defaultCurrency} onAdd={v=>add('currency',v)} onRemove={v=>setSelectedCurrencies(x=>x.filter(y=>y!==v))} onDefault={setDefaultCurrency}/>} {tab==='units'&&<div className="row g-3"><div className="col-md-6"><label className="form-label">Ağırlık birimi</label><select className="form-select" value={weightUnit} onChange={e=>setWeightUnit(e.target.value)}><option value="kg">Kilogram (kg)</option><option value="g">Gram (g)</option><option value="lb">Pound (lb)</option><option value="oz">Ounce (oz)</option></select></div><div className="col-md-6"><label className="form-label">Boyut birimi</label><select className="form-select" value={dimensionUnit} onChange={e=>setDimensionUnit(e.target.value)}><option value="cm">Santimetre (cm)</option><option value="mm">Milimetre (mm)</option><option value="m">Metre (m)</option><option value="in">İnç (in)</option></select></div></div>}<div className="text-end mt-4"><button type="button" className="btn btn-primary" onClick={()=>void save()} disabled={busy}>Bölgesel Ayarları Kaydet</button></div></div></div></>;
}
function SelectorManager({title,options,values,defaultValue,onAdd,onRemove,onDefault}:{title:string;options:string[];values:string[];defaultValue:string;onAdd:(v:string)=>void;onRemove:(v:string)=>void;onDefault:(v:string)=>void}){const[pick,setPick]=useState('');return <div><div className="row g-2 mb-3"><div className="col-md-8"><label className="form-label">{title}</label><select className="form-select" value={pick} onChange={e=>setPick(e.target.value)}><option value="">Seçiniz</option>{options.filter(x=>!values.includes(x)).map(x=><option key={x}>{x}</option>)}</select></div><div className="col-md-4 d-flex align-items-end"><button type="button" className="btn btn-outline-primary w-100" onClick={()=>{onAdd(pick);setPick('')}} disabled={!pick}>Ekle</button></div></div><div className="table-responsive"><table className="table table-centered"><thead><tr><th>Kod</th><th>Varsayılan</th><th className="text-end">İşlem</th></tr></thead><tbody>{values.map(v=><tr key={v}><td><b>{v}</b></td><td><input type="radio" checked={defaultValue===v} onChange={()=>onDefault(v)}/></td><td className="text-end"><button type="button" className="btn btn-sm btn-outline-danger" disabled={defaultValue===v} onClick={()=>onRemove(v)}>Kaldır</button></td></tr>)}</tbody></table></div></div>}
function LogsSettings({data}:CommonProps){const rows=Array.isArray(data?.logs)?data.logs:[];const[tab,setTab]=useState<'all'|'errors'>('all');const visible=tab==='errors'?rows.filter((x:any)=>Number(x.statusCode)>=400):rows;return <div className="card"><div className="card-header"><div className="d-flex justify-content-between align-items-center"><div><h4 className="card-title mb-1">Log Kayıtları</h4><p className="text-muted mb-0">Merchant API işlem geçmişi ve hata kayıtları.</p></div><div className="btn-group"><button className={'btn btn-sm '+(tab==='all'?'btn-primary':'btn-outline-primary')} onClick={()=>setTab('all')}>Log Kayıtları</button><button className={'btn btn-sm '+(tab==='errors'?'btn-danger':'btn-outline-danger')} onClick={()=>setTab('errors')}>Hata Kayıtları</button></div></div></div><div className="card-body pt-0"><div className="table-responsive"><table className="table table-hover table-centered"><thead><tr><th>Tarih</th><th>İşlem</th><th>Kaynak</th><th>HTTP</th><th>Yol</th><th>Kullanıcı</th></tr></thead><tbody>{visible.map((r:any)=><tr key={r.id}><td>{new Date(r.createdAt).toLocaleString('tr-TR')}</td><td>{r.action}</td><td>{r.resource}</td><td><span className={'badge '+(Number(r.statusCode)>=400?'bg-danger-subtle text-danger':'bg-success-subtle text-success')}>{r.statusCode}</span></td><td><code>{r.method} {r.path}</code></td><td>{r.user?.email||'—'}</td></tr>)}{!visible.length&&<tr><td colSpan={6} className="text-center text-muted py-4">Kayıt yok.</td></tr>}</tbody></table></div></div></div>}

function CacheSettings({data,sid,req,reload}:CommonProps){
  const c=data?.cache||{};const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setMessage('');setError('');const f=new FormData(e.currentTarget);try{await req('/admin/cache',{method:'PATCH',body:JSON.stringify({storeId:sid,enabled:f.get('enabled')==='on',appTtlSeconds:Number(f.get('appTtlSeconds')||300),storefrontTtlSeconds:Number(f.get('storefrontTtlSeconds')||120),seoTtlSeconds:Number(f.get('seoTtlSeconds')||900),menuTtlSeconds:Number(f.get('menuTtlSeconds')||900),warmHome:f.get('warmHome')==='on',warmCategories:f.get('warmCategories')==='on'})});setMessage('Cache ayarları kaydedildi.');await reload()}catch(e:any){setError(e.message||'Cache ayarları kaydedilemedi')}finally{setSaving(false)}}
  async function purge(){setSaving(true);setMessage('');setError('');try{await req('/admin/cache/purge',{method:'POST',body:'{}'});setMessage('Cache temizlendi.')}catch(e:any){setError(e.message||'Cache temizlenemedi')}finally{setSaving(false)}}
  return <>{message&&<div className="alert alert-success">{message}</div>}{error&&<div className="alert alert-danger">{error}</div>}<div className="row"><div className="col-xl-8"><div className="card"><div className="card-header"><h4 className="card-title mb-0">Cache Ayarları</h4></div><div className="card-body pt-0"><form onSubmit={save}><div className="row g-3">
    <div className="col-12"><div className="form-check form-switch"><input className="form-check-input" name="enabled" type="checkbox" id="cacheEnabled" defaultChecked={c.enabled??true}/><label className="form-check-label fw-semibold" htmlFor="cacheEnabled">Cache aktif</label></div></div>
    <div className="col-md-6"><label className="form-label">Uygulama TTL (sn)</label><input className="form-control" name="appTtlSeconds" type="number" min="0" defaultValue={c.appTtlSeconds??300}/></div>
    <div className="col-md-6"><label className="form-label">Storefront TTL (sn)</label><input className="form-control" name="storefrontTtlSeconds" type="number" min="0" defaultValue={c.storefrontTtlSeconds??120}/></div>
    <div className="col-md-6"><label className="form-label">SEO TTL (sn)</label><input className="form-control" name="seoTtlSeconds" type="number" min="0" defaultValue={c.seoTtlSeconds??900}/></div>
    <div className="col-md-6"><label className="form-label">Menü TTL (sn)</label><input className="form-control" name="menuTtlSeconds" type="number" min="0" defaultValue={c.menuTtlSeconds??900}/></div>
    <div className="col-md-6"><div className="form-check form-switch mt-3"><input className="form-check-input" name="warmHome" type="checkbox" id="warmHome" defaultChecked={c.warmHome??true}/><label className="form-check-label" htmlFor="warmHome">Ana sayfayı önceden ısıt</label></div></div>
    <div className="col-md-6"><div className="form-check form-switch mt-3"><input className="form-check-input" name="warmCategories" type="checkbox" id="warmCategories" defaultChecked={c.warmCategories??true}/><label className="form-check-label" htmlFor="warmCategories">Kategorileri önceden ısıt</label></div></div>
    <div className="col-12 d-flex justify-content-end"><button className="btn btn-primary" disabled={saving}>Cache Ayarlarını Kaydet</button></div>
  </div></form></div></div></div><div className="col-xl-4"><div className="card"><div className="card-header"><h4 className="card-title mb-0">Cache İşlemleri</h4></div><div className="card-body pt-0"><div className="d-flex align-items-center justify-content-between mb-3"><span>Durum</span><span className={'badge '+(c.enabled?'bg-success-subtle text-success':'bg-secondary-subtle text-secondary')}>{c.enabled?'Aktif':'Kapalı'}</span></div><p className="text-muted fs-12">İçerik veya tasarım değişikliklerinden sonra cache'i manuel temizleyebilirsiniz.</p><button type="button" className="btn btn-outline-danger w-100" onClick={()=>void purge()} disabled={saving}><Icon icon="iconoir:refresh-double" className="me-1"/> Cache'i Temizle</button></div></div></div></div></>;
}

function mergeStoreSettings(data:any,key:string,value:any){const store=data?.settings||{};return {...(store.settings||{}),[key]:value}}
function Message({msg,err}:{msg:string;err:string}){return <>{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}</>}

function LicenseSettings({data,req,reload}:CommonProps){
  const catalog=data?.plans||{};const current=catalog.current;const plans=Array.isArray(catalog.plans)?catalog.plans:[];const[busy,setBusy]=useState('');const[msg,setMsg]=useState('');const[err,setErr]=useState('');
  const featureLabel:Record<string,string>={promotions:'Gelişmiş promosyon',multiCurrency:'Çoklu para birimi',loyalty:'Sadakat',marketing:'E-posta & SMS',privacy:'KVKK/GDPR',customDomain:'Özel alan adı',api:'API erişimi',prioritySupport:'Öncelikli destek',coupons:'Kuponlar',reviews:'Yorumlar',pages:'İçerik sayfaları'};
  async function request(plan:any,billing:'MONTHLY'|'YEARLY'){setBusy(plan.id+billing);setMsg('');setErr('');try{await req('/admin/plans/'+plan.id+'/upgrade-request',{method:'POST',body:JSON.stringify({billing})});setMsg(`${plan.name} için yükseltme talebiniz oluşturuldu.`);await reload()}catch(e:any){setErr(e.message||'Talep oluşturulamadı')}finally{setBusy('')}}
  const deadline=current?.status==='TRIAL'?current?.trialEndsAt:current?.currentPeriodEnd;const days=deadline?Math.max(0,Math.ceil((new Date(deadline).getTime()-Date.now())/86400000)):null;
  return <><Message msg={msg} err={err}/><div className="settings-v15-current-plan"><div><small>AKTİF PAKET</small><h4>{current?.plan?.name||'Ücretsiz'}</h4><p>{current?.status==='TRIAL'&&days!==null?`${days} gün deneme süresi kaldı`:(current?.status||'Aktif')}</p></div><span className="badge bg-success-subtle text-success">{current?.status||'FREE'}</span></div><div className="settings-v15-plan-grid">{plans.map((plan:any)=>{const active=current?.planId===plan.id;const features=Object.entries(plan.features||{}).filter(([,v])=>v===true).map(([k])=>featureLabel[k]||k);return <div className={'card settings-v15-plan-card '+(active?'active':'')} key={plan.id}><div className="card-body"><div className="d-flex justify-content-between"><div><h4>{plan.name}</h4><p className="text-muted">{plan.description||'E-ticaret paketi'}</p></div>{active&&<span className="badge bg-success-subtle text-success h-100">Aktif</span>}</div><div className="settings-v15-price">{Number(plan.yearlyPrice||0).toLocaleString('tr-TR')} <small>{plan.currency}/yıl</small></div><ul>{features.slice(0,8).map((x:string)=><li key={x}><Icon icon="iconoir:check"/>{x}</li>)}</ul>{!active&&<div className="d-grid gap-2"><button className="btn btn-primary" disabled={!!busy} onClick={()=>void request(plan,'YEARLY')}>{busy===plan.id+'YEARLY'?'Gönderiliyor…':'Yıllık Pakete Geç'}</button>{Number(plan.monthlyPrice||0)>0&&<button className="btn btn-outline-primary" disabled={!!busy} onClick={()=>void request(plan,'MONTHLY')}>Aylık Öde · {Number(plan.monthlyPrice).toLocaleString('tr-TR')} {plan.currency}/ay</button>}</div>}</div></div>})}</div><div className="alert alert-light border mt-3 mb-0"><Icon icon="iconoir:info-circle" className="me-2"/>Paket değişikliği ödeme altyapısı tamamlanana kadar güvenli biçimde destek/yükseltme talebi olarak oluşturulur; paket otomatik değiştirilmez.</div></>;
}

function DomainsSettings({data,sid,req,reload}:CommonProps){const store=data?.settings||{};const cfg=store.settings?.domains||{};const[msg,setMsg]=useState('');const[err,setErr]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setMsg('');setErr('');try{const domains={forceWww:f.get('forceWww')==='on',redirectToPrimary:f.get('redirectToPrimary')==='on',sslMode:String(f.get('sslMode')||'AUTO')};await req('/admin/site/'+sid,{method:'PATCH',body:JSON.stringify({domain:String(f.get('domain')||'')||null,settings:mergeStoreSettings(data,'domains',domains)})});setMsg('Alan adı ayarları kaydedildi.');await reload()}catch(x:any){setErr(x.message||'Kaydedilemedi')}finally{setBusy(false)}}return <form onSubmit={save}><Message msg={msg} err={err}/><div className="card"><div className="card-body"><div className="row g-3"><div className="col-md-8"><label className="form-label">Birincil alan adı</label><input name="domain" className="form-control" defaultValue={store.domain||''} placeholder="magaza.com"/></div><div className="col-md-4"><label className="form-label">SSL</label><select name="sslMode" className="form-select" defaultValue={cfg.sslMode||'AUTO'}><option value="AUTO">Otomatik HTTPS</option><option value="EXTERNAL">Harici CDN / Proxy</option></select></div><div className="col-md-6"><div className="form-check form-switch mt-3"><input name="redirectToPrimary" className="form-check-input" type="checkbox" defaultChecked={cfg.redirectToPrimary!==false}/><label className="form-check-label">Diğer domainleri birincil domaine yönlendir</label></div></div><div className="col-md-6"><div className="form-check form-switch mt-3"><input name="forceWww" className="form-check-input" type="checkbox" defaultChecked={!!cfg.forceWww}/><label className="form-check-label">www kullanımını zorunlu tut</label></div></div><div className="col-12 text-end"><button className="btn btn-primary" disabled={busy}>Kaydet</button></div></div></div></div></form>}

function MobileAppSettings({data,sid,req,reload}:CommonProps){const cfg=data?.settings?.settings?.mobileApp||{};return <JsonBranchForm title="Mobil Uygulama" description="Mobil uygulama marka ve paketleme bilgilerini hazırlayın. Bu ekran tek başına App Store/Play Store yayını yapmaz." data={data} sid={sid} req={req} reload={reload} branch="mobileApp" fields={[['appName','Uygulama adı','text'],['iosBundleId','iOS Bundle ID','text'],['androidPackageId','Android Package ID','text'],['primaryColor','Ana renk','color'],['supportUrl','Destek URL','url']]} current={cfg}/>}
function InvoiceSettings({data,sid,req,reload}:CommonProps){const cfg=data?.settings?.settings?.invoice||{};return <JsonBranchForm title="Fatura Ayarları" description="E-fatura/e-arşiv entegrasyonu Eklentiler üzerinden bağlanır; burada mağazanın fatura davranışını yönetin." data={data} sid={sid} req={req} reload={reload} branch="invoice" fields={[['prefix','Fatura ön eki','text'],['autoIssue','Ödeme sonrası otomatik düzenle','boolean'],['emailOnIssue','Düzenlenince müşteriye e-posta gönder','boolean'],['showTaxNumber','Vergi numarasını göster','boolean']]} current={cfg}/>}
function ShippingLabelSettings({data,sid,req,reload}:CommonProps){const cfg=data?.settings?.settings?.shippingLabel||{};return <JsonBranchForm title="Kargo Etiketi" description="Kargo etiketi yazdırma tercihlerini belirleyin." data={data} sid={sid} req={req} reload={reload} branch="shippingLabel" fields={[['paperSize','Kağıt boyutu','select:A6|A6,A4|A4,100x150|100 × 150 mm'],['showLogo','Mağaza logosunu göster','boolean'],['showPhone','Telefonu göster','boolean'],['showOrderNumber','Sipariş numarasını göster','boolean']]} current={cfg}/>}
function EmailDomainSettings({data,sid,req,reload}:CommonProps){const cfg=data?.settings?.settings?.emailDomain||{};return <JsonBranchForm title="E-Posta Domain Ayarları" description="Gönderici adı, e-posta adresi ve cevap adresini tanımlayın. DKIM/SPF doğrulaması sağlayıcı entegrasyonu üzerinden yapılır." data={data} sid={sid} req={req} reload={reload} branch="emailDomain" fields={[['fromName','Gönderici adı','text'],['fromEmail','Gönderici e-posta','email'],['replyTo','Yanıt adresi','email'],['domain','Gönderim alan adı','text']]} current={cfg}/>}
function NotificationSettings({data,sid,req,reload}:CommonProps){const cfg=data?.settings?.settings?.notifications||{};return <JsonBranchForm title="Bildirimler" description="Yönetim panelinde hangi olaylarda bildirim almak istediğinizi seçin." data={data} sid={sid} req={req} reload={reload} branch="notifications" fields={[['newOrder','Yeni sipariş','boolean'],['paymentFailed','Ödeme hatası','boolean'],['lowStock','Düşük stok','boolean'],['returnRequest','İade talebi','boolean'],['privacyRequest','KVKK talebi','boolean']]} current={cfg}/>}


function DeviceSettings({data,req,reload}:CommonProps){
  const rows=Array.isArray(data?.sessions)?data.sessions:[];const[busy,setBusy]=useState('');const[err,setErr]=useState('');
  async function revoke(id:string){if(!confirm('Bu cihazın oturumunu kapatmak istiyor musunuz?'))return;setBusy(id);setErr('');try{await req('/admin/security/sessions/'+id,{method:'DELETE'});await reload()}catch(e:any){setErr(e.message||'Oturum kapatılamadı')}finally{setBusy('')}}
  return <div className="card"><div className="card-header"><div><h4 className="card-title mb-1">Giriş Yapılan Cihazlar</h4><p className="text-muted mb-0">Aktif yönetim paneli oturumlarını inceleyin. Güvenlik nedeniyle IP ve cihaz bilgileri hashlenmiş gösterilir.</p></div></div><div className="card-body pt-0">{err&&<div className="alert alert-danger">{err}</div>}<div className="settings-device-list">{rows.map((x:any,i:number)=><div className="settings-device-row" key={x.id}><span className="setting-module-icon"><Icon icon="iconoir:devices"/></span><div><b>{i===0?'Bu veya en son kullanılan cihaz':'Aktif cihaz'}</b><small>Son kullanım: {new Date(x.lastUsedAt).toLocaleString('tr-TR')} · Oluşturma: {new Date(x.createdAt).toLocaleString('tr-TR')}</small><code>{String(x.userAgentHash||'cihaz').slice(0,14)}… / {String(x.ipHash||'ip').slice(0,10)}…</code></div><button className="btn btn-sm btn-outline-danger" disabled={busy===x.id} onClick={()=>void revoke(x.id)}>Oturumu Kapat</button></div>)}{!rows.length&&<div className="text-muted py-4 text-center">Aktif cihaz bulunamadı.</div>}</div></div></div>
}

function ApiKeysSettings({data,sid,req,reload}:CommonProps){
  const rows=Array.isArray(data?.apiKeys)?data.apiKeys:[];const[secret,setSecret]=useState('');const[busy,setBusy]=useState('');const[err,setErr]=useState('');
  async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy('new');setErr('');try{const x=await req('/admin/api-keys',{method:'POST',body:JSON.stringify({storeId:sid,name:f.get('name'),scopes:f.getAll('scopes').map(String)})});setSecret(x.secret||'');(e.currentTarget as HTMLFormElement).reset();await reload()}catch(e:any){setErr(e.message||'Anahtar oluşturulamadı')}finally{setBusy('')}}
  async function revoke(id:string){if(!confirm('Bu API anahtarını iptal etmek istiyor musunuz?'))return;setBusy(id);try{await req(`/admin/api-keys/${id}?storeId=${encodeURIComponent(sid)}`,{method:'DELETE'});await reload()}catch(e:any){setErr(e.message||'Anahtar iptal edilemedi')}finally{setBusy('')}}
  return <><div className="card mb-3"><div className="card-header"><div><h4 className="card-title mb-1">API Anahtarı Oluştur</h4><p className="text-muted mb-0">Secret yalnızca oluşturulduğu anda gösterilir.</p></div></div><div className="card-body pt-0">{err&&<div className="alert alert-danger">{err}</div>}{secret&&<div className="alert alert-warning"><b>Bu anahtarı şimdi kopyalayın.</b><div className="input-group mt-2"><input className="form-control font-monospace" readOnly value={secret}/><button className="btn btn-outline-secondary" type="button" onClick={()=>void navigator.clipboard.writeText(secret)}>Kopyala</button></div></div>}<form className="row g-3" onSubmit={create}><div className="col-md-5"><label className="form-label">Anahtar adı</label><input className="form-control" name="name" required placeholder="ERP entegrasyonu"/></div><div className="col-md-5"><label className="form-label">Yetkiler</label><select className="form-select" name="scopes" multiple size={3}><option value="products:read">Ürünleri oku</option><option value="orders:read">Siparişleri oku</option><option value="orders:write">Siparişleri yönet</option><option value="customers:read">Müşterileri oku</option><option value="inventory:write">Stok güncelle</option></select></div><div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100" disabled={busy==='new'}>Oluştur</button></div></form></div></div><div className="card"><div className="card-header"><h4 className="card-title mb-0">API Anahtarları</h4></div><div className="card-body pt-0"><div className="table-responsive"><table className="table align-middle"><thead><tr><th>Ad</th><th>Prefix</th><th>Yetkiler</th><th>Oluşturma</th><th>Durum</th><th/></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id}><td><b>{x.name}</b></td><td><code>{x.prefix}…</code></td><td>{(x.scopes||[]).join(', ')||'—'}</td><td>{new Date(x.createdAt).toLocaleString('tr-TR')}</td><td>{x.revokedAt?<span className="badge bg-danger-subtle text-danger">İptal</span>:<span className="badge bg-success-subtle text-success">Aktif</span>}</td><td className="text-end">{!x.revokedAt&&<button className="btn btn-sm btn-outline-danger" disabled={busy===x.id} onClick={()=>void revoke(x.id)}>İptal Et</button>}</td></tr>)}</tbody></table></div></div></div></>
}

function JsonBranchForm({title,description,data,sid,req,reload,branch,fields,current}:{title:string;description:string;data:any;sid:string;req:any;reload:any;branch:string;fields:any[];current:any}){const[msg,setMsg]=useState('');const[err,setErr]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const next:any={...current};for(const [name,,type] of fields){if(type==='boolean')next[name]=fd.get(name)==='on';else next[name]=String(fd.get(name)||'')}setBusy(true);setMsg('');setErr('');try{await req('/admin/site/'+sid,{method:'PATCH',body:JSON.stringify({settings:mergeStoreSettings(data,branch,next)})});setMsg('Ayarlar kaydedildi.');await reload()}catch(x:any){setErr(x.message||'Kaydedilemedi')}finally{setBusy(false)}}return <form onSubmit={save}><Message msg={msg} err={err}/><div className="card"><div className="card-header"><h4 className="card-title mb-1">{title}</h4><p className="text-muted mb-0">{description}</p></div><div className="card-body pt-0"><div className="row g-3">{fields.map(([name,label,type])=>{if(type==='boolean')return <div className="col-md-6" key={name}><div className="form-check form-switch mt-3"><input className="form-check-input" name={name} type="checkbox" defaultChecked={current?.[name]!==false}/><label className="form-check-label">{label}</label></div></div>;if(String(type).startsWith('select:')){const opts=String(type).slice(7).split(',').map(x=>x.split('|'));return <div className="col-md-6" key={name}><label className="form-label">{label}</label><select className="form-select" name={name} defaultValue={current?.[name]||opts[0]?.[0]}>{opts.map(([v,l])=><option value={v} key={v}>{l||v}</option>)}</select></div>}return <div className="col-md-6" key={name}><label className="form-label">{label}</label><input className="form-control" name={name} type={type} defaultValue={current?.[name]||''}/></div>})}<div className="col-12 text-end"><button className="btn btn-primary" disabled={busy}>Kaydet</button></div></div></div></div></form>}

function StockLocationsSettings({data,sid,req,reload}:CommonProps){const initial=Array.isArray(data?.settings?.settings?.stockLocations)?data.settings.settings.stockLocations:[];const[rows,setRows]=useState<any[]>(initial);const[msg,setMsg]=useState('');const[err,setErr]=useState('');async function save(){try{await req('/admin/site/'+sid,{method:'PATCH',body:JSON.stringify({settings:mergeStoreSettings(data,'stockLocations',rows)})});setMsg('Stok lokasyonları kaydedildi.');setErr('');await reload()}catch(e:any){setErr(e.message||'Kaydedilemedi')}}return <><Message msg={msg} err={err}/><div className="card"><div className="card-body"><div className="table-responsive"><table className="table table-centered"><thead><tr><th>Ad</th><th>Kod</th><th>Adres</th><th>Varsayılan</th><th></th></tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={r.id||i}><td><input className="form-control form-control-sm" value={r.name||''} onChange={e=>setRows(x=>x.map((z,j)=>j===i?{...z,name:e.target.value}:z))}/></td><td><input className="form-control form-control-sm" value={r.code||''} onChange={e=>setRows(x=>x.map((z,j)=>j===i?{...z,code:e.target.value}:z))}/></td><td><input className="form-control form-control-sm" value={r.address||''} onChange={e=>setRows(x=>x.map((z,j)=>j===i?{...z,address:e.target.value}:z))}/></td><td><input type="radio" checked={!!r.isDefault} onChange={()=>setRows(x=>x.map((z,j)=>({...z,isDefault:j===i})))}/></td><td><button className="btn btn-sm btn-outline-danger" onClick={()=>setRows(x=>x.filter((_,j)=>j!==i))}>Sil</button></td></tr>)}</tbody></table></div><div className="d-flex justify-content-between"><button className="btn btn-outline-primary" onClick={()=>setRows(x=>[...x,{id:crypto.randomUUID(),name:'Yeni Lokasyon',code:'',address:'',isDefault:x.length===0}])}>Lokasyon Ekle</button><button className="btn btn-primary" onClick={()=>void save()}>Kaydet</button></div></div></div></>}

const TEMPLATE_EVENTS={email:[
  ['order_confirmation','Sipariş Onayı','Siparişiniz alındı','Merhaba {{customer_name}}, #{{order_number}} numaralı siparişinizi aldık. Toplam: {{order_total}}.'],
  ['account_confirmation','Hesap Onayı','Hesabınız hazır','Merhaba {{customer_name}}, hesabınız başarıyla oluşturuldu.'],
  ['password_reset','Şifremi Unuttum','Şifre yenileme bağlantınız','Şifrenizi yenilemek için {{reset_url}} bağlantısını kullanın.'],
  ['payment_confirmation','Ödeme Onayı','Ödemeniz alındı','#{{order_number}} siparişinizin ödemesi başarıyla alındı.'],
  ['order_processing','Sipariş Hazırlanıyor','Siparişiniz hazırlanıyor','#{{order_number}} numaralı siparişiniz hazırlanıyor.'],
  ['order_shipped','Kargoya Verildi','Siparişiniz kargoda','Kargo takip numaranız: {{tracking_number}} · {{tracking_url}}'],
  ['order_delivered','Teslim Edildi','Siparişiniz teslim edildi','#{{order_number}} siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkürler.'],
  ['order_cancelled','Sipariş İptali','Siparişiniz iptal edildi','#{{order_number}} siparişiniz iptal edildi. İade tutarı: {{refund_total}}.'],
  ['refund_created','İade Onayı','İadeniz oluşturuldu','{{refund_total}} tutarındaki iadeniz işleme alındı.'],
  ['invoice_ready','Fatura Gönderimi','Faturanız hazır','#{{order_number}} siparişinizin faturası: {{invoice_url}}'],
  ['cart_reminder','Sepet Hatırlatma','Sepetiniz sizi bekliyor','Ürünleriniz hâlâ sepetinizde. Devam etmek için {{cart_url}}'],
  ['payment_failed','Ödeme Başarısız','Ödemenizi tamamlayalım','Ödeme tamamlanamadı. Güvenle yeniden denemek için {{checkout_url}}']
 ],sms:[
  ['order_confirmation','Sipariş Onayı','','#{{order_number}} siparişinizi aldık. Toplam {{order_total}}.'],
  ['account_confirmation','Hesap Onayı','','{{store_name}} hesabınız oluşturuldu.'],
  ['password_reset','Şifre Yenileme','','Şifrenizi yenileyin: {{reset_url}}'],
  ['payment_confirmation','Ödeme Onayı','','#{{order_number}} ödemeniz alındı.'],
  ['order_processing','Sipariş Hazırlanıyor','','#{{order_number}} siparişiniz hazırlanıyor.'],
  ['order_shipped','Kargoya Verildi','','#{{order_number}} kargoda. Takip: {{tracking_url}}'],
  ['order_delivered','Teslim Edildi','','#{{order_number}} teslim edildi. Teşekkürler.'],
  ['order_cancelled','Sipariş İptali','','#{{order_number}} siparişiniz iptal edildi.'],
  ['cart_reminder','Sepet Hatırlatma','','Sepetiniz sizi bekliyor: {{cart_url}}'],
  ['payment_failed','Ödeme Başarısız','','Ödemenizi yeniden deneyin: {{checkout_url}}']
 ]} as const;
const TEMPLATE_LANGS=[['tr-TR','Türkçe'],['en-US','English'],['de-DE','Deutsch'],['ar-SA','العربية']];
const TEMPLATE_VARIABLES=['{{store_name}}','{{customer_name}}','{{order_number}}','{{order_total}}','{{tracking_number}}','{{tracking_url}}','{{invoice_url}}','{{cart_url}}','{{checkout_url}}','{{reset_url}}','{{refund_total}}'];
function defaultTemplateRows(kind:'email'|'sms',languages:readonly (readonly string[])[]){return TEMPLATE_EVENTS[kind].map(([event,name,subject,body])=>({id:event,event,name,enabled:true,layout:'minimal',translations:Object.fromEntries(languages.map(([locale])=>[locale,{subject,body}]))}))}
function TemplateSettings({data,sid,req,reload,kind}:CommonProps&{kind:'email'|'sms'}){
  const configuredLanguages=(Array.isArray(data?.regional?.locales)?data.regional.locales:[]).filter((item:any)=>item?.isEnabled!==false&&item?.locale).map((item:any)=>[String(item.locale),String(item.label||item.locale)] as const);
  const languages=configuredLanguages.length?configuredLanguages:TEMPLATE_LANGS;
  const root=data?.settings?.settings?.communicationTemplates||{};const stored=Array.isArray(root[kind])?root[kind]:[];const base=defaultTemplateRows(kind,languages);const initial=base.map(row=>{const saved=stored.find((x:any)=>x.event===row.event||x.id===row.id);if(!saved)return row;if(saved.translations)return{...row,...saved,translations:{...row.translations,...saved.translations}};const defaultLocale=String(data?.regional?.defaultLocale||languages[0]?.[0]||'tr-TR');const fallback=row.translations[defaultLocale]||{subject:'',body:''};return{...row,...saved,translations:{...row.translations,[defaultLocale]:{subject:saved.subject||fallback.subject,body:saved.body||fallback.body}}}});
  const[rows,setRows]=useState<any[]>(initial);const[active,setActive]=useState(initial[0]?.event||'');const[locale,setLocale]=useState(String(data?.regional?.defaultLocale||languages[0]?.[0]||'tr-TR'));const[msg,setMsg]=useState('');const[err,setErr]=useState('');const current=rows.find((r:any)=>r.event===active)||rows[0];const text=current?.translations?.[locale]||{subject:'',body:''};
  function update(patch:any){setRows(all=>all.map((r:any)=>r.event===current.event?{...r,...patch}:r))}
  function updateText(key:string,value:string){update({translations:{...current.translations,[locale]:{...text,[key]:value}}})}
  async function save(){const value={...root,[kind]:rows};try{await req('/admin/site/'+sid,{method:'PATCH',body:JSON.stringify({settings:mergeStoreSettings(data,'communicationTemplates',value)})});setMsg('Tüm dillerde iletişim şablonları kaydedildi.');setErr('');await reload()}catch(e:any){setErr(e.message||'Kaydedilemedi')}}
  return <><Message msg={msg} err={err}/><div className="row g-3"><div className="col-xl-4"><div className="card"><div className="card-header"><h5 className="card-title mb-1">{kind==='email'?'E-posta Olayları':'SMS Olayları'}</h5><small className="text-muted">Zorunlu müşteri bildirimlerinin tamamı hazır gelir.</small></div><div className="card-body pt-0 template-event-list">{rows.map((r:any)=><button type="button" key={r.event} className={r.event===current?.event?'active':''} onClick={()=>setActive(r.event)}><span><Icon icon={r.enabled?'iconoir:check-circle':'iconoir:cancel'}/></span><div><b>{r.name}</b><small>{r.event}</small></div></button>)}</div></div></div><div className="col-xl-8">{current&&<div className="card"><div className="card-header d-flex justify-content-between align-items-center"><div><h5 className="card-title mb-1">{current.name}</h5><small className="text-muted">Değişkenler gönderim anında sipariş ve müşteri verileriyle doldurulur.</small></div><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={current.enabled!==false} onChange={e=>update({enabled:e.target.checked})}/><label className="form-check-label">Aktif</label></div></div><div className="card-body pt-0">{kind==='email'&&<><label className="form-label">Sabit tasarım</label><div className="template-layout-grid mb-4">{[['minimal','Minimal'],['brand','Marka'],['editorial','Editoryal'],['receipt','Fiş / Sipariş']].map(([v,l])=><button type="button" className={current.layout===v?'active':''} key={v} onClick={()=>update({layout:v})}><span className={'template-layout-preview '+v}/><b>{l}</b></button>)}</div></>}<ul className="nav nav-tabs mb-3">{languages.map(([v,l])=><li className="nav-item" key={v}><button type="button" className={'nav-link '+(locale===v?'active':'')} onClick={()=>setLocale(v)}>{l}</button></li>)}</ul>{kind==='email'&&<div className="mb-3"><label className="form-label">Konu · {locale}</label><input className="form-control" value={text.subject||''} onChange={e=>updateText('subject',e.target.value)}/></div>}<div className="mb-3"><label className="form-label">{kind==='email'?'İçerik':'SMS metni'} · {locale}</label><textarea className="form-control" rows={kind==='email'?10:5} value={text.body||''} onChange={e=>updateText('body',e.target.value)}/><small className="text-muted">{kind==='sms'?String(text.body||'').length+' karakter · uzun SMS otomatik parçalara ayrılır.':'HTML olmayan güvenli şablon metni; seçilen tasarıma yerleştirilir.'}</small></div><div className="template-variable-list">{TEMPLATE_VARIABLES.map(token=><button type="button" key={token} onClick={()=>updateText('body',String(text.body||'')+(text.body?' ':'')+token)}><code>{token}</code></button>)}</div><div className="text-end mt-4"><button className="btn btn-primary" onClick={()=>void save()}>Tüm Şablonları Kaydet</button></div></div></div>}</div></div></>
}

function WebhooksSettings({data,req,reload}:CommonProps){const rows=Array.isArray(data?.webhooks)?data.webhooks:[];const[msg,setMsg]=useState('');const[err,setErr]=useState('');async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await req('/admin/webhooks',{method:'POST',body:JSON.stringify({url:String(f.get('url')||''),events:String(f.get('events')||'').split(',').map(x=>x.trim()).filter(Boolean)})});setMsg('Webhook oluşturuldu. Secret yalnız oluşturma yanıtında üretilir; güvenli kasanızda saklayın.');setErr('');e.currentTarget.reset();await reload()}catch(x:any){setErr(x.message||'Webhook oluşturulamadı')}}return <><Message msg={msg} err={err}/><div className="row g-3"><div className="col-xl-5"><div className="card"><div className="card-body"><form onSubmit={create}><label className="form-label">HTTPS URL</label><input className="form-control mb-3" name="url" type="url" placeholder="https://example.com/webhook" required/><label className="form-label">Olaylar</label><input className="form-control mb-2" name="events" placeholder="order.created, order.paid" required/><small className="text-muted">Virgülle ayırın. Production ortamında yalnız HTTPS kabul edilir.</small><button className="btn btn-primary w-100 mt-3">Webhook Ekle</button></form></div></div></div><div className="col-xl-7"><div className="card"><div className="card-body"><div className="table-responsive"><table className="table"><thead><tr><th>URL</th><th>Olaylar</th><th>Durum</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td><code>{r.url}</code></td><td>{(r.events||[]).join(', ')}</td><td>{r.enabled?'Aktif':'Pasif'}</td></tr>)}{!rows.length&&<tr><td colSpan={3} className="text-center text-muted">Webhook yok.</td></tr>}</tbody></table></div></div></div></div></div></>}

function CheckoutSettings({data,sid,req,reload}:CommonProps){const c=data?.settings?.checkoutConfig||{};const[msg,setMsg]=useState('');const[err,setErr]=useState('');async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await req('/admin/store-settings/'+sid+'/checkout',{method:'PATCH',body:JSON.stringify({allowGuestCheckout:f.get('allowGuestCheckout')==='on',requirePhone:f.get('requirePhone')==='on',requireBillingAddress:f.get('requireBillingAddress')==='on',showCouponField:f.get('showCouponField')==='on',stickyOrderSummary:true,requireTerms:true,requirePrivacyNotice:true,requireKvkkNotice:f.get('requireKvkkNotice')==='on'})});setMsg('Checkout ayarları kaydedildi.');setErr('');await reload()}catch(x:any){setErr(x.message||'Kaydedilemedi')}}return <form onSubmit={save}><Message msg={msg} err={err}/><div className="card"><div className="card-body"><div className="row g-3">{[['allowGuestCheckout','Misafir alışveriş'],['requirePhone','Telefon zorunlu'],['requireBillingAddress','Fatura adresi zorunlu'],['showCouponField','Kupon alanını göster'],['requireKvkkNotice','KVKK onayı zorunlu']].map(([k,l])=><div className="col-md-6" key={k}><div className="form-check form-switch"><input className="form-check-input" name={k} type="checkbox" defaultChecked={!!c[k]}/><label className="form-check-label">{l}</label></div></div>)}<div className="col-12 text-end"><button className="btn btn-primary">Kaydet</button></div></div></div></div></form>}

function ShippingSettings({data,sid,req,reload}:CommonProps){const rows=Array.isArray(data?.shipping)?data.shipping:[];return <MethodSettings title="Kargo Yöntemleri" kind="shipping" rows={rows} sid={sid} req={req} reload={reload}/>}
function PaymentSettings({data,sid,req,reload}:CommonProps){const rows=Array.isArray(data?.payment)?data.payment:[];return <MethodSettings title="Ödeme Yöntemleri" kind="payment" rows={rows} sid={sid} req={req} reload={reload}/>}
function MethodSettings({title,kind,rows,sid,req,reload}:{title:string;kind:'shipping'|'payment';rows:any[];sid:string;req:any;reload:any}){const[msg,setMsg]=useState('');const[err,setErr]=useState('');async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const body:any={storeId:sid,name:String(f.get('name')||''),code:String(f.get('code')||''),isActive:true};if(kind==='shipping'){body.type=String(f.get('type')||'shipping');body.price=Number(f.get('price')||0);body.requiresAddress=true}else{body.type=String(f.get('type')||'manual');body.fee=Number(f.get('price')||0);body.requiresOnlinePayment=body.type==='card'}try{await req(kind==='shipping'?'/admin/shipping-methods':'/admin/payment-methods',{method:'POST',body:JSON.stringify(body)});setMsg('Yöntem eklendi.');setErr('');e.currentTarget.reset();await reload()}catch(x:any){setErr(x.message||'Eklenemedi')}}return <><Message msg={msg} err={err}/><div className="row g-3"><div className="col-xl-4"><div className="card"><div className="card-header"><h4 className="card-title">Yeni Yöntem</h4></div><div className="card-body pt-0"><form onSubmit={create}><label className="form-label">Ad</label><input className="form-control mb-2" name="name" required/><label className="form-label">Kod</label><input className="form-control mb-2" name="code" required/><label className="form-label">Tip</label><select className="form-select mb-2" name="type">{kind==='shipping'?<><option value="shipping">Kargo</option><option value="courier">Kurye</option><option value="pickup">Mağazadan Teslim</option></>:<><option value="manual">Havale / Manuel</option><option value="card">Kredi Kartı</option><option value="cod">Kapıda Ödeme</option><option value="wallet">Cüzdan</option></>}</select><label className="form-label">{kind==='shipping'?'Ücret':'Ek ücret'}</label><input className="form-control mb-3" name="price" type="number" step="0.01" defaultValue="0"/><button className="btn btn-primary w-100">Ekle</button></form></div></div></div><div className="col-xl-8"><div className="card"><div className="card-header"><h4 className="card-title">{title}</h4></div><div className="card-body pt-0"><div className="table-responsive"><table className="table table-centered"><thead><tr><th>Ad</th><th>Kod</th><th>Tip</th><th>Ücret</th><th>Durum</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td><b>{r.name}</b></td><td><code>{r.code}</code></td><td>{r.type}</td><td>{Number(kind==='shipping'?r.price:r.fee||0).toLocaleString('tr-TR')}</td><td>{r.isActive?'Aktif':'Pasif'}</td></tr>)}</tbody></table></div></div></div></div></div></>}


const CONTRACT_TYPES=[
  ['DISTANCE_SALES','Mesafeli Satış Sözleşmesi'],
  ['PRE_INFORMATION','Ön Bilgilendirme Formu'],
  ['KVKK_NOTICE','KVKK Aydınlatma Metni'],
  ['PRIVACY','Gizlilik Politikası'],
  ['RETURNS','İade / Cayma Koşulları'],
  ['SHIPPING','Teslimat / Kargo Koşulları'],
  ['TERMS','Kullanım / Üyelik Koşulları'],
  ['COOKIE_POLICY','Çerez Politikası'],
  ['COMMERCIAL_COMMUNICATION','Ticari İletişim Onayı'],
] as const;

function MaintenanceSettings({data,sid,req,reload}:CommonProps){
  const s=data?.settings||{};
  const[enabled,setEnabled]=useState(!!s.maintenanceMode);
  const[launch,setLaunch]=useState(localDateTime(s.settings?.maintenanceLaunchAt));
  const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setMsg('');setErr('');try{await req('/admin/site/'+sid,{method:'PATCH',body:JSON.stringify({maintenanceMode:enabled,settings:{...(s.settings||{}),maintenanceLaunchAt:launch?new Date(launch).toISOString():null}})});setMsg('Yapım aşamasında ayarları kaydedildi.');await reload()}catch(x:any){setErr(x.message||'Kaydedilemedi')}finally{setBusy(false)}}
  return <form onSubmit={save}><div className="row"><div className="col-xl-8"><div className="card"><div className="card-header"><h4 className="card-title mb-1">Yapım Aşamasında</h4><p className="text-muted mb-0">Storefront erişimini kontrollü biçimde bakım/açılış ekranına alın.</p></div><div className="card-body pt-0">{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}<div className="maintenance-switch-card"><div className="form-check form-switch mb-3"><input className="form-check-input" type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} id="maint"/><label className="form-check-label fw-semibold" htmlFor="maint">Mağazayı yapım aşamasına al</label></div><label className="form-label">Açılış tarihi</label><input className="form-control" type="datetime-local" value={launch} onChange={e=>setLaunch(e.target.value)} disabled={!enabled}/><p className="text-muted fs-12 mb-0 mt-2">Tarih geldiğinde storefront normal yayına döner; geri sayım bu tarihe göre gösterilir.</p></div><div className="text-end mt-3"><button className="btn btn-primary" disabled={busy}>Kaydet</button></div></div></div></div></div></form>;
}

function ContractSettings({data,sid,req,reload}:CommonProps){
  const pages=Array.isArray(data?.pages)?data.pages:[];
  const current=data?.contracts?.mappings||{};
  const[mappings,setMappings]=useState<Record<string,string>>(current);
  const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');
  async function save(){setBusy(true);setMsg('');setErr('');try{await req('/admin/store-settings/'+sid+'/contracts',{method:'PATCH',body:JSON.stringify({mappings})});setMsg('Sözleşme eşleştirmeleri kaydedildi.');await reload()}catch(e:any){setErr(e.message||'Kaydedilemedi')}finally{setBusy(false)}}
  return <div className="card"><div className="card-header"><h4 className="card-title mb-1">Sözleşmeler</h4><p className="text-muted mb-0">Yasal alanların hangi çok dilli içerik sayfasını kullanacağını seçin. Sayfa içeriği ve SEO'su Sayfalar bölümünden yönetilir.</p></div><div className="card-body pt-0">{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}<div className="table-responsive"><table className="table table-centered"><thead className="table-light"><tr><th>Sözleşme / Politika</th><th>Bağlı Sayfa</th><th>Durum</th></tr></thead><tbody>{CONTRACT_TYPES.map(([type,label])=><tr key={type}><td><strong>{label}</strong></td><td><select className="form-select" value={mappings[type]||''} onChange={e=>setMappings(x=>({...x,[type]:e.target.value}))}><option value="">Sayfa seçilmedi</option>{pages.filter((p:any)=>p.status==='PUBLISHED').map((p:any)=><option value={p.id} key={p.id}>{p.title} / {p.slug}</option>)}</select></td><td>{mappings[type]?<span className="badge bg-success-subtle text-success">Eşlendi</span>:<span className="badge bg-warning-subtle text-warning">Eksik</span>}</td></tr>)}</tbody></table></div><div className="d-flex justify-content-between align-items-center mt-3"><Link href="/pages" className="btn btn-outline-secondary"><Icon icon="iconoir:page" className="me-1"/>Sayfaları Yönet</Link><button className="btn btn-primary" type="button" onClick={()=>void save()} disabled={busy}>Eşleştirmeleri Kaydet</button></div></div></div>;
}


function ImageSettings({data,sid,req,reload}:CommonProps){
  const current:any=data?.settings?.settings?.imageProcessing||{};const defaults:any={masterMax:2400,webpQuality:82,avifQuality:60,profiles:{thumb:{width:320,height:320,fit:'cover'},card:{width:640,height:800,fit:'inside'},category:{width:1200,height:900,fit:'inside'},detail:{width:1800,height:1800,fit:'inside'},hero:{width:1920,height:1080,fit:'inside'}}};
  const[state,setState]=useState<any>({...defaults,...current,profiles:{...defaults.profiles,...(current.profiles||{})}});const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');
  const setProfile=(key:string,field:string,value:any)=>setState((x:any)=>({...x,profiles:{...x.profiles,[key]:{...x.profiles[key],[field]:value}}}));
  async function save(){setBusy(true);setMsg('');setErr('');try{const root=data?.settings?.settings||{};await req('/admin/site/'+sid,{method:'PATCH',body:JSON.stringify({settings:{...root,imageProcessing:state}})});setMsg('Görsel işleme ölçüleri kaydedildi. Yeni yüklemeler otomatik WebP/AVIF varyantlarına dönüştürülecek.');await reload()}catch(e:any){setErr(e.message||'Kaydedilemedi')}finally{setBusy(false)}}
  const names:any={thumb:'Küçük / thumbnail',card:'Ürün kartı',category:'Kategori',detail:'Ürün detay',hero:'Hero / banner'};
  return <><div className="card"><div className="card-header"><h4 className="card-title mb-1">Görsel Boyutları ve Optimizasyon</h4><p className="text-muted mb-0">Bu ölçüler tema tarafından kullanılır; tema görsel piksel boyutunu değiştirmez. Yeni yüklemelerde master + WebP + AVIF responsive varyantlar üretilir ve uzun süreli cache uygulanır.</p></div><div className="card-body pt-0">{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}<div className="row g-3 mb-4"><div className="col-md-4"><label className="form-label">Master maksimum piksel</label><input className="form-control" type="number" min="1200" max="4000" value={state.masterMax} onChange={e=>setState((x:any)=>({...x,masterMax:Number(e.target.value)}))}/></div><div className="col-md-4"><label className="form-label">WebP kalite</label><input className="form-control" type="number" min="50" max="95" value={state.webpQuality} onChange={e=>setState((x:any)=>({...x,webpQuality:Number(e.target.value)}))}/></div><div className="col-md-4"><label className="form-label">AVIF kalite</label><input className="form-control" type="number" min="35" max="90" value={state.avifQuality} onChange={e=>setState((x:any)=>({...x,avifQuality:Number(e.target.value)}))}/></div></div><div className="table-responsive"><table className="table table-centered"><thead><tr><th>Kullanım</th><th>Genişlik</th><th>Yükseklik</th><th>Davranış</th></tr></thead><tbody>{Object.entries(state.profiles).map(([key,v]:any)=><tr key={key}><td><b>{names[key]||key}</b>{key==='card'&&<small className="d-block text-muted">Ürün listeleri bu varyantı çağırır.</small>}{key==='detail'&&<small className="d-block text-muted">Ürün detay galerisinde kullanılır.</small>}</td><td><input className="form-control" type="number" min="120" max="3200" value={v.width} onChange={e=>setProfile(key,'width',Number(e.target.value))}/></td><td><input className="form-control" type="number" min="120" max="3200" value={v.height} onChange={e=>setProfile(key,'height',Number(e.target.value))}/></td><td><select className="form-select" value={v.fit||'inside'} onChange={e=>setProfile(key,'fit',e.target.value)}><option value="inside">Oranı koru</option><option value="cover">Alanı doldur / kırp</option></select></td></tr>)}</tbody></table></div><div className="d-flex justify-content-between align-items-center mt-3"><small className="text-muted">Mevcut eski medya silinmez; yeni medya optimize edilir. Eski medya yeniden yüklendiğinde yeni sisteme geçer.</small><button className="btn btn-primary" disabled={busy} onClick={()=>void save()}>{busy?'Kaydediliyor…':'Görsel Ayarlarını Kaydet'}</button></div></div></div></>;
}

function DeleteStoreSettings({data,sid,req,reload}:CommonProps){
 const params=useSearchParams();const token=params.get('deleteToken')||'';const store=data?.settings||{};const[typed,setTyped]=useState('');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');
 async function requestDelete(){if(typed!==store.name)return;setBusy(true);setErr('');setMsg('');try{const x=await req('/admin/store-settings/'+sid+'/delete-request',{method:'POST',body:'{}'});setMsg(`Onay bağlantısı ${x.email||'kayıtlı e-posta'} adresine gönderildi.`);await reload()}catch(e:any){setErr(e.message||'Talep oluşturulamadı')}finally{setBusy(false)}}
 async function confirmDelete(){setBusy(true);setErr('');try{const x=await req('/admin/store-settings/'+sid+'/delete-confirm',{method:'POST',body:JSON.stringify({token})});setMsg(`Silme onaylandı. Mağaza ${new Date(x.scheduledAt).toLocaleString('tr-TR')} sonrasında kalıcı olarak silinecek.`);await reload()}catch(e:any){setErr(e.message||'Onaylanamadı')}finally{setBusy(false)}}
 async function cancel(){setBusy(true);setErr('');try{await req('/admin/store-settings/'+sid+'/delete-cancel',{method:'POST',body:'{}'});setMsg('Silme talebi iptal edildi.');await reload()}catch(e:any){setErr(e.message||'İptal edilemedi')}finally{setBusy(false)}}
 return <div className="card border-danger-subtle"><div className="card-header"><h4 className="card-title text-danger mb-1">Mağazamı Sil</h4><p className="text-muted mb-0">Silme isteği e-posta ile doğrulanır. Doğrulandıktan sonra 15 günlük bekleme süresi başlar ve bu süre içinde talebi iptal edebilirsiniz.</p></div><div className="card-body pt-0">{msg&&<div className="alert alert-success">{msg}</div>}{err&&<div className="alert alert-danger">{err}</div>}{store.deletionScheduledAt?<div className="alert alert-warning"><b>Silme planlandı.</b><br/>Kalıcı silme zamanı: {new Date(store.deletionScheduledAt).toLocaleString('tr-TR')}<div className="mt-3"><button className="btn btn-outline-danger" disabled={busy} onClick={()=>void cancel()}>Silme Talebini İptal Et</button></div></div>:token?<div className="alert alert-danger"><b>E-posta onay bağlantısı algılandı.</b><p className="mb-3 mt-2">Onay verirseniz 15 günlük kalıcı silme süresi başlayacak.</p><button className="btn btn-danger" disabled={busy} onClick={()=>void confirmDelete()}>E-posta Onayını Tamamla</button></div>:<><div className="delete-store-warning"><Icon icon="iconoir:warning-triangle"/><div><b>Bu işlem mağazanın ürünlerini, siparişlerini, müşterilerini, medya dosyalarını ve bağlı verilerini kalıcı olarak siler.</b><p className="mb-0">Devam etmek için mağaza adını birebir yazın: <strong>{store.name}</strong></p></div></div><label className="form-label mt-4">Mağaza adı</label><input className="form-control" value={typed} onChange={e=>setTyped(e.target.value)} placeholder={store.name}/><button className="btn btn-danger mt-3" disabled={busy||typed!==store.name} onClick={()=>void requestDelete()}>E-posta Onayı Gönder</button></>}</div></div>;
}
