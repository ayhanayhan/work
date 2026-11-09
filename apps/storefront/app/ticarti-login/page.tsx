'use client';
import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import AuthShell,{AUTH_ASSET_ORIGIN} from './auth-shell';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const GOOGLE_CLIENT_ID=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID||'';
declare global{interface Window{google?:any}}
type Membership={tenantId:string;tenantName:string;tenantStatus?:string;site:{name:string;publicSlug:string;domain?:string|null}};
function target(raw:string,m:Membership){
 const fallback={origin:'https://'+m.site.publicSlug+'.ticarti.com',path:'/admin'};
 if(!raw)return fallback;
 try{const url=new URL(raw);const allowed=[m.site.publicSlug+'.ticarti.com',String(m.site.domain||'').toLowerCase()];if(url.protocol==='https:'&&allowed.includes(url.hostname.toLowerCase())&&(url.pathname==='/admin'||url.pathname.startsWith('/admin/')))return{origin:url.origin,path:url.pathname+url.search}}catch{}
 return fallback;
}
function next(path:string){return path==='/admin'?'/dashboard':path.startsWith('/admin/')?path.slice(6):'/dashboard'}
export default function Login(){
 const [view,setView]=useState<'welcome'|'email'>('welcome'),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[error,setError]=useState('');
 const [result,setResult]=useState<any>(null),[returnTo,setReturnTo]=useState(''),[intent,setIntent]=useState('');
 function choose(m:Membership,res:any=result,rt=returnTo,ri=intent){const dest=target(rt,m),url=new URL('/admin/login',dest.origin);url.searchParams.set('handoff',res.handoffCode);url.searchParams.set('tenant',m.tenantId);url.searchParams.set('next',ri==='support'&&!rt?'/support':next(dest.path));window.location.assign(url.toString())}
 function accept(data:any,rt=returnTo,ri=intent){if(!data?.handoffCode||!Array.isArray(data?.memberships)||!data.memberships.length)throw Error('Bu hesaba bağlı aktif mağaza bulunamadı.');if(data.memberships.length===1)choose(data.memberships[0],data,rt,ri);else setResult(data)}
 useEffect(()=>{const query=new URLSearchParams(window.location.search),rt=query.get('returnTo')||'',ri=query.get('intent')==='support'?'support':'';setReturnTo(rt);setIntent(ri);void(async()=>{try{const res=await fetch(API+'/merchant-auth/resume',{method:'POST',credentials:'include',headers:{'x-auth-client':'merchant-landing'}});if(!res.ok)return;const data=await res.json().catch(()=>({}));if(data?.handoffCode&&data?.memberships?.length)accept(data,rt,ri)}catch{}finally{setChecking(false)}})()},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const res=await fetch(API+'/merchant-auth/login',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},body:JSON.stringify({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')})});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(Array.isArray(data?.message)?data.message.join(', '):data?.message||'Giriş başarısız.');accept(data)}catch(e:any){setError(e.message||'Giriş başarısız.')}finally{setBusy(false)}}
 useEffect(()=>{if(!GOOGLE_CLIENT_ID||result||view!=='welcome'||checking)return;let active=true;const init=()=>{if(!active||!window.google?.accounts?.id)return;window.google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:async(response:any)=>{setBusy(true);setError('');try{const res=await fetch(API+'/merchant-auth/google',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},body:JSON.stringify({credential:response.credential})});const data=await res.json().catch(()=>({}));if(data?.requiresRegistration)throw Error('Bu Google hesabına bağlı mağaza bulunamadı.');if(!res.ok)throw Error(data?.message||'Google ile giriş başarısız.');accept(data)}catch(e:any){setError(e.message||'Google ile giriş başarısız.')}finally{setBusy(false)}}});const box=document.getElementById('ticarti-google');if(box){box.innerHTML='';window.google.accounts.id.renderButton(box,{theme:'outline',size:'large',width:320,text:'signin_with',shape:'rectangular'})}};const existing=document.getElementById('google-identity-services');if(existing){init();return()=>{active=false}}const script=document.createElement('script');script.id='google-identity-services';script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.onload=init;document.head.appendChild(script);return()=>{active=false}},[view,result,checking]);
 return <AuthShell>
 {checking?<section className="tc-view"><p className="tc-sub" role="status">Oturum kontrol ediliyor…</p></section>:
 result?<section className="tc-view"><h1>Mağazanı seç.</h1><p className="tc-sub">Devam etmek istediğin mağazayı seç.</p><div className="tc-store-list">{result.memberships.map((m:Membership)=><button type="button" key={m.tenantId} onClick={()=>choose(m)}><strong>{m.site.name}</strong><span>{m.site.domain||m.site.publicSlug+'.ticarti.com'}</span></button>)}</div></section>:
 view==='welcome'?<section className="tc-view" id="tc-welcome">
   <h1>Ticarti'ye tekrar hoş geldin.</h1><p className="tc-sub">Mağazanı yönetmek için hesabına giriş yap.</p>
   {error&&<p className="tc-error" role="alert">{error}</p>}
   <div className="tc-actions">
    <button className="tc-btn tc-provider-btn" type="button" disabled><img className="tc-provider-logo" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/linkedin-logo.svg'} alt=""/>LinkedIn ile giriş (yakında)</button>
    {GOOGLE_CLIENT_ID?<div id="ticarti-google" className="tc-google-login"/>:<button className="tc-btn tc-provider-btn" type="button" disabled><img className="tc-provider-logo" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/google-logo.svg'} alt=""/>Google ile giriş (yakında)</button>}
    <div className="tc-or"><span>veya</span></div>
    <button className="tc-btn primary" type="button" onClick={()=>{setView('email');setError('')}}>E-posta ile giriş yap</button>
    <p className="tc-switch">Hesabın yok mu? <Link className="tc-link" href="/register">Kayıt ol</Link></p>
   </div>
  </section>:<section className="tc-view" id="tc-email">
   <h1>E-posta ile giriş yap.</h1><p className="tc-sub">Hesap bilgilerini girerek devam et.</p>
   <form className="tc-form" onSubmit={submit}>
    <label>E-posta adresi<input name="email" type="email" autoComplete="email" required placeholder="ornek@eposta.com"/></label>
    <label>Şifre<input name="password" type="password" autoComplete="current-password" required placeholder="Şifren"/></label>
    {error&&<div className="tc-error" role="alert">{error}</div>}
    <button className="tc-btn primary" type="submit" disabled={busy}>{busy?'Giriş yapılıyor…':'Giriş yap'}</button>
   </form>
   <p className="tc-switch"><Link className="tc-link" href="/forgot-password">Şifremi unuttum</Link> · <button type="button" className="tc-link" onClick={()=>{setView('welcome');setError('')}}>Geri dön</button></p>
  </section>}
 </AuthShell>;
}
