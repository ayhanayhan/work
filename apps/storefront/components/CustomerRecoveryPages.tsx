'use client';

import {useSeoPath} from './StorefrontThemeContext';
import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {api,getCartToken,markCartMember,STORE} from '../lib/api';

export function CustomerForgotPasswordPage(){const url=useSeoPath();
 const[message,setMessage]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{await api(`/storefront/${STORE}/customers/password/forgot`,{method:'POST',body:JSON.stringify({email:f.get('email')})});setMessage('E-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.')}catch(e:any){setError(e.message||'İşlem tamamlanamadı')}finally{setBusy(false)}}
 return <main className="customer-auth-page"><section className="customer-auth-card"><h1>Şifremi unuttum</h1><p>Hesabınıza ait e-posta adresini girin.</p>{message&&<div className="notice">{message}</div>}{error&&<div className="error">{error}</div>}<form onSubmit={submit}><label>E-posta<input type="email" name="email" required/></label><button className="btn" disabled={busy}>{busy?'Gönderiliyor…':'Sıfırlama bağlantısı gönder'}</button></form><p><Link href={url('login')}>Girişe dön</Link></p></section></main>
}
export function CustomerResetPasswordPage(){const url=useSeoPath();
 const sp=useSearchParams();const token=sp.get('token')||'';const[message,setMessage]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const password=String(f.get('password')||''),confirm=String(f.get('confirm')||'');if(password!==confirm){setError('Şifreler eşleşmiyor');return}setBusy(true);setError('');try{await api(`/storefront/${STORE}/customers/password/reset`,{method:'POST',body:JSON.stringify({token,password})});setMessage('Şifreniz güncellendi. Artık giriş yapabilirsiniz.')}catch(e:any){setError(e.message||'Bağlantı geçersiz veya süresi dolmuş')}finally{setBusy(false)}}
 return <main className="customer-auth-page"><section className="customer-auth-card"><h1>Yeni şifre oluştur</h1>{message&&<div className="notice">{message}</div>}{error&&<div className="error">{error}</div>}{!message&&<form onSubmit={submit}><label>Yeni şifre<input type="password" name="password" minLength={10} required/></label><label>Yeni şifre tekrar<input type="password" name="confirm" minLength={10} required/></label><button className="btn" disabled={busy||!token}>{busy?'Kaydediliyor…':'Şifreyi değiştir'}</button></form>}<p><Link href={url('login')}>Girişe dön</Link></p></section></main>
}
export function CustomerVerifyEmailPage(){const url=useSeoPath();
 const sp=useSearchParams();const token=sp.get('token')||'';const sent=sp.get('sent')==='1';const originalEmail=sp.get('email')||'';
 const[resendEmail,setResendEmail]=useState(originalEmail);const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState(sent?'Doğrulama bağlantısı e-posta adresinize gönderildi.':token?'E-posta doğrulanıyor…':'Hesabınızı aktifleştirmek için e-postanızı doğrulayın.');
 const[error,setError]=useState('');
 const requestedReturn=sp.get('return')||url('account');
 const safeReturn=requestedReturn.startsWith('/')&&!requestedReturn.startsWith('//')&&!requestedReturn.includes('\\')?requestedReturn:url('account');
 useEffect(()=>{if(!token)return;let cancelled=false;setBusy(true);
  api(`/storefront/${STORE}/customers/verify`,{method:'POST',body:JSON.stringify({token})}).then(async(result:any)=>{
    if(cancelled)return;
    const cartToken=getCartToken();if(cartToken&&result?.accessToken){await api(`/storefront/customer/cart/${encodeURIComponent(cartToken)}/claim`,{method:'POST',headers:{authorization:`Bearer ${result.accessToken}`},body:'{}'}).then(()=>markCartMember()).catch(()=>undefined)}
    if(cancelled)return;setMessage('E-posta adresiniz doğrulandı. Hesabınız aktif.');window.location.replace(safeReturn);
  }).catch((e:any)=>{if(cancelled)return;setError(e.message||'Doğrulama bağlantısı geçersiz veya süresi dolmuş.');setMessage('')}).finally(()=>{if(!cancelled)setBusy(false)});
  return()=>{cancelled=true};
 },[token,safeReturn]);
 async function resend(){if(busy||!resendEmail.trim())return;setBusy(true);setError('');try{await api(`/storefront/${STORE}/customers/verify/request`,{method:'POST',body:JSON.stringify({email:resendEmail.trim()})});setMessage('E-posta adresi kayıtlı ve doğrulanmamışsa yeni bağlantı gönderilecektir.')}catch(e:any){setError(e.message||'İstek tamamlanamadı')}finally{setBusy(false)}}
 return <main className="customer-auth-page"><section className="customer-auth-card"><h1>E-posta doğrulama</h1>{message&&<div className="notice">{message}</div>}{error&&<div className="error" role="alert">{error}</div>}{(!token||error)&&<div><label>E-posta adresiniz<input type="email" autoComplete="email" value={resendEmail} onChange={e=>setResendEmail(e.target.value)} required/></label><button type="button" className="btn" disabled={busy||!resendEmail.trim()} onClick={()=>void resend()}>{busy?'Gönderiliyor…':'Doğrulama e-postasını tekrar gönder'}</button></div>}<p><Link href={url('login')}>Girişe dön</Link></p></section></main>
}
