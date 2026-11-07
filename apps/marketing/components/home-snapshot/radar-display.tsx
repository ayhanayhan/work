'use client';
import {useEffect,useState} from 'react';
type StaticTarget={id:string;className:string;alt:string;src:string;slot:number;zone:'inner'|'outer';person?:boolean;alternate?:string};
type Target=StaticTarget&{scans:number;swap:boolean;detected:boolean};
const portraitRoot='https://inbound.shakersworks.com/hubfs/Web%20repositioning/Radar%20animation/';
const points:{angle:number;radius:number;zone:'inner'|'outer'}[]=[
  {angle:353,radius:.405,zone:'outer'},{angle:43,radius:.395,zone:'outer'},
  {angle:92,radius:.400,zone:'outer'},{angle:141,radius:.395,zone:'outer'},
  {angle:190,radius:.403,zone:'outer'},{angle:243,radius:.393,zone:'outer'},
  {angle:297,radius:.408,zone:'outer'},{angle:342,radius:.235,zone:'inner'},
  {angle:56,radius:.235,zone:'inner'},{angle:127,radius:.235,zone:'inner'},
  {angle:199,radius:.230,zone:'inner'},{angle:274,radius:.230,zone:'inner'}
];
const original:StaticTarget[]=[
  {id:'person-top',className:'tc-radar__person tc-radar__person--top-left',alt:'Kullanıcı',src:portraitRoot+'builder-a3.png',alternate:portraitRoot+'builder-b3.png',slot:6,zone:'outer',person:true},
  {id:'hepsiburada',className:'tc-radar__item tc-radar__item--hepsiburada',alt:'Hepsiburada',src:'/assets/images/marketplaces/hepsiburada.svg',slot:7,zone:'inner'},
  {id:'person-right',className:'tc-radar__person tc-radar__person--right',alt:'Kullanıcı',src:portraitRoot+'builder-a1.png',alternate:portraitRoot+'builder-b1.png',slot:2,zone:'outer',person:true},
  {id:'n11',className:'tc-radar__item tc-radar__item--n11',alt:'n11',src:'/assets/images/marketplaces/n11.svg',slot:9,zone:'inner'},
  {id:'pazarama',className:'tc-radar__item tc-radar__item--pazarama',alt:'Pazarama',src:'/assets/images/marketplaces/pazarama.svg',slot:3,zone:'outer'},
  {id:'person-bottom',className:'tc-radar__person tc-radar__person--bottom',alt:'Kullanıcı',src:portraitRoot+'builder-a2.png',alternate:portraitRoot+'builder-b2.png',slot:10,zone:'inner',person:true},
  {id:'ciceksepeti',className:'tc-radar__item tc-radar__item--ciceksepeti',alt:'ÇiçekSepeti',src:'/assets/images/marketplaces/ciceksepeti.svg',slot:4,zone:'outer'},
  {id:'epttavm',className:'tc-radar__item tc-radar__item--epttavm',alt:'PttAVM',src:'/assets/images/marketplaces/epttavm.svg',slot:5,zone:'outer'},
  {id:'trendyol',className:'tc-radar__item tc-radar__item--trendyol',alt:'Trendyol',src:'/assets/images/marketplaces/trendyol.svg',slot:11,zone:'inner'}
];
const angleDistance=(a:number,b:number)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
export default function RadarDisplay(){
  const [targets,setTargets]=useState<Target[]>(original.map(t=>({...t,scans:0,swap:false,detected:false})));
  const [inView,setInView]=useState(false);
  useEffect(()=>{
    const el=document.querySelector('.tc-page-home .tc-radar');
    if(!el)return;
    if(!('IntersectionObserver' in window)){setInView(true);return;}
    const io=new IntersectionObserver(entries=>setInView(entries.some(x=>x.isIntersecting)),{rootMargin:'120px 0px 120px 0px'});
    io.observe(el);return()=>io.disconnect();
  },[]);
  useEffect(()=>{
    if(!inView||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let turn=0;
    const timer=window.setInterval(()=>{
      if(document.hidden)return;
      setTargets(current=>{
        const i=turn++%current.length,selected=current[i],occupied=new Set(current.map(x=>x.slot));
        const choices=points.map((p,slot)=>({p,slot})).filter(({p,slot})=>
          p.zone===selected.zone&&!occupied.has(slot)&&angleDistance(p.angle,points[selected.slot].angle)>=45);
        const move=(selected.person?selected.scans%3===2:(selected.scans+i)%2===0)&&choices.length>0;
        const nextSlot=move?choices[(selected.scans*5+i*3)%choices.length].slot:selected.slot;
        return current.map((node,j)=>j===i?{...node,slot:nextSlot,swap:node.person?!node.swap:node.swap,scans:node.scans+1,detected:true}:node.detected?{...node,detected:false}:node);
      });
    },1700);
    return()=>clearInterval(timer);
  },[inView]);
  return <div aria-label="Pazaryeri bağlantı ağı" className={'tc-radar'+(inView?' is-scanning':'')} role="img">
    <div aria-hidden="true" className="tc-radar__beam"/>
    <div aria-hidden="true" className="tc-radar__ring tc-radar__ring--1"/>
    <div aria-hidden="true" className="tc-radar__ring tc-radar__ring--2"/>
    <div aria-hidden="true" className="tc-radar__ring tc-radar__ring--3"/>
    <div aria-hidden="true" className="tc-radar__ring tc-radar__ring--4"/>
    <div className="tc-radar__core"><img alt="Ticarti" src="/assets/images/ticarti-logo.svg"/></div>
    {targets.map(t=>{
      const pos=points[t.slot],theta=pos.angle*Math.PI/180;
      const left=(50+100*pos.radius*Math.sin(theta)).toFixed(3)+'%';
      const top=(50-100*pos.radius*Math.cos(theta)).toFixed(3)+'%';
      return <div key={t.id} className={t.className+(t.detected?' is-detected':'')}
        style={{left,top}} data-radar-slot={t.slot}>
        <img alt={t.alt} src={t.swap&&t.alternate?t.alternate:t.src} loading="lazy" />
      </div>;
    })}
  </div>;
}
