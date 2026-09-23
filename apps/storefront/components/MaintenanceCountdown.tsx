'use client';

import {useEffect,useMemo,useState} from 'react';

type Props={store:any};

function remaining(target:string|null|undefined){
  if(!target)return null;
  const diff=Math.max(0,new Date(target).getTime()-Date.now());
  return {
    done:diff<=0,
    days:Math.floor(diff/86400000),
    hours:Math.floor((diff%86400000)/3600000),
    minutes:Math.floor((diff%3600000)/60000),
    seconds:Math.floor((diff%60000)/1000),
  };
}

export default function MaintenanceCountdown({store}:Props){
  const[,tick]=useState(0);
  useEffect(()=>{
    const id=setInterval(()=>{
      tick(x=>x+1);
      const at=store?.maintenanceLaunchAt?new Date(store.maintenanceLaunchAt).getTime():NaN;
      if(Number.isFinite(at)&&at<=Date.now()){clearInterval(id);setTimeout(()=>window.location.reload(),900)}
    },1000);
    return()=>clearInterval(id);
  },[store?.maintenanceLaunchAt]);
  const left=remaining(store?.maintenanceLaunchAt);
  const opening=useMemo(()=>{
    if(!store?.maintenanceLaunchAt)return '';
    const d=new Date(store.maintenanceLaunchAt);
    if(Number.isNaN(d.getTime()))return '';
    try{return new Intl.DateTimeFormat(store.locale||'tr-TR',{dateStyle:'long',timeStyle:'short',timeZone:store.timezone||undefined}).format(d)}catch{return d.toLocaleString()}
  },[store?.maintenanceLaunchAt,store?.locale,store?.timezone]);
  return <main className="maintenance-page">
    <section className="maintenance-card" aria-live="polite">
      {store?.logoUrl?<img className="maintenance-logo" src={store.logoUrl} alt={store?.name||'Mağaza'}/>:<div className="maintenance-wordmark">{store?.name||'Mağaza'}</div>}
      <span className="maintenance-kicker">YAPIM AŞAMASINDA</span>
      <h1>Çok yakında buradayız.</h1>
      <p>Mağazamızı sizin için hazırlıyoruz. Açılışa kalan süre:</p>
      {left&&!left.done?<div className="maintenance-countdown">
        <div><strong>{left.days}</strong><span>Gün</span></div>
        <div><strong>{String(left.hours).padStart(2,'0')}</strong><span>Saat</span></div>
        <div><strong>{String(left.minutes).padStart(2,'0')}</strong><span>Dakika</span></div>
        <div><strong>{String(left.seconds).padStart(2,'0')}</strong><span>Saniye</span></div>
      </div>:<div className="maintenance-status">{left?.done?'Açılış zamanı geldi.':'Açılış tarihi yakında duyurulacak.'}</div>}
      {opening&&<p className="maintenance-opening">Planlanan açılış: <b>{opening}</b></p>}
    </section>
  </main>;
}
