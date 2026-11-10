'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import AuthShell,{AUTH_ASSET_ORIGIN} from './auth-shell';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const SECTORS=['Giyim ve moda','Kozmetik ve kişisel bakım','Elektronik','Ev ve yaşam','Gıda','Diğer / Henüz karar vermedim'];
const PLANS=[
 {id:'start',name:'Start',desc:'Yeni başlayan işletmeler için'},
 {id:'grow',name:'Grow',desc:'Büyüyen mağazalar için'},
 {id:'scale',name:'Scale',desc:'Gelişmiş operasyonlar için'}
] as const;
const STEPS=[
 {title:'Önce hesabını oluşturalım.',desc:'Ad, e-posta ve şifre bilgilerini tamamla.'},
 {title:'Sana uygun paketi seç.',desc:'Başlangıç için kullanmak istediğin paketi belirle.'},
 {title:'Ne satmayı planlıyorsun?',desc:'İşini en iyi anlatan seçeneği işaretle.'},
 {title:'Mağazanı tanıyalım.',desc:'Mağaza adını dilediğin zaman değiştirebilirsin.'},
 {title:'Mağaza adresini seçelim.',desc:'Müşterilerin seni bu adreste bulacak.'},
 {title:'Son kontroller, hepsi bu.',desc:'Bilgilerini gözden geçir, ardından ödeme yapmadan mağazanı aç.'},
 {title:'Son adım: ödeme.',desc:'Ödeme altyapısı etkinleştirilene kadar mağazanı ödemesiz açabilirsin.'}
];
const passwordRule=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
function slugify(v:string){return v.trim().toLowerCase().replace(/[ğ]/g,'g').replace(/[ü]/g,'u').replace(/[ş]/g,'s').replace(/[ı]/g,'i').replace(/[ö]/g,'o').replace(/[ç]/g,'c').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-').slice(0,63)}
function errorMessage(data:any,fallback:string){return Array.isArray(data?.message)?data.message.join(', '):String(data?.message||fallback)}
type Signup={name:string;email:string;password:string;phone:string;sector:string;store:string;slug:string;plan:string;terms:boolean;marketing:boolean;pricesIncludeTax:boolean};
const init:Signup={name:'',email:'',password:'',phone:'',sector:'',store:'',slug:'',plan:'',terms:false,marketing:false,pricesIncludeTax:true};
export default function RegisterWizard(){
 const[welcome,setWelcome]=useState(true),[step,setStep]=useState(0),[values,setValues]=useState<Signup>(init);
 const[social,setSocial]=useState<'GOOGLE'|'LINKEDIN'|null>(null);
 const[providers,setProviders]=useState<{google:{enabled:boolean};linkedin:{enabled:boolean}}>({google:{enabled:false},linkedin:{enabled:false}});
 const[error,setError]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);
 const[availability,setAvailability]=useState<'idle'|'checking'|'yes'|'no'>('idle'),[availabilityMessage,setAvailabilityMessage]=useState('');
 const validSlug=useMemo(()=>slugify(values.slug),[values.slug]);
 useEffect(()=>{
  const p=new URLSearchParams(window.location.search).get('plan');
  if(PLANS.some(x=>x.id===p))setValues(v=>({...v,plan:p||''}));
  void fetch(API+'/merchant-auth/providers',{cache:'no-store'}).then(async r=>(r.ok?await r.json():{}) as {google?:{enabled?:boolean};linkedin?:{enabled?:boolean}}).then(data=>{
    setProviders({google:{enabled:data?.google?.enabled===true},linkedin:{enabled:data?.linkedin?.enabled===true}});
  }).catch(()=>{});
  void fetch(API+'/merchant-auth/social/pending',{cache:'no-store',credentials:'include'}).then(async r=>(r.ok?await r.json():{}) as {active?:boolean;provider?:string;email?:string;name?:string}).then(data=>{
    if(data.active===true&&(data.provider==='GOOGLE'||data.provider==='LINKEDIN')){
      setSocial(data.provider);setWelcome(false);setValues(v=>({...v,email:String(data.email||''),name:String(data.name||'')}));
    }
  }).catch(()=>{});
 },[]);
 useEffect(()=>{
  if(step!==4||validSlug.length<3||validSlug.length>63){setAvailability('idle');return}
  const controller=new AbortController();setAvailability('checking');
  const timer=setTimeout(async()=>{
   try{
    const res=await fetch(API+'/merchant-auth/subdomain-availability?subdomain='+encodeURIComponent(validSlug),{signal:controller.signal,cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    setAvailability(res.ok&&data.available===true?'yes':'no');setAvailabilityMessage(data.reason||data.message||'Bu adres kullanılamıyor.');
   }catch(e){if(!controller.signal.aborted){setAvailability('no');setAvailabilityMessage('Mağaza adresi kontrol edilemedi.');}}
  },400);
  return()=>{controller.abort();clearTimeout(timer)}
 },[step,validSlug]);
 const set=<K extends keyof Signup,>(key:K,val:Signup[K])=>{setValues(v=>({...v,[key]:val}));setError('')};
 function check(){
  if(step===0){
   if(values.name.trim().length<2||!/^\S+@\S+\.\S+$/.test(values.email))return 'Adını ve geçerli bir e-posta adresini gir.';
   if(!social&&!passwordRule.test(values.password))return 'Şifre en az 8 karakter; büyük ve küçük harf, rakam ve sembol içermelidir.';
   if(!values.terms)return 'Üyelik Sözleşmesi onaylanmalıdır.';
  }
  if(step===1&&!values.plan)return 'Bir paket seç.';
  if(step===2&&!values.sector)return 'Bir sektör seç.';
  if(step===3&&values.store.trim().length<2)return 'Mağaza adı en az 2 karakter olmalı.';
  if(step===4&&(validSlug.length<3||availability!=='yes'))return 'Kullanılabilir bir mağaza adresi seç.';
  return '';
 }
 function forward(e:FormEvent){e.preventDefault();const issue=check();if(issue){setError(issue);return}if(step===3&&!values.slug)setValues(v=>({...v,slug:slugify(v.store)}));setStep(s=>Math.min(s+1,6));setError('')}
 async function createStore(){
  if(busy)return;
  if(!values.name||!values.email||(!social&&!values.password)||!values.store||!validSlug||!values.terms||!values.sector||!values.plan){setError('Mağaza bilgilerini tamamla.');return}
  setBusy(true);setError('');
  try{
   const response=await fetch(API+(social?'/merchant-auth/social/register':'/merchant-auth/register'),{
    method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-landing'},
    body:JSON.stringify(social?{
      companyName:values.store.trim(),subdomain:validSlug,phone:values.phone.trim(),
      sector:values.sector,pricesIncludeTax:values.pricesIncludeTax,planCode:values.plan
    }:{
      name:values.name.trim(),email:values.email.trim(),password:values.password,phone:values.phone.trim(),
      companyName:values.store.trim(),sector:values.sector,subdomain:validSlug,pricesIncludeTax:values.pricesIncludeTax,planCode:values.plan
    })
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(errorMessage(result,'Mağaza oluşturulamadı.'));
   const m=result?.memberships?.[0];
   const slug=String(m?.site?.publicSlug||validSlug).toLowerCase();
   if(!result?.handoffCode||!m?.tenantId||!slug)throw new Error('Mağaza oluşturuldu ancak güvenli oturum başlatılamadı. Lütfen giriş yap.');
   const dest=new URL('/admin/login','https://'+slug+'.ticarti.com');
   dest.searchParams.set('handoff',result.handoffCode);dest.searchParams.set('tenant',m.tenantId);dest.searchParams.set('next','/dashboard');
   window.location.assign(dest.toString());
  }catch(e:any){setError(e.message||'İşlem başarısız.')}finally{setBusy(false)}
 }
 function startSocial(provider:'google'|'linkedin'){
  if(!providers[provider].enabled){setError((provider==='google'?'Google':'LinkedIn')+' giriş ayarı Master üzerinden etkinleştirilmelidir.');return}
  window.location.assign(API+'/merchant-auth/'+provider+'/start');
 }
 const field=(key:keyof Signup,label:string,type='text',placeholder='')=><label key={key}>{label}<input type={type} placeholder={placeholder} autoComplete={key==='email'?'email':key==='name'?'name':key==='password'?'new-password':key==='phone'?'tel':'off'} value={String(values[key])} onChange={e=>set(key as any,e.target.value as any)} required={key!=='phone'} /></label>;
 return <AuthShell progress={welcome?0:Math.round(((step+1)/STEPS.length)*100)}>
 {welcome?<section className="tc-view" id="tc-welcome">
   <h1>Mağazanı birlikte kuralım.</h1>
   <p className="tc-sub">Ücretsiz hesabını oluştur, mağazanı birkaç adımda hazırla.</p>
   <div className="tc-actions">
    <button className="tc-btn primary tc-provider-btn" type="button" onClick={()=>startSocial('linkedin')}><img className="tc-provider-logo" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/linkedin-logo.svg'} alt=""/>LinkedIn ile kaydol</button>
    <button className="tc-btn tc-provider-btn" type="button" onClick={()=>startSocial('google')}><img className="tc-provider-logo" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/google-logo.svg'} alt=""/>Google ile kaydol</button>
    {error&&<p className="tc-error" role="alert">{error}</p>}
    <div className="tc-or"><span>veya</span></div>
    <button className="tc-btn primary" type="button" onClick={()=>setWelcome(false)}>E-posta ile devam et</button>
    <p className="tc-switch">Zaten hesabın var mı? <Link className="tc-link" href="/">Giriş yap</Link></p>
   </div>
  </section>:
  <section className={'tc-view '+(step===1?'tc-view--plans':'')} id="tc-register">
   <h1>{STEPS[step].title}</h1><p className="tc-sub">{STEPS[step].desc}</p>
   <form className="tc-form" onSubmit={forward}>
    <div className="tc-fields">
     {step===0&&<>
      {social?<p className="tc-social-confirm">{social==='GOOGLE'?'Google':'LinkedIn'} hesabın doğrulandı. Adın ve e-posta adresin sağlayıcıdan alındı.</p>:null}
      {social?<p className="tc-social-profile"><strong>{values.name}</strong><span>{values.email}</span></p>:<>{field('name','Ad ve soyad','text','Ad Soyad')}{field('email','E-posta adresi','email','ornek@eposta.com')}</>}
      {!social&&<label>Şifre<div className="tc-password-wrap"><input required minLength={8} type={showPassword?'text':'password'} value={values.password} onChange={e=>set('password',e.target.value)} autoComplete="new-password" placeholder="En az 8 karakter"/><button type="button" className="tc-password-toggle" onClick={()=>setShowPassword(x=>!x)}>{showPassword?'Gizle':'Göster'}</button></div></label>}
      {field('phone','Telefon (isteğe bağlı)','tel','+90 5xx xxx xx xx')}
      <div className="tc-agreements">
       <label className="tc-agreement"><input type="checkbox" checked={values.terms} onChange={e=>set('terms',e.target.checked)} required/><span><a target="_blank" rel="noopener noreferrer" href="https://ticarti.com/uyelik-sozlesmesi.html">Üyelik Sözleşmesi</a>'ni kabul ediyorum ve <a target="_blank" rel="noopener noreferrer" href="https://ticarti.com/gizlilik-politikasi.html">Gizlilik Politikası</a> hakkında bilgilendirildim.</span></label>
       <label className="tc-agreement"><input type="checkbox" checked={values.marketing} onChange={e=>set('marketing',e.target.checked)}/><span>Ticarti'den yenilikler ve duyurular almak istiyorum.</span></label>
      </div>
     </>}
     {step===1&&<div className="tc-plan-choices" role="radiogroup" aria-label="Paket seçimi">{PLANS.map(p=><button key={p.id} type="button" className={'tc-plan-choice '+(values.plan===p.id?'is-selected':'')} role="radio" aria-checked={values.plan===p.id} onClick={()=>set('plan',p.id)}><span className="tc-plan-choice-name">{p.name}</span><span className="tc-plan-choice-desc">{p.desc}</span><span className="tc-plan-choice-select-label">{values.plan===p.id?'Seçildi':'Paketi seç'}</span></button>)}</div>}
     {step===2&&<div className="tc-choices" role="radiogroup" aria-label="Sektör">{SECTORS.map(s=><button type="button" key={s} className={'tc-choice '+(values.sector===s?'selected':'')} onClick={()=>set('sector',s)} role="radio" aria-checked={values.sector===s}><span className="tc-choice-label">{s}</span><span className="tc-choice-check">{values.sector===s?'✓':''}</span></button>)}</div>}
     {step===3&&field('store','Mağaza adı','text','Örn. Nova Store')}
     {step===4&&<label>Mağaza adresi<div className="tc-domain-input"><input value={values.slug} onChange={e=>set('slug',slugify(e.target.value))} required minLength={3} maxLength={63} autoCapitalize="off" spellCheck={false} placeholder="magazam"/><span>.ticarti.com</span></div><small className={'tc-inline-hint '+(availability==='no'?'is-error':'')}>{availability==='checking'?'Adres kontrol ediliyor…':availability==='yes'?'Bu adres kullanılabilir':availability==='no'?availabilityMessage:'3-63 karakter; harf, rakam ve tire'}</small></label>}
     {(step===5||step===6)&&<div className="tc-review"><h2>Mağaza özeti</h2><dl><dt>Ad soyad</dt><dd>{values.name}</dd><dt>E-posta</dt><dd>{values.email}</dd><dt>Mağaza</dt><dd>{values.store}</dd><dt>Adres</dt><dd>{validSlug}.ticarti.com</dd><dt>Paket tercihi</dt><dd>{PLANS.find(p=>p.id===values.plan)?.name}</dd></dl><p>Seçtiğin paket ile 14 günlük deneme mağazan oluşturulacak. Ödeme aşaması daha sonra tamamlanabilir.</p></div>}
     {step===6&&<div className="tc-unpaid-summary"><p>Online ödeme henüz etkin değil. Ödeme alınmadan mağazanı açabilirsin.</p></div>}
    </div>
    {error&&<p className="tc-error" role="alert">{error}</p>}
    <div className="tc-buttons">
     {step<5?<button type="submit" className="tc-btn primary">Devam</button>:step===5?<button type="submit" className="tc-btn primary">Ödeme adımına geç</button>:null}
     {(step===5||step===6)&&<button className="tc-btn primary" type="button" onClick={createStore} disabled={busy}>{busy?'Mağazan oluşturuluyor…':'Ödeme yapmadan mağazanı aç'}</button>}
     <button className="tc-back" type="button" onClick={()=>{if(step===0)setWelcome(true);else setStep(s=>s-1);setError('')}}>← Geri</button>
    </div>
   </form>
   <p className="tc-switch">Zaten hesabın var mı? <Link className="tc-link" href="/">Giriş yap</Link></p>
  </section>}
 </AuthShell>;
}
