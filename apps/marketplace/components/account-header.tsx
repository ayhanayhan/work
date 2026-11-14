'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

const AUTH='https://login.ticarti.com/api/v1/merchant-auth';
type Membership={tenantId:string;tenantName?:string;site?:{name?:string;publicSlug?:string;domain?:string|null}};
type Session={authenticated?:boolean;user?:{name?:string|null;email?:string};memberships?:Membership[]};

function shopUrl(m?:Membership,segment='/admin/dashboard'){
  const slug=String(m?.site?.publicSlug||'').toLowerCase();
  // Never trust a profile value as an arbitrary redirect destination.
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)
    ?'https://'+slug+'.ticarti.com'+segment
    :'https://login.ticarti.com/';
}
const labels={
  tr:{login:'Giriş yap',register:'Siteni oluştur',panel:'Yönetim Paneli',account:'Hesabım',help:'Yardım Merkezi',support:'Destek Taleplerim',settings:'Mağaza Ayarları',logout:'Tüm cihazlardan çıkış',shops:'Mağazalarım',loading:'Oturum kontrol ediliyor'},
  en:{login:'Sign in',register:'Create store',panel:'Dashboard',account:'My account',help:'Help Center',support:'Support',settings:'Store settings',logout:'Sign out of all devices',shops:'My stores',loading:'Checking session'},
  de:{login:'Anmelden',register:'Shop erstellen',panel:'Verwaltung',account:'Mein Konto',help:'Hilfe',support:'Support',settings:'Shop-Einstellungen',logout:'Von allen Geräten abmelden',shops:'Meine Shops',loading:'Sitzung wird geprüft'},
  ru:{login:'Войти',register:'Создать магазин',panel:'Панель управления',account:'Мой аккаунт',help:'Центр помощи',support:'Поддержка',settings:'Настройки магазина',logout:'Выйти на всех устройствах',shops:'Мои магазины',loading:'Проверка входа'},
  ar:{login:'تسجيل الدخول',register:'إنشاء متجر',panel:'لوحة التحكم',account:'حسابي',help:'مركز المساعدة',support:'الدعم',settings:'إعدادات المتجر',logout:'تسجيل الخروج من جميع الأجهزة',shops:'متاجري',loading:'جارٍ التحقق من الجلسة'},
  uk:{login:'Увійти',register:'Створити магазин',panel:'Панель керування',account:'Мій акаунт',help:'Центр допомоги',support:'Підтримка',settings:'Налаштування магазину',logout:'Вийти на всіх пристроях',shops:'Мої магазини',loading:'Перевірка входу'},
  bg:{login:'Вход',register:'Създай магазин',panel:'Контролен панел',account:'Моят профил',help:'Помощ',support:'Поддръжка',settings:'Настройки на магазина',logout:'Изход от всички устройства',shops:'Моите магазини',loading:'Проверка на сесията'},
  id:{login:'Masuk',register:'Buat toko',panel:'Dasbor',account:'Akun saya',help:'Pusat Bantuan',support:'Dukungan',settings:'Pengaturan toko',logout:'Keluar dari semua perangkat',shops:'Toko saya',loading:'Memeriksa sesi'},
  vi:{login:'Đăng nhập',register:'Tạo cửa hàng',panel:'Bảng điều khiển',account:'Tài khoản',help:'Trung tâm trợ giúp',support:'Hỗ trợ',settings:'Cài đặt cửa hàng',logout:'Đăng xuất mọi thiết bị',shops:'Cửa hàng của tôi',loading:'Đang kiểm tra phiên'}
};
export function TicartiAccountHeader({locale='tr',loginHref='https://login.ticarti.com/',registerHref='https://login.ticarti.com/register',loginLabel,registerLabel,variant='site'}:{
  locale?:string;loginHref?:string;registerHref?:string;loginLabel?:string;registerLabel?:string;variant?:'site'|'app';
}){
  const t=labels[locale as keyof typeof labels]||labels.en;
  const[session,setSession]=useState<Session|null>(null);
  const[ready,setReady]=useState(false);
  const[open,setOpen]=useState(false);
  const[busy,setBusy]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const load=useCallback(async()=>{
    try{
      const r=await fetch(AUTH+'/session',{method:'GET',credentials:'include',cache:'no-store',headers:{'x-auth-client':'merchant-landing','accept':'application/json'}});
      const data:Session=r.ok?await r.json():{};
      setSession(data.authenticated===true&&Array.isArray(data.memberships)&&data.memberships.length?data:null);
    }catch{setSession(null)}finally{setReady(true)}
  },[]);
  useEffect(()=>{
    void load();
    const onFocus=()=>void load();
    const onVisibility=()=>{if(document.visibilityState==='visible')void load()};
    const onPointer=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    document.addEventListener('pointerdown',onPointer);
    document.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('pointerdown',onPointer);document.removeEventListener('keydown',onKey)};
  },[load]);
  const signOut=async()=>{
    if(busy)return;
    setBusy(true);
    try{
      const r=await fetch(AUTH+'/logout',{method:'POST',credentials:'include',cache:'no-store',
        headers:{'x-auth-client':'merchant-landing','content-type':'application/json'},body:'{}'});
      if(!r.ok)throw new Error('Logout failed');
      setSession(null);setOpen(false);
      // A fresh session check also clears stale profile state in open tabs.
    }catch{await load()}finally{setBusy(false)}
  };
  const memberships=session?.memberships||[];
  const selected=memberships[0];
  const name=String(session?.user?.name||session?.user?.email||selected?.site?.name||t.account);
  const store=String(selected?.site?.name||selected?.tenantName||'');
  const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase(locale==='tr'?'tr-TR':'en-US');
  const panel=shopUrl(selected);
  return <div ref={root} dir={locale==='ar'?'rtl':'ltr'} className={'tc-account-header tc-account-header--'+variant}>
    <style>{`
      .tc-account-header{display:flex;align-items:center;gap:10px;position:relative;min-width:0}
      .tc-account-header .tc-account-cta,.tc-account-header .tc-account-guest{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:41px;padding:0 15px;border-radius:9px;text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap}
      .tc-account-header .tc-account-guest{color:inherit;border:1px solid rgba(128,128,128,.3);background:transparent}
      .tc-account-header .tc-account-cta{background:#f0f97b;color:#161a12;border:1px solid #d5df64}
      .tc-account-header .tc-account-trigger{display:flex;align-items:center;gap:9px;max-width:220px;padding:4px 8px 4px 4px;border:1px solid rgba(128,128,128,.28);border-radius:30px;background:transparent;color:inherit;cursor:pointer;font:inherit}
      .tc-account-header .tc-account-avatar{width:36px;height:36px;flex:none;border-radius:50%;background:#f0f97b;color:#202414;display:grid;place-items:center;font-weight:700;font-size:12px}
      .tc-account-header .tc-account-identity{display:flex;flex-direction:column;min-width:0;text-align:left;line-height:1.3}
      .tc-account-header .tc-account-identity strong,.tc-account-header .tc-account-identity small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .tc-account-header .tc-account-identity strong{font-size:12px}
      .tc-account-header .tc-account-identity small{font-size:11px;opacity:.65}
      .tc-account-header .tc-account-dropdown{position:absolute;z-index:100050;right:0;top:calc(100% + 10px);width:min(310px,calc(100vw - 24px));padding:9px;background:#fff;color:#1c2118;border:1px solid #e2e4dd;box-shadow:0 18px 45px rgba(0,0,0,.16);border-radius:14px;text-align:left}
      .tc-account-header .tc-account-dropdown a,.tc-account-header .tc-account-dropdown button{display:flex;width:100%;align-items:center;gap:9px;padding:11px 12px;background:transparent;border:0;border-radius:8px;text-align:left;text-decoration:none;font:inherit;font-size:13px;color:#202414;cursor:pointer}
      .tc-account-header .tc-account-dropdown a:hover,.tc-account-header .tc-account-dropdown button:hover{background:#f4f6e9}
      .tc-account-header .tc-account-dropdown .tc-account-separator{height:1px;margin:7px 4px;background:#e8e9e4}
      .tc-account-header[dir="rtl"] .tc-account-dropdown{right:auto;left:0;text-align:right}
      .tc-account-header .tc-account-dropdown .tc-account-profile{padding:10px 12px;display:flex;flex-direction:column;gap:2px;word-break:break-word}
      .tc-account-header .tc-account-dropdown .tc-account-profile small{color:#657062;font-size:12px}
      .tc-account-header .tc-account-dropdown .tc-account-store-label{font-size:11px;font-weight:700;letter-spacing:.03em;color:#677068;padding:6px 12px}
      .tc-account-header .tc-account-skeleton{height:41px;width:174px;border-radius:12px;background:rgba(127,127,127,.09)}
      @media(max-width:800px){.tc-account-header{flex-wrap:wrap;justify-content:center}.tc-account-header .tc-account-cta{min-height:38px}.tc-account-header .tc-account-trigger{max-width:175px}}
    `}</style>
    {!ready?<span className="tc-account-skeleton" aria-label={t.loading}/>:
     !session?<><a className="tc-account-guest" href={loginHref}>{loginLabel||t.login}</a><a className="tc-account-cta" href={registerHref}>{registerLabel||t.register}</a></>:
     <>
      <a className="tc-account-cta" href={panel}>{t.panel}</a>
      <button className="tc-account-trigger" type="button" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(v=>!v)}>
       <span className="tc-account-avatar" aria-hidden="true">{initials||'T'}</span>
       <span className="tc-account-identity"><strong>{name}</strong><small>{store||t.account}</small></span>
       <span aria-hidden="true">⌄</span>
      </button>
      {open?<div className="tc-account-dropdown" role="menu">
       <div className="tc-account-profile"><strong>{name}</strong><small>{session.user?.email||store}</small></div>
       <div className="tc-account-separator"/>
       <a role="menuitem" href={panel}>{t.panel}</a>
       <a role="menuitem" href={shopUrl(selected,'/admin/settings')}>{t.settings}</a>
       <a role="menuitem" href="https://help.ticarti.com/">{t.help}</a>
       <a role="menuitem" href={shopUrl(selected,'/admin/support')}>{t.support}</a>
       {memberships.length>1?<><div className="tc-account-separator"/><div className="tc-account-store-label">{t.shops}</div>
        {memberships.map((m,i)=><a role="menuitem" href={shopUrl(m)} key={m.tenantId||i}>{m.site?.name||m.tenantName||'Mağaza'}</a>)}</>:null}
       <div className="tc-account-separator"/>
       <button role="menuitem" type="button" disabled={busy} onClick={()=>void signOut()}>{t.logout}</button>
      </div>:null}
     </>}
   </div>;
}
