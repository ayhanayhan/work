'use client';
import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import AuthShell,{AUTH_ASSET_ORIGIN} from './auth-shell';
import {useAuthLocale} from './auth-locale';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Membership={tenantId:string;tenantName:string;tenantStatus?:string;site:{name:string;publicSlug:string;domain?:string|null}};
function target(raw:string,m:Membership){
 const fallback={origin:'https://'+m.site.publicSlug+'.ticarti.com',path:'/admin'};
 if(!raw)return fallback;
 try{const url=new URL(raw);const allowed=[m.site.publicSlug+'.ticarti.com',String(m.site.domain||'').toLowerCase()];if(url.protocol==='https:'&&allowed.includes(url.hostname.toLowerCase())&&(url.pathname==='/admin'||url.pathname.startsWith('/admin/')))return{origin:url.origin,path:url.pathname+url.search}}catch{}
 return fallback;
}
function next(path:string){return path==='/admin'?'/dashboard':path.startsWith('/admin/')?path.slice(6):'/dashboard'}
export default function Login(){
 const {t}=useAuthLocale();
 const [view,setView]=useState<'welcome'|'email'>('welcome'),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[error,setError]=useState('');
 const [result,setResult]=useState<any>(null),[returnTo,setReturnTo]=useState(''),[intent,setIntent]=useState('');
 const [providers,setProviders]=useState<{google:{enabled:boolean};linkedin:{enabled:boolean}}>({google:{enabled:false},linkedin:{enabled:false}});
 function choose(m:Membership,res:any=result,rt=returnTo,ri=intent){const dest=target(rt,m),url=new URL('/admin/login',dest.origin);url.searchParams.set('handoff',res.handoffCode);url.searchParams.set('tenant',m.tenantId);url.searchParams.set('next',ri==='support'&&!rt?'/support':next(dest.path));window.location.assign(url.toString())}
 function accept(data:any,rt=returnTo,ri=intent){if(!data?.handoffCode||!Array.isArray(data?.memberships)||!data.memberships.length)throw Error(t('noStore'));if(data.memberships.length===1)choose(data.memberships[0],data,rt,ri);else setResult(data)}
 useEffect(()=>{const query=new URLSearchParams(window.location.search),rt=query.get('returnTo')||'',ri=query.get('intent')==='support'?'support':'';setReturnTo(rt);setIntent(ri);void(async()=>{try{const res=await fetch(API+'/merchant-auth/resume',{method:'POST',credentials:'include',headers:{'x-auth-client':'merchant-landing'}});if(!res.ok)return;const data=await res.json().catch(()=>({}));if(data?.handoffCode&&data?.memberships?.length)accept(data,rt,ri)}catch{}finally{setChecking(false)}})()},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const res=await fetch(API+'/merchant-auth/login',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},body:JSON.stringify({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')})});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(Array.isArray(data?.message)?data.message.join(', '):data?.message||t('loginFailed'));accept(data)}catch(e:any){setError(e.message||t('loginFailed'))}finally{setBusy(false)}}
 useEffect(()=>{let cancelled=false;void fetch(API+'/merchant-auth/providers',{cache:'no-store'}).then(async r=>(r.ok?await r.json():{}) as {google?:{enabled?:boolean};linkedin?:{enabled?:boolean}}).then(j=>{if(!cancelled)setProviders({google:{enabled:j?.google?.enabled===true},linkedin:{enabled:j?.linkedin?.enabled===true}})}).catch(()=>{});return()=>{cancelled=true}},[]);
 useEffect(()=>{
   const query=new URLSearchParams(window.location.search);
   const code=query.get('socialHandoff');
   const socialError=query.get('socialError');
   if(!code&&!socialError)return;
   const clean=new URL(window.location.href);
   clean.searchParams.delete('socialHandoff');clean.searchParams.delete('socialError');
   window.history.replaceState(null,'',clean.pathname+clean.search);
   if(socialError){setError(t('socialFailed'));setChecking(false);return}
   if(!code)return;
   setChecking(true);
   void(async()=>{try{
     const response=await fetch(API+'/merchant-auth/social/complete',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},body:JSON.stringify({code})});
     const data=await response.json().catch(()=>({}));
     if(!response.ok)throw Error(t('socialFailed'));
     accept(data);
   }catch(e:any){setError(e.message||t('socialFailed'))}finally{setChecking(false)}})();
 },[]);
 function startSocial(provider:'google'|'linkedin'){
   if(!providers[provider].enabled){setError(t('socialNotReady'));return}
   window.location.assign(API+'/merchant-auth/'+provider+'/start');
 }
 return <AuthShell aiContext={view==='email'?'email':'login'}>
 {checking?<section className="tc-view"><p className="tc-sub" role="status">{t('sessionChecking')}</p></section>:
 result?<section className="tc-view"><h1>{t('chooseStore')}</h1><p className="tc-sub">{t('chooseStoreSubtitle')}</p><div className="tc-store-list">{result.memberships.map((m:Membership)=><button type="button" key={m.tenantId} onClick={()=>choose(m)}><strong>{m.site.name}</strong><span>{m.site.domain||m.site.publicSlug+'.ticarti.com'}</span></button>)}</div></section>:
 view==='welcome'?<section className="tc-view" id="tc-welcome">
   <div className="tc-symbol" id="tc-welcome-icon" aria-hidden="true">⇥</div><h1 id="tc-welcome-title">{t('loginWelcome')}</h1><p className="tc-sub">{t('loginSubtitle')}</p>
   {error&&<p className="tc-error" role="alert">{error}</p>}
   <div className="tc-actions">
    <button id="tc-linkedin" aria-label={t('linkedInLogin')} className="tc-btn primary tc-provider-btn" type="button" onClick={()=>startSocial('linkedin')}><img className="tc-provider-logo tc-provider-logo--linkedin" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/linkedin-logo.svg'} alt=""/><span id="tc-linkedin-text">{t('signIn')}</span></button>
    <button id="tc-google" aria-label={t('googleLogin')} className="tc-btn tc-provider-btn" type="button" onClick={()=>startSocial('google')}><img className="tc-provider-logo tc-provider-logo--google" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/google-logo.svg'} alt=""/><span id="tc-google-text">{t('signIn')}</span></button>
    <div className="tc-or"><span id="tc-or-text">{t('or')}</span></div>
    <button className="tc-btn primary" type="button" onClick={()=>{setView('email');setError('')}}>{t('emailLogin')}</button>
    <p className="tc-switch">{t('noAccount')} <Link className="tc-link" href="/register">{t('registerLink')}</Link></p>
   </div>
  </section>:<section className="tc-view" id="tc-email">
   <h1>{t('emailLogin')}</h1><p className="tc-sub">{t('loginSubtitle')}</p>
   <form className="tc-form" onSubmit={submit}>
    <label>{t('email')}<input name="email" type="email" autoComplete="email" required placeholder={t('emailPlaceholder')}/></label>
    <label>{t('password')}<input name="password" type="password" autoComplete="current-password" required placeholder={t('password')}/></label>
    {error&&<div className="tc-error" role="alert">{error}</div>}
    <button className="tc-btn primary" type="submit" disabled={busy}>{busy?t('signingIn'):t('signIn')}</button>
   </form>
   <p className="tc-switch"><Link className="tc-link" href="/forgot-password" >{t('forgot')}</Link> · <button type="button" className="tc-link" onClick={()=>{setView('welcome');setError('')}} >{t('back')}</button></p>
  </section>}
 </AuthShell>;
}
