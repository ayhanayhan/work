'use client';

import {useSeoPath} from './StorefrontThemeContext';
import {sfText} from '../lib/i18n';
import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {api,getCartToken,markCartMember,STORE} from '../lib/api';

const API=(process.env.NEXT_PUBLIC_API_URL||'/api/v1').replace(/\/$/,'');
function SocialButtons({returnTo='/account'}:{returnTo?:string}){
  const[cfg,setCfg]=useState<any>(null);
  useEffect(()=>{api(`/storefront/${STORE}/auth/config`).then(setCfg).catch(()=>setCfg({providers:{}}))},[]);
  const go=(p:string)=>{window.location.href=`${API}/storefront/${encodeURIComponent(STORE)}/auth/${p}/start?return=${encodeURIComponent(returnTo)}`};
  if(!cfg)return null;
  return <div className="customer-social-auth">
    {cfg.providers?.google?.enabled&&<button type="button" className="btn social-auth-btn" onClick={()=>go('google')}>Google ile devam et</button>}
    {cfg.providers?.facebook?.enabled&&<button type="button" className="btn social-auth-btn" onClick={()=>go('facebook')}>Facebook ile devam et</button>}
  </div>
}
export function CustomerLoginPage(){
  const url=useSeoPath();
  const[err,setErr]=useState('');const[busy,setBusy]=useState(false);
  const ret=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('return')||url('account'):url('account');
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setErr('');const f=new FormData(e.currentTarget);try{const result:any=await api(`/storefront/${STORE}/customers/login`,{method:'POST',body:JSON.stringify({email:f.get('email'),password:f.get('password')})});const cartToken=getCartToken();if(cartToken&&result?.accessToken){await api(`/storefront/customer/cart/${encodeURIComponent(cartToken)}/claim`,{method:'POST',headers:{authorization:`Bearer ${result.accessToken}`},body:'{}'}).catch(()=>undefined);markCartMember()}window.location.href=ret}catch(x:any){if(x?.code==='EMAIL_VERIFICATION_REQUIRED'||x?.payload?.message==='Email verification required'){
      window.location.href=`${url('verify-email')}?email=${encodeURIComponent(String(f.get('email')||''))}&return=${encodeURIComponent(ret)}`;return;
    }setErr(x.message||'Giriş yapılamadı')}finally{setBusy(false)}}
  return <main className="customer-auth-page"><section className="customer-auth-card"><h1>{sfText('deep.final2.089')}</h1><p>{sfText('deep.final2.090')}</p>{err&&<div className="error">{err}</div>}<SocialButtons returnTo={ret}/><div className="auth-separator"><span>veya</span></div><form onSubmit={submit}><label>E-posta<input name="email" type="email" autoComplete="email" required/></label><label>{sfText('deep.final2.018')}<input name="password" type="password" autoComplete="current-password" required/></label><div className="text-end"><Link href={url('forgot-password')}>Şifremi unuttum</Link></div><button className="btn" disabled={busy}>{busy?sfText('deep.final2.021'):sfText('deep.final2.089')}</button></form><p>{sfText('deep.final2.091')} <Link href={`${url('register')}?return=${encodeURIComponent(ret)}`}>{sfText('deep.final2.092')}</Link></p></section></main>
}
export function CustomerRegisterPage(){
  const url=useSeoPath();
  const[err,setErr]=useState('');const[busy,setBusy]=useState(false);
  const[legal,setLegal]=useState<Record<string,{title:string;href:string;version:string}>>({});
  const[legalLoading,setLegalLoading]=useState(true);
  const[b2bConfig,setB2bConfig]=useState<any>(null);
  const ret=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('return')||url('account'):url('account');
  useEffect(()=>{
    let cancelled=false;
    const locale=typeof document!=='undefined'?document.documentElement.lang||'tr':'tr';
    void Promise.all((['membership','privacy','kvkk','commercialElectronic','marketingExplicit'] as const).map(async kind=>{
      try{
        const doc:any=await api(`/storefront/${STORE}/legal/${kind}?locale=${encodeURIComponent(locale)}`);
        if(!doc?.href||!doc?.version)return [kind,null] as const;
        const href=String(doc.href);
        if(!href.startsWith('/')||href.startsWith('//'))return [kind,null] as const;
        return [kind,{href,title:String(doc.title||kind),version:String(doc.version)}] as const;
      }catch{return [kind,null] as const;}
    })).then(rows=>{
      if(cancelled)return;
      const found:Record<string,{title:string;href:string;version:string}>={};
      for(const [kind,doc] of rows)if(doc)found[kind]=doc;
      setLegal(found);
    }).finally(()=>{if(!cancelled)setLegalLoading(false)});
    return ()=>{cancelled=true};
  },[]);
  useEffect(()=>{api(`/storefront/${STORE}/b2b/config`).then(setB2bConfig).catch(()=>setB2bConfig({enabled:false}))},[]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setErr('');const f:any=Object.fromEntries(new FormData(e.currentTarget));try{
    const phone=String(f.phone||'').replace(/[\s().-]/g,'');
    const b2bAccount=!!b2bConfig?.enabled;if(b2bAccount&&!String(f.companyName||'').trim())throw new Error('Firma adı gerekli.');
    if(!/^\+?[0-9]{10,15}$/.test(phone))throw new Error('Geçerli bir telefon numarası girin (10–15 rakam).');
    if(!f.terms||!f.privacy||!f.kvkkNotice)throw new Error('Zorunlu sözleşme ve aydınlatma kutularını işaretleyin.');
    if(!legal.membership||!legal.privacy||!legal.kvkk)throw new Error('Yasal metinler henüz yayınlanmamış. Lütfen mağaza ile iletişime geçin.');
    const channels=!!f.emailMarketing||!!f.smsMarketing||!!f.phoneMarketing;
    if(channels&&!f.commercialElectronic)throw new Error('Pazarlama kanalları için ticari elektronik ileti onayını vermelisiniz.');
    if(f.commercialElectronic&&!legal.commercialElectronic)throw new Error('Ticari elektronik ileti metni henüz yayınlanmamış.');
    if(f.marketingExplicit&&!legal.marketingExplicit)throw new Error('Pazarlama açık rıza metni henüz yayınlanmamış.');
    const result:any=await api(`/storefront/${STORE}/customers/register`,{method:'POST',body:JSON.stringify({...f,phone,accountType:b2bAccount?'B2B':'PERSON',legalLocale:typeof document!=='undefined'?document.documentElement.lang||'tr':'tr',consents:{terms:!!f.terms,privacy:!!f.privacy,kvkkNotice:!!f.kvkkNotice,commercialElectronic:!!f.commercialElectronic,kvkkExplicit:!!f.marketingExplicit,emailMarketing:!!f.emailMarketing,smsMarketing:!!f.smsMarketing,phoneMarketing:!!f.phoneMarketing},consentVersions:{terms:legal.membership.version,privacy:legal.privacy.version,kvkkNotice:legal.kvkk.version,commercialElectronic:legal.commercialElectronic?.version||null,kvkkExplicit:legal.marketingExplicit?.version||null,emailMarketing:legal.commercialElectronic?.version||null,smsMarketing:legal.commercialElectronic?.version||null,phoneMarketing:legal.commercialElectronic?.version||null}})});const cartToken=getCartToken();if(cartToken&&result?.accessToken){await api(`/storefront/customer/cart/${encodeURIComponent(cartToken)}/claim`,{method:'POST',headers:{authorization:`Bearer ${result.accessToken}`},body:'{}'}).catch(()=>undefined);markCartMember()}if(result?.verificationRequired){window.location.href=`${url('verify-email')}?sent=1&email=${encodeURIComponent(String(f.email||''))}&return=${encodeURIComponent(ret)}`;return}window.location.href=ret}catch(x:any){setErr(x.message||'Kayıt oluşturulamadı')}finally{setBusy(false)}}
  return <main className="customer-auth-page"><section className="customer-auth-card wide"><h1>{sfText('deep.final2.093')}</h1><p>{sfText('deep.final2.094')}</p>{err&&<div className="error">{err}</div>}<SocialButtons returnTo={ret}/><div className="auth-separator"><span>veya</span></div><form onSubmit={submit} className="form-grid"><label>Ad<input name="firstName" required/></label><label>Soyad<input name="lastName" required/></label><label className="full">E-posta<input name="email" type="email" required/></label><label className="full">Telefon *<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+90 5XX XXX XX XX" minLength={10} maxLength={22} required/></label><label className="full">{sfText('deep.final2.018')}<input name="password" type="password" minLength={10} required/></label>{b2bConfig?.enabled&&b2bConfig?.registrationEnabled!==false&&<><div className="full" style={{padding:12,border:'1px solid var(--store-border)',fontSize:12}}><b>Firma hesabı</b><div style={{marginTop:4}}>Bu mağaza B2B modunda çalışıyor. Hesabınız firma hesabı olarak oluşturulacaktır.</div></div><label className="full">Firma adı *<input name="companyName" required/></label><label>Vergi numarası<input name="taxNumber" inputMode="numeric"/></label><label>Vergi dairesi<input name="taxOffice"/></label>{b2bConfig?.approvalMode==='MANUAL'&&<div className="full" style={{padding:12,border:'1px solid var(--store-border)',fontSize:12}}>Hesabınız oluşturulduktan sonra mağaza onayı bekleyecektir.</div>}</>}<label className="full consent"><input type="checkbox" name="terms" required/> <span>{legal.membership?<><a href={legal.membership.href} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{legal.membership.title}</a> metnini okudum ve kabul ediyorum.</>:"Üyelik sözleşmesi henüz yayınlanmamış."}</span></label><label className="full consent"><input type="checkbox" name="privacy" required/> <span>{legal.privacy?<><a href={legal.privacy.href} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{legal.privacy.title}</a> metnini okudum.</>:"Gizlilik politikası henüz yayınlanmamış."}</span></label><label className="full consent"><input type="checkbox" name="kvkkNotice" required/> <span>{legal.kvkk?<><a href={legal.kvkk.href} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{legal.kvkk.title}</a> aydınlatma metnini okudum.</>:"KVKK aydınlatma metni henüz yayınlanmamış."}</span></label><label className="full consent"><input type="checkbox" name="commercialElectronic" disabled={!legal.commercialElectronic}/> <span>{legal.commercialElectronic?<><a href={legal.commercialElectronic.href} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{legal.commercialElectronic.title}</a> kapsamında ticari elektronik ileti almak için onay veriyorum (isteğe bağlı).</>:"Ticari elektronik ileti izni şu anda sunulmuyor."}</span></label><div className="full" style={{paddingLeft:24,display:'flex',flexWrap:'wrap',gap:14}}><label><input type="checkbox" name="emailMarketing" disabled={!legal.commercialElectronic}/> E-posta</label><label><input type="checkbox" name="smsMarketing" disabled={!legal.commercialElectronic}/> SMS</label><label><input type="checkbox" name="phoneMarketing" disabled={!legal.commercialElectronic}/> Telefon araması</label></div><label className="full consent"><input type="checkbox" name="marketingExplicit" disabled={!legal.marketingExplicit}/> <span>{legal.marketingExplicit?<><a href={legal.marketingExplicit.href} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{legal.marketingExplicit.title}</a> kapsamında açık rıza veriyorum (isteğe bağlı).</>:"Pazarlama açık rızası şu anda sunulmuyor."}</span></label>{!legalLoading&&(!legal.membership||!legal.privacy||!legal.kvkk)&&<p className="full" role="alert">Hesap açılışı için gerekli yasal metinler mağaza yöneticisi tarafından yayınlanmalıdır.</p>}<button className="btn full" disabled={busy||legalLoading||!legal.membership||!legal.privacy||!legal.kvkk}>{busy?sfText('deep.final2.099'):sfText('deep.final2.093')}</button></form><p>{sfText('deep.final2.100')} <Link href={`${url('login')}?return=${encodeURIComponent(ret)}`}>{sfText('deep.final2.101')}</Link></p></section></main>
}
