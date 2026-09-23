'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

type Plan={id:string;name:string;code:string;description?:string|null;monthlyPrice:any;yearlyPrice?:any;currency:string;trialDays:number;maxStaff:number;maxProducts:number;maxOrdersPerMonth?:number|null;features?:Record<string,any>};
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
function money(n:any,c='TRY'){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(n||0))}
function featureList(p:Plan){
  const base=[`${Number(p.maxProducts||0).toLocaleString('tr-TR')} ürün`,`${p.maxStaff} ekip kullanıcısı`,p.maxOrdersPerMonth?`${Number(p.maxOrdersPerMonth).toLocaleString('tr-TR')} aylık sipariş`:'Sipariş limiti pakete göre'];
  const map:any={customDomain:'Özel alan adı',promotions:'Gelişmiş promosyonlar',multiCurrency:'Çoklu para birimi',api:'API erişimi',prioritySupport:'Öncelikli destek',reviews:'Ürün yorumları'};
  for(const [k,v] of Object.entries(p.features||{}))if(v&&map[k])base.push(map[k]);return base.slice(0,7);
}
export default function PlatformPlans({compact=false}:{compact?:boolean}){
  const[plans,setPlans]=useState<Plan[]>([]);const[error,setError]=useState('');
  useEffect(()=>{fetch(API+'/platform/plans').then(async r=>{const j=await r.json().catch(()=>[]);if(!r.ok)throw new Error('Paketler alınamadı');setPlans(Array.isArray(j)?j:[])}).catch(e=>setError(e.message))},[]);
  if(error)return <div className="ticarti-notice">{error}</div>;
  if(!plans.length)return <div className="ticarti-plan-loading">Paketler hazırlanıyor…</div>;
  return <div className={`ticarti-plan-grid ${compact?'compact':''}`}>{plans.slice(0,compact?3:plans.length).map((p,i)=><article className={`ticarti-plan-card ${i===1?'featured':''}`} key={p.id}>{i===1&&<span className="ticarti-plan-badge">Öne çıkan</span>}<div className="ticarti-plan-head"><h3>{p.name}</h3><p>{p.description||'E-ticaret operasyonunuzu tek panelden yönetin.'}</p></div><div className="ticarti-price"><b>{money(p.monthlyPrice,p.currency)}</b><span>/ ay</span></div><ul>{featureList(p).map(x=><li key={x}><span>✓</span>{x}</li>)}</ul><a className={i===1?'ticarti-btn primary':'ticarti-btn'} href="/ucretsiz-dene">Başla</a></article>)}</div>;
}
