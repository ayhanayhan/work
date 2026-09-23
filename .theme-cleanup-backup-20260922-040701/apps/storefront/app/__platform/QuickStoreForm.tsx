'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

function slugify(value:string){return value.trim().toLowerCase().replace(/[ğĞ]/g,'g').replace(/[üÜ]/g,'u').replace(/[şŞ]/g,'s').replace(/[ıİ]/g,'i').replace(/[öÖ]/g,'o').replace(/[çÇ]/g,'c').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-').slice(0,63)}

export default function QuickStoreForm(){
  const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[storeName,setStoreName]=useState('');const[subdomain,setSubdomain]=useState('');const[subdomainTouched,setSubdomainTouched]=useState(false);const[availability,setAvailability]=useState<any>(null);const[checking,setChecking]=useState(false);
  const fullDomain=useMemo(()=>`${subdomain||'magazaniz'}.ticarti.com`,[subdomain]);

  useEffect(()=>{if(subdomainTouched||!storeName.trim())return;setSubdomain(slugify(storeName))},[storeName,subdomainTouched]);
  useEffect(()=>{const value=slugify(subdomain);if(value!==subdomain)setSubdomain(value);if(value.length<3){setAvailability(null);return}const timer=window.setTimeout(async()=>{setChecking(true);try{const r=await fetch(API+'/merchant-auth/subdomain-availability?subdomain='+encodeURIComponent(value),{cache:'no-store'});const j=await r.json().catch(()=>({}));setAvailability(r.ok?j:{available:false,reason:j?.message||'Kontrol edilemedi'})}catch{setAvailability({available:false,reason:'Adres şu anda kontrol edilemedi'})}finally{setChecking(false)}},350);return()=>window.clearTimeout(timer)},[subdomain]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');
    try{
      const f=new FormData(e.currentTarget);const body={name:String(f.get('name')||'').trim(),email:String(f.get('email')||'').trim(),phone:String(f.get('phone')||'').trim(),companyName:storeName.trim(),subdomain:slugify(subdomain),sector:String(f.get('sector')||'').trim(),pricesIncludeTax:f.get('pricesIncludeTax')==='on',password:String(f.get('password')||'')};
      if(!body.subdomain||availability?.available===false)throw new Error(availability?.reason||'Geçerli bir mağaza adresi seçin.');
      const r=await fetch(API+'/merchant-auth/register',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(Array.isArray(j?.message)?j.message.join(', '):j?.message||'Mağaza oluşturulamadı.');
      const membership=j?.memberships?.[0];if(!j?.handoffCode||!membership?.tenantId)throw new Error('Mağaza oluşturuldu ancak güvenli giriş başlatılamadı.');
      const url=new URL('/admin/login','https://app.ticarti.com');url.searchParams.set('handoff',j.handoffCode);url.searchParams.set('tenant',membership.tenantId);url.searchParams.set('next','/dashboard');window.location.href=url.toString();
    }catch(x:any){setError(x?.message||'Mağaza oluşturulamadı.')}finally{setBusy(false)}
  }

  return <form className="ticarti-onboarding-form" onSubmit={submit}>
    <div className="ticarti-onboarding-head"><span>HIZLI KURULUM</span><h2>Mağazanızı birkaç bilgiyle hazırlayın.</h2><p>Hesabınız ve deneme mağazanız aynı işlemde oluşturulur. Daha sonra tüm ayarları yönetim panelinden değiştirebilirsiniz.</p></div>
    {error&&<div className="ticarti-auth-error">{error}</div>}
    <div className="ticarti-onboarding-grid">
      <label>Ad Soyad<input name="name" required minLength={2} autoComplete="name" placeholder="Adınız Soyadınız"/></label>
      <label>Telefon<input name="phone" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx"/></label>
      <label className="wide">E-posta<input name="email" type="email" required autoComplete="email" placeholder="ornek@firma.com"/></label>
      <label>Mağaza adı<input value={storeName} onChange={e=>setStoreName(e.target.value)} required minLength={2} placeholder="Örn. Mado"/></label>
      <label>Sektör<select name="sector" defaultValue=""><option value="">Sektör seçin</option><option>Moda & Giyim</option><option>Gıda & İçecek</option><option>Elektronik</option><option>Kozmetik & Bakım</option><option>Ev & Yaşam</option><option>Anne & Bebek</option><option>Hobi & Spor</option><option>Hizmet</option><option>Diğer</option></select></label>
      <label className="wide">Mağaza adresi<div className={'ticarti-domain-input '+(availability?.available===true?'ok':availability?.available===false?'bad':'')}><input value={subdomain} onChange={e=>{setSubdomainTouched(true);setSubdomain(e.target.value)}} required minLength={3} maxLength={63} spellCheck={false}/><span>.ticarti.com</span></div><small>{checking?'Adres kontrol ediliyor…':availability?.available===true?`${fullDomain} kullanılabilir`:availability?.reason||'Bu adres müşterilerinizin mağazanıza ulaşacağı ticarti alt alan adıdır.'}</small></label>
      <label className="wide">Şifre<input name="password" type="password" required autoComplete="new-password" minLength={8} placeholder="En az 8 karakter; büyük/küçük harf, rakam ve sembol"/></label>
      <label className="ticarti-check wide"><input name="pricesIncludeTax" type="checkbox" defaultChecked/><span><b>Ürün fiyatları KDV dahil</b><small>Türkiye mağazaları için önerilen başlangıç ayarı.</small></span></label>
    </div>
    <button className="ticarti-btn primary large full" disabled={busy||checking||availability?.available===false}>{busy?'Mağaza hazırlanıyor…':'Ücretsiz Mağazamı Oluştur'}</button>
    <p className="ticarti-onboarding-login">Zaten hesabınız var mı? <a href="https://login.ticarti.com/">Giriş yapın</a></p>
  </form>;
}
