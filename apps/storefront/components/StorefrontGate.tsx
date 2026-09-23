'use client';
import {useEffect,useMemo,useState} from 'react';
import CookieBanner from './CookieBanner';
import MaintenanceCountdown from './MaintenanceCountdown';
import LiveTrackerBeacon from './LiveTrackerBeacon';
import DesignPreviewBridge from './DesignPreviewBridge';
import TrackingScripts from './TrackingScripts';
import {StorefrontThemeProvider} from './StorefrontThemeContext';
import {getThemeShell} from '../themes/registry';
import {api,getCurrency,getLocale,STORE} from '../lib/api';

function clone<T>(value:T):T{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value??null)) as T}}
function previewStateFromLocation(){
 if(typeof window==='undefined')return {isPreview:false,sourceMode:'',design:null,sections:null as any[]|null,skinSlug:''};
 const params=new URLSearchParams(window.location.search);
 if(params.get('ticarti_design')!=='1')return {isPreview:false,sourceMode:'',design:null,sections:null as any[]|null,skinSlug:''};
 return {isPreview:true,sourceMode:String(params.get('ticarti_source')||'edit'),design:null,sections:null as any[]|null,skinSlug:String(params.get('ticarti_skin')||'').trim()};
}
function normalizeDesign(raw:any){
 const candidate=clone(raw||{});const slug=String(candidate?.general?.skinSlug||candidate?.general?.skin||'').trim();
 candidate.general={...(candidate.general||{}),...(slug?{skinSlug:slug,skin:slug,themeBundleSkinSlug:slug}:{})};return candidate;
}
function localizeNode(value:any,locale:string){if(Array.isArray(value))return value.map(x=>localizeNode(x,locale));if(!value||typeof value!=='object')return value;const out:any={};for(const[k,v]of Object.entries(value)){if(k==='_i18n')continue;out[k]=localizeNode(v,locale)}const map:any=(value as any)._i18n||{};const keys=[locale,locale.split('-')[0]].filter(Boolean);for(const key of keys){const patch:any=map[key];if(patch&&typeof patch==='object')for(const[k,v]of Object.entries(patch))out[k]=localizeNode(v,locale)}return out}

function sourceId(row:any){return String(row?.sourceId||row?.settings?.__sourceId||'').trim()}

export default function StorefrontGate({children}:{children:React.ReactNode}){
 const preview=useMemo(()=>previewStateFromLocation(),[]);
 const platformBrowser=useMemo(()=>{if(typeof window==='undefined')return false;const host=window.location.hostname.toLowerCase().replace(/\.$/,'');return ['ticarti.com','www.ticarti.com','login.ticarti.com','app.ticarti.com','academy.ticarti.com','superadmin.ticarti.com','dev.ticarti.com'].includes(host)},[]);
 const[boot,setBoot]=useState<any>(null);const[error,setError]=useState('');
 const[draftDesign,setDraftDesign]=useState<any>(()=>preview.design);
 const[draftSections,setDraftSections]=useState<any[]|null>(()=>preview.sections);
 const[draftMenus,setDraftMenus]=useState<any[]|null>(null);

 useEffect(()=>{
   if(!preview.isPreview||typeof document==='undefined'||!boot)return;
   document.body.classList.remove('ticarti-design-preview-loading');
 },[preview.isPreview,boot]);

 useEffect(()=>{if(platformBrowser)return;let live=true;const load=()=>api(`/storefront/${STORE}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`).then(x=>{if(live){setBoot(x);setError('');if(!preview.isPreview){setDraftDesign(null);setDraftSections(null);setDraftMenus(null)}}}).catch(e=>{if(live)setError(e?.message||'Store unavailable')});void load();const refresh=()=>void load();window.addEventListener('currency-change',refresh);window.addEventListener('locale-change',refresh);return()=>{live=false;window.removeEventListener('currency-change',refresh);window.removeEventListener('locale-change',refresh)}},[preview.isPreview,platformBrowser]);

 useEffect(()=>{const runtime=window as any;const cached=runtime.__TICARTI_DESIGN_DRAFTS__||{};
  if(preview.sourceMode==='demo'){runtime.__TICARTI_DESIGN_DRAFTS__={};}
  else {
    if(cached.design?.design)setDraftDesign(cached.design.design);
    if(Array.isArray(cached.sections?.sections))setDraftSections(cached.sections.sections);
    if(Array.isArray(cached.menus?.menus))setDraftMenus(cached.menus.menus);
  }
  const h=(event:any)=>{const d=event?.detail;if(d?.kind==='design'&&d.design)setDraftDesign(d.design);if(d?.kind==='sections'&&Array.isArray(d.sections))setDraftSections(d.sections);if(d?.kind==='section'&&d.section)setDraftSections(current=>{const raw=draftDesign||boot?.design||{};const normalized=normalizeDesign(raw);const base=current||(Array.isArray(boot?.sections)?boot.sections:[]);const sid=sourceId(d.section)||String(d.section?.id||'');let hit=false;const next=base.map((x:any)=>{const xid=sourceId(x)||String(x?.id||'');if(sid&&xid===sid){hit=true;return {...x,...d.section,settings:{...(x.settings||{}),...(d.section.settings||{}),...(sid?{__sourceId:sid}:{})}}}return x});return hit?next:[...next,d.section]});if(d?.kind==='menus'&&Array.isArray(d.menus))setDraftMenus(d.menus)};
  window.addEventListener('ticarti-design-draft',h as EventListener);return()=>window.removeEventListener('ticarti-design-draft',h as EventListener)
 },[boot?.design,draftDesign,preview.sourceMode]);

 if(platformBrowser)return <>{children}</>;
 if(error)return <main style={{padding:24}}>{error}</main>;if(!boot)return <main style={{padding:24}}>Loading…</main>;if(boot.store?.maintenanceMode)return <MaintenanceCountdown store={boot.store}/>;
 const rawDesign=draftDesign||boot.design||{};
 const design=localizeNode(normalizeDesign(rawDesign),getLocale());
 const savedSections=Array.isArray(boot.sections)?boot.sections:[];
 let sectionsSource='store-empty';
 let sections:any[];
 if(draftSections){sections=localizeNode(draftSections,getLocale());sectionsSource=preview.sourceMode==='demo'?'draft-demo-db':'draft-message'}
 else if(savedSections.length){sections=localizeNode(savedSections,getLocale());sectionsSource='store-theme-state'}
 else {sections=[];sectionsSource='store-empty'}
 const menus=draftMenus||(Array.isArray(boot.menus)?boot.menus:[]);
 if(preview.sourceMode!=='demo'&&!sections.length){return <main className="ticarti-store-unpublished" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:32,textAlign:'center',background:'#fff',color:'#111'}}><div><h1 style={{margin:'0 0 10px',fontSize:28}}>Mağaza tasarımı henüz yayınlanmadı</h1><p style={{margin:0,color:'#667085'}}>Mağaza tasarımınızı yönetim panelinden seçip Kaydet ile yayınlayın.</p></div></main>}
 const effectiveBoot={...boot,design,sections,menus};
 const ThemeShell=getThemeShell({boot:effectiveBoot,design});
 const contextValue={boot:effectiveBoot,design,sections,menus,isDesignPreview:preview.isPreview,sourceMode:preview.sourceMode,debug:{renderMode:preview.sourceMode==='demo'?'db-source-demo':'theme-state',designSource:preview.sourceMode==='demo'?'db-theme-source':'theme-state',sectionsSource,bootSectionCount:savedSections.length,savedSourceMatchCount:0,bootSections:savedSections,expectedFirstSource:'',expectedFirstTitle:''}};
 return <StorefrontThemeProvider value={contextValue}><LiveTrackerBeacon/><DesignPreviewBridge/><TrackingScripts settings={boot.store?.settings||{}} store={boot.store}/><ThemeShell boot={effectiveBoot} design={design}>{children}</ThemeShell>{boot.features?.aiAssistant&&<a className="store-ai-launcher" href="/account?ai=1" aria-label="AI"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l1.45 4.05L17.5 8l-4.05 1.45L12 13.5l-1.45-4.05L6.5 8l4.05-1.45L12 2.5Z"/></svg></a>}<CookieBanner/></StorefrontThemeProvider>;
}
