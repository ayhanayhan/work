'use client';
import { FormEvent, useState } from 'react';
import { Icon } from '@iconify/react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function ForgotPasswordPage() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setMessage('');
    const f=new FormData(e.currentTarget);
    try{
      await fetch(API+'/merchant-auth/password/forgot',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-admin'},body:JSON.stringify({email:String(f.get('email')||'').trim()})});
      setMessage('Bu e-posta bir mağaza hesabına bağlıysa parola sıfırlama bağlantısı gönderildi.');
    }finally{setBusy(false)}
  }
  return <main className="commerce-auth-page"><div className="commerce-auth-wrap"><div className="card commerce-auth-card border-0 shadow-sm">
    <div className="card-body p-0 commerce-auth-header rounded-top"><div className="text-center p-4 p-md-5"><a href="/" className="commerce-auth-brand"><span>C</span><b>Commerce</b></a><h4 className="mt-4 mb-1 text-white">Parolanızı Yenileyin</h4><p className="text-white-50 mb-0">Hesabınıza bağlı e-posta adresini girin.</p></div></div>
    <div className="card-body commerce-auth-body"><form onSubmit={submit}>{message&&<div className="alert alert-success py-2">{message}</div>}<div className="mb-4"><label className="form-label">E-posta</label><div className="input-group commerce-auth-input"><span className="input-group-text"><Icon icon="iconoir:mail"/></span><input className="form-control" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="ornek@magaza.com"/></div></div><button className="btn btn-primary w-100 commerce-auth-submit" disabled={busy}>{busy?'Gönderiliyor…':'Sıfırlama Bağlantısı Gönder'}</button><p className="text-center mt-4 mb-0"><a className="commerce-auth-link" href="/login"><Icon icon="iconoir:arrow-left" className="me-1"/>Girişe dön</a></p></form></div>
  </div><p className="text-center text-muted mt-3 mb-0 fs-12">© {new Date().getFullYear()} Commerce · WE DID IT</p></div></main>;
}
