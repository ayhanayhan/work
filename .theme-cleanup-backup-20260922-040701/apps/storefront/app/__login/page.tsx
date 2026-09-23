'use client';
import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const GOOGLE_CLIENT_ID=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID||'';
declare global{interface Window{google?:any}}

type Membership={tenantId:string;tenantName:string;tenantStatus?:string;site:{name:string;publicSlug:string;domain?:string|null}};
const APP_ORIGIN='https://app.ticarti.com';
function requestedAdminTarget(raw:string,m:Membership){
  const fallback={origin:APP_ORIGIN,path:'/admin'};
  if(!raw)return fallback;
  try{
    const u=new URL(raw);
    const allowed=new Set(['app.ticarti.com',`${m.site.publicSlug}.ticarti.com`,String(m.site.domain||'').toLowerCase()].filter(Boolean));
    if(u.protocol==='https:'&&allowed.has(u.hostname.toLowerCase())&&(u.pathname==='/admin'||u.pathname.startsWith('/admin/')))return{origin:u.origin,path:u.pathname+u.search};
  }catch{}
  return fallback;
}
function nextFor(path:string){if(path==='/admin')return '/dashboard';return path.startsWith('/admin/')?path.slice('/admin'.length):'/dashboard'}

export default function Login(){
  const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[result,setResult]=useState<any>(null);const[returnTo,setReturnTo]=useState('');
  useEffect(()=>{setReturnTo(new URLSearchParams(window.location.search).get('returnTo')||'')},[]);
  function choose(m:Membership,res:any=result){const target=requestedAdminTarget(returnTo,m);const url=new URL('/admin/login',target.origin);url.searchParams.set('handoff',res.handoffCode);url.searchParams.set('tenant',m.tenantId);url.searchParams.set('next',nextFor(target.path));window.location.href=url.toString()}
  function accept(res:any){if(!res?.handoffCode||!Array.isArray(res.memberships)||!res.memberships.length)throw new Error('Bu hesaba bağlı aktif bir mağaza bulunamadı.');if(res.memberships.length===1)choose(res.memberships[0],res);else setResult(res)}
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const r=await fetch(API+'/merchant-auth/login',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},body:JSON.stringify({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Giriş başarısız.');accept(j)}catch(e:any){setError(e.message||'Giriş başarısız.')}finally{setBusy(false)}}
  useEffect(()=>{if(!GOOGLE_CLIENT_ID||result)return;const init=()=>{if(!window.google?.accounts?.id)return;window.google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:async(response:any)=>{setBusy(true);setError('');try{const r=await fetch(API+'/merchant-auth/google',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},body:JSON.stringify({credential:response.credential})});const j=await r.json().catch(()=>({}));if(j?.requiresRegistration)throw new Error('Bu Google hesabına bağlı mağaza bulunamadı.');if(!r.ok)throw new Error(j?.message||'Google ile giriş başarısız.');accept(j)}catch(e:any){setError(e.message)}finally{setBusy(false)}}});const el=document.getElementById('ticarti-google');if(el){el.innerHTML='';window.google.accounts.id.renderButton(el,{theme:'outline',size:'large',width:360,text:'signin_with',shape:'rectangular'})}};const id='google-identity-services';const old=document.getElementById(id) as HTMLScriptElement|null;if(old){init();return}const sc=document.createElement('script');sc.id=id;sc.src='https://accounts.google.com/gsi/client';sc.async=true;sc.defer=true;sc.onload=init;document.head.appendChild(sc)},[result,returnTo]);
  return <main className="ticarti-login-screen"><section className="ticarti-login-brand"><a className="ticarti-logo light" href="https://ticarti.com">ticarti<span>.</span></a><div><span>E-TİCARET YÖNETİMİ</span><h1>Mağazanızın kontrolü tek yerde.</h1><p>Siparişlerden ürünlere, canlı takipten kampanyalara tüm operasyonunuza güvenli erişim.</p></div><small>ticarti.com</small></section><section className="ticarti-login-panel"><div className="ticarti-login-card">{result?<><div className="ticarti-login-title"><span>MAĞAZA SEÇİMİ</span><h2>Hangi mağazayı yöneteceksiniz?</h2><p>Hesabınıza bağlı mağazalardan birini seçin.</p></div><div className="ticarti-store-list">{result.memberships.map((m:Membership)=><button key={m.tenantId} onClick={()=>choose(m)}><i>{m.site.name.slice(0,1).toUpperCase()}</i><span><b>{m.site.name}</b><small>{m.site.domain||`${m.site.publicSlug}.ticarti.com`}</small></span><em>→</em></button>)}</div></>:<><div className="ticarti-login-title"><span>MAĞAZA YÖNETİMİ</span><h2>Tekrar hoş geldiniz.</h2><p>Yönetim paneline devam etmek için hesabınıza giriş yapın.</p></div>{error&&<div className="ticarti-auth-error">{error}</div>}<form onSubmit={submit}><label>E-posta<input name="email" type="email" autoComplete="email" required placeholder="ornek@firma.com"/></label><label>Şifre<input name="password" type="password" autoComplete="current-password" required placeholder="••••••••"/></label><div className="ticarti-login-meta"><label><input type="checkbox" defaultChecked/> Beni hatırla</label><Link href="/forgot-password">Şifremi unuttum</Link></div><button className="ticarti-btn primary full large" disabled={busy}>{busy?'Giriş yapılıyor…':'Giriş Yap'}</button></form>{GOOGLE_CLIENT_ID&&<><div className="ticarti-or"><span>veya</span></div><div id="ticarti-google" className="ticarti-google"/></>}<p className="ticarti-login-bottom">Ticarti hakkında bilgi almak için <a href="https://ticarti.com">ticarti.com</a></p></>}</div></section></main>
}
