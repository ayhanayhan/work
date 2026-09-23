'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Icon} from '@iconify/react';
import {TurkeyBaseMap,WorldBaseMap} from './LiveMapShapes';

type Props={data:any;sid:string;req:(path:string,options?:any)=>Promise<any>};
type MapMode='world'|'local';

type Point={x:number;y:number};

const CITY_POINTS:Record<string,Point>={
  istanbul:{x:22,y:35},ankara:{x:49,y:47},izmir:{x:13,y:60},bursa:{x:24,y:45},antalya:{x:39,y:79},adana:{x:64,y:70},mersin:{x:57,y:75},konya:{x:47,y:65},gaziantep:{x:73,y:67},diyarbakir:{x:81,y:53},samsun:{x:61,y:28},trabzon:{x:78,y:23},erzurum:{x:87,y:37},kayseri:{x:61,y:51},eskisehir:{x:38,y:48},sakarya:{x:31,y:38},kocaeli:{x:27,y:36},tekirdag:{x:15,y:33},balikesir:{x:20,y:51},denizli:{x:30,y:67},mugla:{x:23,y:77},aydin:{x:19,y:69},manisa:{x:17,y:61},canakkale:{x:11,y:45},edirne:{x:10,y:29},kirklareli:{x:14,y:27},bolu:{x:37,y:39},duzce:{x:34,y:38},zonguldak:{x:40,y:31},kastamonu:{x:49,y:30},sinop:{x:55,y:23},corum:{x:56,y:39},amasya:{x:61,y:36},tokat:{x:66,y:39},sivas:{x:69,y:49},malatya:{x:72,y:57},elazig:{x:77,y:53},sanliurfa:{x:78,y:67},mardin:{x:84,y:64},van:{x:92,y:51},agri:{x:93,y:40},kars:{x:94,y:32},artvin:{x:86,y:24},rize:{x:82,y:23},ordu:{x:67,y:27},giresun:{x:72,y:26},hatay:{x:69,y:79},kahramanmaras:{x:69,y:63},osmaniye:{x:68,y:70},adiyaman:{x:75,y:61},batman:{x:84,y:56},sirnak:{x:89,y:61},hakkari:{x:95,y:59}
};

const COUNTRY_POINTS:Record<string,Point>={
  TR:{x:56,y:40},US:{x:20,y:32},CA:{x:20,y:18},MX:{x:18,y:43},BR:{x:31,y:60},AR:{x:30,y:75},CL:{x:28,y:72},GB:{x:46,y:27},IE:{x:44,y:27},FR:{x:48,y:32},DE:{x:51,y:29},NL:{x:49,y:28},BE:{x:49,y:30},ES:{x:46,y:35},PT:{x:44,y:35},IT:{x:52,y:35},CH:{x:50,y:32},AT:{x:53,y:31},PL:{x:55,y:29},SE:{x:53,y:21},NO:{x:50,y:20},FI:{x:57,y:20},UA:{x:60,y:31},RU:{x:68,y:21},RO:{x:57,y:34},GR:{x:54,y:38},BG:{x:56,y:36},AE:{x:61,y:45},SA:{x:59,y:48},EG:{x:54,y:45},ZA:{x:54,y:71},MA:{x:45,y:43},IN:{x:68,y:47},CN:{x:75,y:38},JP:{x:87,y:39},KR:{x:84,y:39},SG:{x:77,y:57},ID:{x:79,y:60},AU:{x:82,y:68},NZ:{x:91,y:76}
};

const COUNTRY_ALIASES:Record<string,string>={
  TURKIYE:'TR',TURKEY:'TR','TÜRKIYE':'TR',TR:'TR',USA:'US','UNITED STATES':'US','UNITED STATES OF AMERICA':'US',US:'US',
  'UNITED KINGDOM':'GB',UK:'GB',GB:'GB',GERMANY:'DE',DE:'DE',FRANCE:'FR',FR:'FR',NETHERLANDS:'NL',NL:'NL',BELGIUM:'BE',BE:'BE',
  SPAIN:'ES',ES:'ES',ITALY:'IT',IT:'IT',RUSSIA:'RU',RU:'RU',CHINA:'CN',CN:'CN',JAPAN:'JP',JP:'JP',INDIA:'IN',IN:'IN',
  CANADA:'CA',CA:'CA',BRAZIL:'BR',BR:'BR','UNITED ARAB EMIRATES':'AE',AE:'AE',SAUDI:'SA','SAUDI ARABIA':'SA',SA:'SA'
};

const norm=(v:string)=>String(v||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c');
const countryCode=(v:any)=>{const raw=String(v||'').trim();if(!raw)return'';const upper=raw.toUpperCase();return COUNTRY_ALIASES[upper]||(/^[A-Z]{2}$/.test(upper)?upper:'')};
function beep(){try{const AudioContext=(window as any).AudioContext||(window as any).webkitAudioContext;const ctx=new AudioContext();const o=ctx.createOscillator();const g=ctx.createGain();o.frequency.value=920;o.type='sine';g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.16,ctx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.42);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.43)}catch{}}

export default function LiveTrackingView({data:initial,sid,req}:Props){
  const[data,setData]=useState<any>(initial||{});const[sound,setSound]=useState(true);const[mode,setMode]=useState<MapMode>('world');const[zoom,setZoom]=useState(1);const[lastUpdated,setLastUpdated]=useState<Date>(new Date());const lastOrder=useRef<string>('');
  useEffect(()=>{setData(initial||{})},[initial]);
  useEffect(()=>{const saved=localStorage.getItem('commerce-live-map-mode');if(saved==='local'||saved==='world')setMode(saved)},[]);
  useEffect(()=>{localStorage.setItem('commerce-live-map-mode',mode);setZoom(1)},[mode]);
  useEffect(()=>{let live=true;const pull=async()=>{try{const next=await req('/admin/live?storeId='+encodeURIComponent(sid));if(!live)return;const newest=next?.recentOrders?.[0]?.id||'';if(lastOrder.current&&newest&&newest!==lastOrder.current&&sound)beep();if(newest)lastOrder.current=newest;setData(next);setLastUpdated(new Date())}catch{}};void pull();const t=window.setInterval(()=>void pull(),10000);return()=>{live=false;window.clearInterval(t)}},[sid,req,sound]);
  async function fullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{}}

  const m=data?.metrics||{};const cities=Array.isArray(data?.cities)?data.cities:[];const orders=Array.isArray(data?.recentOrders)?data.recentOrders:[];const top=Array.isArray(data?.topItems)?data.topItems:[];const hist=Array.isArray(data?.history)?data.history:[];const maxHist=Math.max(1,...hist.map((x:any)=>Number(x.visitors||0)));
  const countries=useMemo(()=>{if(Array.isArray(data?.countries)&&data.countries.length)return data.countries;const map=new Map<string,any>();for(const v of Array.isArray(data?.activeVisitors)?data.activeVisitors:[]){const c=String(v.country||'').trim();if(!c)continue;const key=countryCode(c)||c;const row=map.get(key)||{country:c,countryCode:countryCode(c),visitors:0,orders:0,revenue:0};row.visitors+=1;map.set(key,row)}return Array.from(map.values())},[data]);
  const cityPins=useMemo(()=>cities.map((c:any)=>({...c,point:CITY_POINTS[norm(c.city)]})).filter((c:any)=>c.point),[cities]);
  const countryPins=useMemo(()=>countries.map((c:any)=>{const code=countryCode(c.countryCode||c.country);return {...c,code,point:COUNTRY_POINTS[code]}}).filter((c:any)=>c.point),[countries]);
  const currentPins=mode==='world'?countryPins:cityPins;

  return <div className="live-v18-page">
    <header className="live-v18-topbar">
      <div className="live-v18-topbar-left"><Link href="/dashboard" className="live-v18-back" aria-label="Panele dön"><Icon icon="iconoir:arrow-left"/></Link><div><div className="live-v18-title"><span className="live-v18-online"/>Canlı Takip</div><small>{lastUpdated.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}, {lastUpdated.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</small></div></div>
      <div className="live-v18-topbar-actions"><div className="live-v18-map-switch"><button className={mode==='world'?'active':''} onClick={()=>setMode('world')}><Icon icon="iconoir:globe"/> Dünya</button><button className={mode==='local'?'active':''} onClick={()=>setMode('local')}><Icon icon="iconoir:map"/> Yerel</button></div><button className="live-v18-icon-btn" onClick={()=>setSound(x=>!x)} title="Sipariş sesi"><Icon icon={sound?'iconoir:sound-high':'iconoir:sound-off'}/></button><button className="live-v18-icon-btn" onClick={()=>void fullscreen()} title="Tam ekran"><Icon icon="iconoir:expand-lines"/></button></div>
    </header>

    <div className="live-v18-layout">
      <aside className="live-v18-sidebar">
        <div className="live-v18-metrics"><Metric icon="iconoir:group" label="Anlık Ziyaretçi" value={m.activeVisitors||0} tone="green"/><Metric icon="iconoir:stats-up-square" label="Bugünkü Satış" value={`₺${Number(m.todayRevenue||0).toLocaleString('tr-TR')}`} tone="brand"/><Metric icon="iconoir:user" label="Bugünkü Ziyaretçi" value={m.todayVisitors||0} tone="blue"/><Metric icon="iconoir:page" label="Bugünkü Sipariş" value={m.todayOrders||0} tone="green"/></div>
        <Section title="Ziyaretçi Geçmişi" right="Son 30 dk"><div className="live-v18-history-head"><Icon icon="iconoir:group"/> {hist.length?hist[hist.length-1]?.visitors||0:0} ziyaretçi</div><div className="live-v18-bars">{hist.map((x:any,i:number)=><i key={i} style={{height:`${Math.max(4,Number(x.visitors||0)/maxHist*100)}%`}} title={`${x.visitors} ziyaretçi`}/>)}</div></Section>
        <Section title="Müşteri Hareketleri" right="Son 30 dk"><Move label="Oluşturulan Sepet" value={m.cartCount||0} tone="green"/><Move label="Ödeme Adımındakiler" value={m.checkoutCount||0} tone="blue"/><Move label="Sipariş Verenler" value={m.recentOrderCount||0} tone="dark"/></Section>
        <Section title="Son Siparişler" right="son 30 dakika">{orders.slice(0,5).map((o:any)=><div className="live-v18-order" key={o.id}><div><b>#{o.number}</b><small>{[o.city,o.country].filter(Boolean).join(' · ')||'Konum bilinmiyor'}</small></div><strong>₺{Number(o.total||0).toLocaleString('tr-TR')}</strong></div>)}{!orders.length&&<Empty icon="iconoir:shopping-bag" text="Son 30 dakikada sipariş yok."/>}</Section>
        <Section title="Çok Satanlar" right="Bugün">{top.slice(0,5).map((x:any,i:number)=><div className="live-v18-top-item" key={i}><span>{i+1}</span><div><b>{x.title}</b><small>{x.quantity} adet</small></div></div>)}{!top.length&&<Empty icon="iconoir:shopping-bag" text="Bugün henüz satış yok."/>}</Section>
      </aside>

      <main className="live-v18-main"><section className="live-v18-map-card"><div className="live-v18-map-head"><div><h2>{mode==='world'?'Dünya Canlı Görünümü':'Yerel Canlı Görünüm'}</h2><p>{mode==='world'?'Ülke bazında canlı ziyaretçi ve sipariş hareketleri.':'Türkiye şehir bazında canlı ziyaretçi ve sipariş hareketleri.'}</p></div><div className="live-v18-legend"><span><i className="visitor"/> Ziyaretçi</span><span><i className="order"/> Sipariş</span></div></div>
        <div className={'live-v18-map-stage '+mode}><div className="live-v18-map-zoom" style={{transform:`scale(${zoom})`}}>{mode==='world'?<WorldBaseMap/>:<TurkeyBaseMap/>}{currentPins.map((p:any,i:number)=><MapPin key={(p.country||p.city||'pin')+i} point={p.point} label={mode==='world'?(p.country||p.code):(p.city||'Şehir')} visitors={Number(p.visitors||0)} orders={Number(p.orders||0)}/>)}</div>{!currentPins.length&&<div className="live-v18-map-empty"><Icon icon={mode==='world'?'iconoir:globe':'iconoir:map'}/><b>Konumu bilinen aktif ziyaretçi yok</b><span>{mode==='world'?'Ülke bilgisi geldiğinde dünya haritasında gösterilir.':'Şehir bilgisi geldiğinde Türkiye haritasında gösterilir.'}</span></div>}<div className="live-v18-zoom-controls"><button onClick={()=>setZoom(z=>Math.min(1.7,+(z+.15).toFixed(2)))}>+</button><button onClick={()=>setZoom(z=>Math.max(1,+(z-.15).toFixed(2)))}>−</button></div></div>
        <div className="live-v18-location-strip">{(mode==='world'?countries:cities).slice(0,8).map((r:any,i:number)=><div key={(r.country||r.city||i)}><b>{r.country||r.city||'Bilinmiyor'}</b><span>{Number(r.visitors||0)} ziyaretçi · {Number(r.orders||0)} sipariş</span></div>)}</div>
      </section></main>
    </div>
  </div>;
}

function Metric({icon,label,value,tone}:{icon:string;label:string;value:any;tone:string}){return <div className="live-v18-metric"><span className={'tone-'+tone}><Icon icon={icon}/></span><strong>{value}</strong><small>{label}</small></div>}
function Section({title,right,children}:{title:string;right?:string;children:ReactNode}){return <section className="live-v18-section"><header><b>{title}</b><small>{right}</small></header>{children}</section>}
function Move({label,value,tone}:{label:string;value:any;tone:string}){const width=Math.min(100,Number(value||0)*12);return <div className="live-v18-move"><div><span>{label}</span><b>{value}</b></div><i><em className={'tone-'+tone} style={{width:`${width}%`}}/></i></div>}
function Empty({icon,text}:{icon:string;text:string}){return <div className="live-v18-empty"><Icon icon={icon}/><span>{text}</span></div>}
function MapPin({point,label,visitors,orders}:{point:Point;label:string;visitors:number;orders:number}){return <div className={'live-v18-pin '+(orders>0?'has-order':'')} style={{left:`${point.x}%`,top:`${point.y}%`}} title={`${label} · ${visitors} ziyaretçi · ${orders} sipariş`}><i/><span>{label}{visitors?` · ${visitors}`:''}{orders?` · ${orders} sipariş`:''}</span></div>}
