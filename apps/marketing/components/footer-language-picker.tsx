'use client';
import {useEffect,useState} from 'react';
type Language={locale:string;label:string;isDefault:boolean};
const supported=['tr','en','de','ru','ar'];
const labels:Record<string,string>={tr:'Türkçe',en:'English',de:'Deutsch',ru:'Русский',ar:'العربية'};
export default function FooterLanguagePicker({corporateDomain=false}:{corporateDomain?:boolean}){
 const origin=corporateDomain?'https://ticarti.com':'';
 const [languages,setLanguages]=useState<Language[]>([]);
 const [path,setPath]=useState('/');
 useEffect(()=>{
  setPath(window.location.pathname);
  fetch(origin+'/api/v1/public/website/locales',{cache:'no-store'})
    .then(r=>r.ok?r.json():[])
    .then(rows=>{if(Array.isArray(rows))setLanguages(rows.filter((r:any)=>supported.includes(r.locale)).map((r:any)=>({locale:r.locale,label:r.label||labels[r.locale],isDefault:r.isDefault===true})));})
    .catch(()=>{});
 },[origin]);
 const active=languages.length?languages:supported.map(locale=>({locale,label:labels[locale],isDefault:locale==='tr'}));
 const code=path.split('/').filter(Boolean)[0];
 const current=supported.includes(code)?code:'tr';
 const remaining=supported.includes(code)?path.replace(new RegExp('^/'+code+'(?=/|$)'),'')||'/':path;
 const navigate=async(target:string)=>{
  if(target===current)return;
  let suffix=remaining;
  const post=/^\/blog\/([a-z0-9-]+)\/?$/.exec(remaining);
  if(post){
   try{
    const res=await fetch(origin+'/api/v1/public/website/blog/'+encodeURIComponent(post[1])+'?lang='+current,{cache:'no-store'});
    if(res.ok){
     const p=await res.json();
     // Never link to untranslated article content.
     if(!p.localeSlugs?.[target])suffix='/blog';
     else suffix='/blog/'+p.localeSlugs[target];
    }else suffix='/blog';
   }catch{suffix='/blog'}
  }
  const dest=(target==='tr'?'':'/'+target)+(suffix==='/'?'/':suffix);
  window.location.assign(origin+dest);
 };
 return <div className="footer-lang-wrap">
  <label className="lang-wrap tc-footer-language-picker">
   <span className="tc-visually-hidden">Dil / Language</span>
   <select aria-label="Site dili" className="lang-toggle" value={current} onChange={e=>void navigate(e.target.value)}>
    {active.map(l=><option key={l.locale} value={l.locale}>{labels[l.locale]||l.label}</option>)}
   </select>
  </label>
 </div>;
}
