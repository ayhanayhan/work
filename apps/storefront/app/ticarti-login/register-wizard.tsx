'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import AuthShell,{AUTH_ASSET_ORIGIN} from './auth-shell';
import {useAuthLocale,type AuthKey} from './auth-locale';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const SECTORS=['Giyim ve moda','Kozmetik ve kişisel bakım','Elektronik','Ev ve yaşam','Gıda','Diğer / Henüz karar vermedim'];
const PLANS=[
 {id:'start',name:'Start',desc:'Yeni başlayan işletmeler için',price:'4.660',oldPrice:'5.490',features:['Online mağaza ve ürün yönetimi','Sipariş, müşteri ve stok takibi'],popular:false},
 {id:'grow',name:'Grow',desc:'Büyüyen mağazalar için',price:'6.998',oldPrice:'8.230',features:['Start kapsamındaki özellikler','Çoklu depo ve gelişmiş pazarlama'],popular:true},
 {id:'scale',name:'Scale',desc:'Yüksek satış hacimleri için',price:'11.618',oldPrice:'13.670',features:['Grow kapsamındaki özellikler','Depolar arası transfer ve gelişmiş raporlama'],popular:false}
] as const;
const annualPrice=(monthly:string)=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:0}).format(Number(monthly.replace(/\./g,''))*12);
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
 const {t}=useAuthLocale();
 const[welcome,setWelcome]=useState(true),[step,setStep]=useState(0),[values,setValues]=useState<Signup>(init);
 const[social,setSocial]=useState<'GOOGLE'|'LINKEDIN'|null>(null);
 const[providers,setProviders]=useState<{google:{enabled:boolean};linkedin:{enabled:boolean}}>({google:{enabled:false},linkedin:{enabled:false}});
 const[error,setError]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);
 const[availability,setAvailability]=useState<'idle'|'checking'|'yes'|'no'>('idle'),[availabilityMessage,setAvailabilityMessage]=useState('');
 const validSlug=useMemo(()=>slugify(values.slug),[values.slug]);
 const STEP_TITLE_KEYS:AuthKey[]=['accountTitle','planTitle','sectorTitle','storeTitle','domainTitle','reviewTitle','paymentTitle'];
 const STEP_DESC_KEYS:AuthKey[]=['accountDesc','planDesc','sectorDesc','storeDesc','domainDesc','reviewDesc','paymentDesc'];
 const sectorKeys:AuthKey[]=['sectorFashion','sectorBeauty','sectorElectronics','sectorHome','sectorFood','sectorOther'];
 const planDescriptions:Record<string,AuthKey>={start:'planStartDesc',grow:'planGrowDesc',scale:'planScaleDesc'};
 const planFeatures:Record<string,AuthKey[]>={start:['featureStart1','featureStart2'],grow:['featureGrow1','featureGrow2'],scale:['featureScale1','featureScale2']};
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
   if(values.name.trim().length<2||!/^\S+@\S+\.\S+$/.test(values.email))return t('accountInvalid');
   if(!social&&!passwordRule.test(values.password))return t('passwordRule');
   if(!values.terms)return t('requiredConsent');
  }
  if(step===1&&!values.plan)return t('planRequired');
  if(step===2&&!values.sector)return t('sectorRequired');
  if(step===3&&values.store.trim().length<2)return t('storeRequired');
  if(step===4&&(validSlug.length<3||availability!=='yes'))return t('domainRequired');
  return '';
 }
 function forward(e:FormEvent){e.preventDefault();const issue=check();if(issue){setError(issue);return}if(step===3&&!values.slug)setValues(v=>({...v,slug:slugify(v.store)}));setStep(s=>Math.min(s+1,6));setError('')}
 async function createStore(){
  if(busy)return;
  if(!values.name||!values.email||(!social&&!values.password)||!values.store||!validSlug||!values.terms||!values.sector||!values.plan){setError(t('invalidForm'));return}
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
   if(!response.ok)throw new Error(errorMessage(result,t('createError')));
   const m=result?.memberships?.[0];
   const slug=String(m?.site?.publicSlug||validSlug).toLowerCase();
   if(!result?.handoffCode||!m?.tenantId||!slug)throw new Error(t('storeCreated'));
   const dest=new URL('/admin/login','https://'+slug+'.ticarti.com');
   dest.searchParams.set('handoff',result.handoffCode);dest.searchParams.set('tenant',m.tenantId);dest.searchParams.set('next','/dashboard');
   window.location.assign(dest.toString());
  }catch(e:any){setError(e.message||t('createError'))}finally{setBusy(false)}
 }
 function startSocial(provider:'google'|'linkedin'){
  if(!providers[provider].enabled){setError(t('socialNotReady'));return}
  window.location.assign(API+'/merchant-auth/'+provider+'/start');
 }
 const field=(key:keyof Signup,label:string,type='text',placeholder='')=><label key={key}>{label}<input type={type} placeholder={placeholder} autoComplete={key==='email'?'email':key==='name'?'name':key==='password'?'new-password':key==='phone'?'tel':'off'} value={String(values[key])} onChange={e=>set(key as any,e.target.value as any)} required={key!=='phone'} /></label>;
 return <AuthShell progress={welcome?0:Math.round(((step+1)/STEPS.length)*100)} aiContext={welcome?'registerWelcome':step}>
 {welcome?<section className="tc-view" id="tc-welcome">
   <div className="tc-symbol" id="tc-welcome-icon" aria-hidden="true">⇥</div><h1 id="tc-welcome-title">{t('registerWelcome')}</h1>
   <p className="tc-sub">{t('registerSubtitle')}</p>
   <div className="tc-actions">
    <button id="tc-linkedin" aria-label={t('linkedInRegister')} className="tc-btn primary tc-provider-btn" type="button" onClick={()=>startSocial('linkedin')}><img className="tc-provider-logo tc-provider-logo--linkedin" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/linkedin-logo.svg'} alt=""/><span id="tc-linkedin-text">{t('registerLink')}</span></button>
    <button id="tc-google" aria-label={t('googleRegister')} className="tc-btn tc-provider-btn" type="button" onClick={()=>startSocial('google')}><img className="tc-provider-logo tc-provider-logo--google" src={AUTH_ASSET_ORIGIN+'/assets/images/auth/google-logo.svg'} alt=""/><span id="tc-google-text">{t('registerLink')}</span></button>
    {error&&<p className="tc-error" role="alert">{error}</p>}
    <div className="tc-or"><span id="tc-or-text">{t('or')}</span></div>
    <button className="tc-btn primary" type="button" onClick={()=>setWelcome(false)}>{t('continueEmail')}</button>
    <p className="tc-switch">{t('haveAccount')} <Link className="tc-link" href="/">{t('signIn')}</Link></p>
   </div>
  </section>:
  <section className={'tc-view '+(step===1?'tc-view--plans':'')} id="tc-register">
   <h1>{t(STEP_TITLE_KEYS[step])}</h1><p className="tc-sub">{t(STEP_DESC_KEYS[step])}</p>
   <form className="tc-form" onSubmit={forward}>
    <div className="tc-fields">
     {step===0&&<>
      {social?<p className="tc-social-confirm">{social==='GOOGLE'?'Google':'LinkedIn'}{' '}{t('verifiedName')}</p>:null}
      {social?<p className="tc-social-profile"><strong>{values.name}</strong><span>{values.email}</span></p>:<>{field('name',t('name'),'text',t('name'))}{field('email',t('email'),'email',t('emailPlaceholder'))}</>}
      {!social&&<label>{t('password')}<div className="tc-password-wrap"><input required minLength={8} type={showPassword?'text':'password'} value={values.password} onChange={e=>set('password',e.target.value)} autoComplete="new-password" placeholder={t('passwordPlaceholder')}/><button type="button" className="tc-password-toggle" onClick={()=>setShowPassword(x=>!x)}>{showPassword?t('hide'):t('show')}</button></div></label>}
      {field('phone',t('phone'),'tel','+90 5xx xxx xx xx')}
      <div className="tc-agreements">
       <label className="tc-agreement"><input type="checkbox" checked={values.terms} onChange={e=>set('terms',e.target.checked)} required/><span><a target="_blank" rel="noopener noreferrer" href="https://ticarti.com/uyelik-sozlesmesi.html">{t('terms')}</a>{' '}{t('termsConsent')} <a target="_blank" rel="noopener noreferrer" href="https://ticarti.com/gizlilik-politikasi.html">{t('privacy')}</a></span></label>
       <label className="tc-agreement"><input type="checkbox" checked={values.marketing} onChange={e=>set('marketing',e.target.checked)}/><span >{t('marketingConsent')}</span></label>
      </div>
     </>}
     {step===1&&<>
      <div className="tc-plan-choices" role="radiogroup" aria-label={t('choosePlan')}>
       {PLANS.map(p=><button key={p.id} type="button" className={'tc-plan-choice'+(values.plan===p.id?' is-selected':'')+(p.popular?' is-popular':'')} role="radio" aria-checked={values.plan===p.id} tabIndex={values.plan===p.id||(!values.plan&&p.id==='start')?0:-1} onClick={()=>set('plan',p.id)}>
        <span className="tc-plan-choice-head"><span className="tc-plan-choice-name">{p.name}</span><span className="tc-plan-choice-indicator" aria-hidden="true">{values.plan===p.id?'✓':''}</span></span>
        {p.popular?<span className="tc-plan-choice-badge">{t('popular')}</span>:<span className="tc-plan-choice-badge-placeholder" aria-hidden="true"/>}
        <span className="tc-plan-choice-desc">{t(planDescriptions[p.id])}</span>
        <span className="tc-plan-choice-price"><strong>₺{annualPrice(p.price)}</strong><small>{t('year')}</small></span>
        <span className="tc-plan-choice-tax"><s>₺{annualPrice(p.oldPrice)}{t('year')}</s><span>{t('taxIncluded')}</span></span>
        <span className="tc-plan-choice-divider" aria-hidden="true"/>
        <span className="tc-plan-choice-features">{planFeatures[p.id].map(key=><span key={key} className="tc-plan-choice-feature"><span className="tc-plan-choice-check" aria-hidden="true">✓</span>{t(key)}</span>)}</span>
        <span className="tc-plan-choice-select-label" aria-hidden="true">{values.plan===p.id?t('selected'):t('selectPlan')} <span>{values.plan===p.id?'✓':'→'}</span></span>
       </button>)}
      </div>
      <p className="tc-plan-note">{t('planNote')} {t('taxHint')}</p>
     </>}
     {step===2&&<div className="tc-choices" role="radiogroup" aria-label={t('selectSector')}>{SECTORS.map(s=><button type="button" key={s} className={'tc-choice '+(values.sector===s?'selected':'')} onClick={()=>set('sector',s)} role="radio" aria-checked={values.sector===s}><span className="tc-choice-label">{t(sectorKeys[SECTORS.indexOf(s)])}</span><span className="tc-choice-check">{values.sector===s?'✓':''}</span></button>)}</div>}
     {step===3&&field('store',t('storeName'),'text',t('storePlaceholder'))}
     {step===4&&<label>{t('storeAddress')}<div className="tc-domain-input"><input value={values.slug} onChange={e=>set('slug',slugify(e.target.value))} required minLength={3} maxLength={63} autoCapitalize="off" spellCheck={false} placeholder={t('domainPlaceholder')}/><span>.ticarti.com</span></div><small className={'tc-inline-hint '+(availability==='no'?'is-error':'')}>{availability==='checking'?t('checkingDomain'):availability==='yes'?t('available'):availability==='no'?availabilityMessage:t('domainHint')}</small></label>}
     {(step===5||step===6)&&<div className="tc-payment-summary">
      <div className="tc-payment-summary-heading"><strong>{step===6?t('payment'):t('review')}</strong><span className="tc-payment-trial">{t('trial')}</span></div>
      <div className="tc-payment-summary-row"><span>{t('planName')}</span><strong>{PLANS.find(p=>p.id===values.plan)?.name||'—'}</strong></div>
      <div className="tc-payment-summary-row"><span>{t('storeName')}</span><strong>{values.store||'—'}</strong></div>
      <div className="tc-payment-summary-row"><span>{t('storeAddress')}</span><strong>{validSlug?validSlug+'.ticarti.com':'—'}</strong></div>
      <div className="tc-payment-summary-total"><span>{t('postTrial')}<small>{t('annualSummary')}</small></span><strong>₺{annualPrice(PLANS.find(p=>p.id===values.plan)?.price||'0')}<small> {t('year')}</small></strong></div>
     </div>}
          {step===6&&<div className="tc-unpaid-summary"><p>{t('unpaidHint')}</p></div>}
    </div>
    {error&&<p className="tc-error" role="alert">{error}</p>}
    <div className="tc-buttons">
     {step<5?<button type="submit" className="tc-btn primary">{t('next')}</button>:step===5?<button type="submit" className="tc-btn primary">{t('goPayment')}</button>:null}
     {(step===5||step===6)&&<button className="tc-btn primary" type="button" onClick={createStore} disabled={busy}>{busy?t('creating'):t('openWithoutPayment')}</button>}
     <button className="tc-back" type="button" onClick={()=>{if(step===0)setWelcome(true);else setStep(s=>s-1);setError('')}}>{t('back')}</button>
    </div>
   </form>
   <p className="tc-switch">{t('haveAccount')} <Link className="tc-link" href="/">{t('signIn')}</Link></p>
  </section>}
 </AuthShell>;
}
