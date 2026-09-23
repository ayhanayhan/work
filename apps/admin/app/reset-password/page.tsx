'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function ResetPasswordPage(){
  const router=useRouter(); const[token,setToken]=useState(''); const[error,setError]=useState(''); const[busy,setBusy]=useState(false); const[done,setDone]=useState(false);
  useEffect(()=>{setToken(new URLSearchParams(window.location.search).get('token')||'')},[]);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setError(''); const f=new FormData(e.currentTarget); const password=String(f.get('password')||''); const confirm=String(f.get('confirm')||'');
    if(password!==confirm){setError('Parolalar eşleşmiyor.');return}
    setBusy(true);
    try{
      const r=await fetch(API+'/merchant-auth/password/reset',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-admin'},body:JSON.stringify({token,password})});
      const j=await r.json().catch(()=>({})); if(!r.ok)throw new Error(j?.message||'Parola değiştirilemedi.'); setDone(true); setTimeout(()=>router.replace('/login'),1200);
    }catch(e:any){setError(e?.message||'Parola değiştirilemedi.')}finally{setBusy(false)}
  }
  return <div className="login"><form className="login-card" onSubmit={submit}>
    <h1>Yeni parola</h1><p className="muted">En az 8 karakter; büyük/küçük harf, rakam ve sembol kullanın.</p>
    {!token&&<div className="error">Sıfırlama bağlantısı geçersiz.</div>}{error&&<div className="error">{error}</div>}{done&&<div className="notice">Parolanız değiştirildi. Girişe yönlendiriliyorsunuz…</div>}
    <label>Yeni parola</label><input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={!token||done}/>
    <label>Yeni parola tekrar</label><input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={!token||done}/>
    <button className="btn" style={{width:'100%'}} disabled={busy||!token||done}>{busy?'Kaydediliyor…':'Parolayı değiştir'}</button>
  </form></div>
}
