'use client';
import {useEffect,useMemo,useState} from 'react';

type Props={pageKey:'home'|'login'|'register';data:any;req:(path:string,init?:any)=>Promise<any>;reload:()=>Promise<any>};

const PAGE_LABELS={home:'Ana Sayfa',login:'Login',register:'Register'} as const;
const PAGE_HINTS={
  home:'Hero, duyuru, özellikler, entegrasyonlar, referanslar, blog, SSS ve CTA içeriklerini yönetin.',
  login:'Giriş ekranındaki başlık, açıklama, sosyal giriş ve yardımcı metinleri yönetin.',
  register:'Kayıt akışındaki hesap, paket, sektör, mağaza, alan adı, özet ve ödeme adımlarının metinlerini yönetin.'
} as const;
const BLOCK_TYPES={
  home:['announcement','hero','orders','features','integrations','successStories','blog','faq','footerCta'],
  login:['intro','socialAuth','credentials','support'],
  register:['account','package','sector','store','domain','summary','payment']
} as const;

function blankTranslations(locales:any[]){const out:any={};for(const l of locales)out[String(l.locale)]={title:'',eyebrow:'',description:'',primaryCtaLabel:'',secondaryCtaLabel:'',note:''};return out}
function clone<T>(v:T):T{return JSON.parse(JSON.stringify(v??{}))}

export default function MarketingContentControl({pageKey,data,req,reload}:Props){
  const locales=useMemo(()=>Array.isArray(data?.locales)?data.locales:[],[data]);
  const incoming=data?.marketing?.[pageKey]||{};
  const [form,setForm]=useState<any>({seo:{},blocks:[]});
  const [activeLocale,setActiveLocale]=useState('');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [err,setErr]=useState('');

  useEffect(()=>{setForm(clone({seo:incoming.seo||{},blocks:Array.isArray(incoming.blocks)?incoming.blocks:[]}))},[data,pageKey]);
  useEffect(()=>{const first=String(locales.find((x:any)=>x.isDefault)?.locale||locales[0]?.locale||'tr');if(!activeLocale||!locales.some((x:any)=>String(x.locale)===activeLocale))setActiveLocale(first)},[locales,activeLocale]);

  function addBlock(){const type=(BLOCK_TYPES as any)[pageKey][0];setForm((x:any)=>({...x,blocks:[...(x.blocks||[]),{id:`${pageKey}-${type}-${Date.now()}`,type,enabled:true,sortOrder:(x.blocks||[]).length,translations:blankTranslations(locales),settings:{}}]}))}
  function patchBlock(index:number,patch:any){setForm((x:any)=>({...x,blocks:x.blocks.map((b:any,i:number)=>i===index?{...b,...patch}:b)}))}
  function patchTranslation(index:number,key:string,value:string){setForm((x:any)=>{const blocks=[...x.blocks];const block={...blocks[index]};const translations={...(block.translations||{})};translations[activeLocale]={...(translations[activeLocale]||{}),[key]:value};block.translations=translations;blocks[index]=block;return {...x,blocks}})}
  function patchSeo(key:string,value:string){setForm((x:any)=>({...x,seo:{...(x.seo||{}),[activeLocale]:{...(x.seo?.[activeLocale]||{}),[key]:value}}}))}
  async function save(){setBusy(true);setErr('');setMsg('');try{const marketing={...(data?.marketing||{}),[pageKey]:form};await req('/superadmin/platform-content',{method:'PATCH',body:JSON.stringify({marketing})});setMsg('İçerik kaydedildi.');await reload()}catch(e:any){setErr(e?.message||'İçerik kaydedilemedi.')}finally{setBusy(false)}}

  const sorted=[...(form.blocks||[])].map((b:any,i:number)=>({...b,__index:i})).sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0));
  return <div>
    <div className="panel sa-page-head"><div><h2>{PAGE_LABELS[pageKey]}</h2><p className="muted">{PAGE_HINTS[pageKey]}</p></div><button className="btn" onClick={addBlock}>Bölüm ekle</button></div>
    <div className="panel"><div className="toolbar"><div><h3>Dil</h3><p className="muted">Diller Genel Ayarlar bölümündeki aktif platform dillerinden gelir.</p></div></div><div className="sa-language-tabs">{locales.map((l:any)=><button type="button" key={l.locale} className={activeLocale===String(l.locale)?'active':''} onClick={()=>setActiveLocale(String(l.locale))}>{l.label||l.locale}{l.isDefault?' · varsayılan':''}</button>)}</div></div>
    <div className="panel"><h3>SEO</h3><div className="form-grid"><label>SEO başlığı<input value={form.seo?.[activeLocale]?.title||''} onChange={e=>patchSeo('title',e.target.value)}/></label><label>Canonical / slug<input value={form.seo?.[activeLocale]?.slug||''} onChange={e=>patchSeo('slug',e.target.value)}/></label><label className="full">Meta açıklama<textarea rows={3} value={form.seo?.[activeLocale]?.description||''} onChange={e=>patchSeo('description',e.target.value)}/></label></div></div>
    {sorted.map((block:any)=>{const i=block.__index;const tr=block.translations?.[activeLocale]||{};return <div className="panel" key={block.id||i}><div className="toolbar"><div><h3>{block.type||'Bölüm'}</h3><p className="muted">Frontend bölüm kimliği: {block.id||'-'}</p></div><div className="d-flex gap-2"><label className="feature-check"><input type="checkbox" checked={block.enabled!==false} onChange={e=>patchBlock(i,{enabled:e.target.checked})}/> Aktif</label><button className="btn danger" onClick={()=>setForm((x:any)=>({...x,blocks:x.blocks.filter((_:any,j:number)=>j!==i)}))}>Sil</button></div></div><div className="form-grid"><label>Bölüm tipi<select value={block.type||''} onChange={e=>patchBlock(i,{type:e.target.value})}>{((BLOCK_TYPES as any)[pageKey]||[]).map((t:string)=><option key={t} value={t}>{t}</option>)}</select></label><label>Sıra<input type="number" value={block.sortOrder??i} onChange={e=>patchBlock(i,{sortOrder:Number(e.target.value||0)})}/></label><label>Üst başlık<input value={tr.eyebrow||''} onChange={e=>patchTranslation(i,'eyebrow',e.target.value)}/></label><label>Başlık<input value={tr.title||''} onChange={e=>patchTranslation(i,'title',e.target.value)}/></label><label className="full">Açıklama<textarea rows={3} value={tr.description||''} onChange={e=>patchTranslation(i,'description',e.target.value)}/></label><label>Birincil buton<input value={tr.primaryCtaLabel||''} onChange={e=>patchTranslation(i,'primaryCtaLabel',e.target.value)}/></label><label>İkincil buton<input value={tr.secondaryCtaLabel||''} onChange={e=>patchTranslation(i,'secondaryCtaLabel',e.target.value)}/></label><label className="full">Not / yardımcı metin<textarea rows={2} value={tr.note||''} onChange={e=>patchTranslation(i,'note',e.target.value)}/></label><label className="full">Bölüm ayarları (JSON)<textarea rows={5} value={JSON.stringify(block.settings||{},null,2)} onChange={e=>{try{patchBlock(i,{settings:JSON.parse(e.target.value||'{}')});setErr('')}catch{setErr('Bölüm ayarları geçerli JSON olmalı.')}}}/></label></div></div>})}
    {msg&&<div className="success">{msg}</div>}{err&&<div className="error">{err}</div>}<div className="panel sa-save-row"><button className="btn" disabled={busy||!!err} onClick={()=>void save()}>{busy?'Kaydediliyor…':'Kaydet'}</button></div>
  </div>
}
