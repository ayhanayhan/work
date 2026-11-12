'use client';
import {sfText} from '../lib/i18n';
import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import CookieBanner from './CookieBanner';
import MaintenanceCountdown from './MaintenanceCountdown';
import LiveTrackerBeacon from './LiveTrackerBeacon';
import DesignPreviewBridge from './DesignPreviewBridge';
import TrackingScripts from './TrackingScripts';
import {StorefrontThemeProvider} from './StorefrontThemeContext';
import {getThemeShell} from '../themes/registry';
import {api,getCurrency,getLocale,STORE} from '../lib/api';
import LiquidThemeRuntime from './LiquidThemeRuntime';

function clone<T>(value:T):T{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value??null)) as T}}
function previewStateFromLocation(){
  if(typeof window==='undefined')return {isPreview:false,sourceMode:'',design:null,sections:null as any[]|null,runtime:null};
  const params=new URLSearchParams(window.location.search);
  if(params.get('ticarti_design')!=='1')return {isPreview:false,sourceMode:'',design:null,sections:null as any[]|null,runtime:null};
  return {isPreview:true,sourceMode:String(params.get('ticarti_source')||'edit'),design:null,sections:null as any[]|null,runtime:null};
}
function normalizeDesign(raw:any){return clone(raw||{})}
function localizeNode(value:any,locale:string){
  if(Array.isArray(value))return value.map(x=>localizeNode(x,locale));
  if(!value||typeof value!=='object')return value;
  const out:any={};for(const[k,v]of Object.entries(value)){if(k==='_i18n')continue;out[k]=localizeNode(v,locale)}
  const map:any=(value as any)._i18n||{};const keys=[locale,locale.split('-')[0]].filter(Boolean);
  for(const key of keys){const patch:any=map[key];if(patch&&typeof patch==='object')for(const[k,v]of Object.entries(patch))out[k]=localizeNode(v,locale)}
  return out;
}
function sourceId(row:any){return String(row?.sourceId||row?.settings?.__sourceId||'').trim()}

export default function StorefrontGate({children,initialBoot=null,initialThemeOnServer=false}:{children:React.ReactNode;initialBoot?:any;initialThemeOnServer?:boolean}){
  const nativePathname=usePathname();
  const preview=useMemo(()=>previewStateFromLocation(),[]);
  const platformBrowser=useMemo(()=>{if(typeof window==='undefined')return false;const host=window.location.hostname.toLowerCase().replace(/\.$/,'');return ['ticarti.com','www.ticarti.com','login.ticarti.com','app.ticarti.com','academy.ticarti.com','superadmin.ticarti.com','dev.ticarti.com'].includes(host)},[]);
  const[boot,setBoot]=useState<any>(initialBoot);const[error,setError]=useState('');
  const[draftDesign,setDraftDesign]=useState<any>(()=>preview.design);
  const[draftSections,setDraftSections]=useState<any[]|null>(()=>preview.sections);
  const[draftMenus,setDraftMenus]=useState<any[]|null>(null);
  const[draftRuntime,setDraftRuntime]=useState<any>(()=>preview.runtime);

  useEffect(()=>{if(!preview.isPreview||typeof document==='undefined'||!boot)return;document.body.classList.remove('ticarti-design-preview-loading')},[preview.isPreview,boot]);
  useEffect(()=>{
    if(platformBrowser)return;
    let live=true;
    const load=()=>api(`/storefront/${STORE}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`).then(x=>{if(live){setBoot(x);setError('');if(!preview.isPreview){setDraftDesign(null);setDraftSections(null);setDraftMenus(null);setDraftRuntime(null)}}}).catch(e=>{if(live)setError(e?.message||'Store unavailable')});
    // Resolve the boot payload with the actual URL locale on every first client mount.
    // Server pre-rendered payload may have used the shop default language.
    void load();const refresh=()=>void load();window.addEventListener('currency-change',refresh);window.addEventListener('locale-change',refresh);
    return()=>{live=false;window.removeEventListener('currency-change',refresh);window.removeEventListener('locale-change',refresh)};
  },[preview.isPreview,platformBrowser,initialBoot]);

  useEffect(()=>{
    const runtime=window as any;const cached=runtime.__TICARTI_DESIGN_DRAFTS__||{};
    if(preview.sourceMode==='demo')runtime.__TICARTI_DESIGN_DRAFTS__={};
    else{
      if(cached.design?.design)setDraftDesign(cached.design.design);
      if(Array.isArray(cached.sections?.sections))setDraftSections(cached.sections.sections);
      if(Array.isArray(cached.menus?.menus))setDraftMenus(cached.menus.menus);
      if(cached.runtime?.runtime)setDraftRuntime(cached.runtime.runtime);
    }
    const h=(event:any)=>{
      const d=event?.detail;
      if(d?.kind==='design'&&d.design)setDraftDesign(normalizeDesign(d.design));
      if(d?.kind==='sections'&&Array.isArray(d.sections))setDraftSections(d.sections);
      if(d?.kind==='section'&&d.section)setDraftSections(current=>{const base=current||(Array.isArray(boot?.sections)?boot.sections:[]);const sid=sourceId(d.section)||String(d.section?.id||'');let hit=false;const next=base.map((x:any)=>{const xid=sourceId(x)||String(x?.id||'');if(sid&&xid===sid){hit=true;return {...x,...d.section,settings:{...(x.settings||{}),...(d.section.settings||{}),...(sid?{__sourceId:sid}:{})}}}return x});return hit?next:[...next,d.section]});
      if(d?.kind==='menus'&&Array.isArray(d.menus))setDraftMenus(d.menus);
      if(d?.kind==='runtime'&&d.runtime)setDraftRuntime(clone(d.runtime));
    };
    window.addEventListener('ticarti-design-draft',h as EventListener);
    return()=>window.removeEventListener('ticarti-design-draft',h as EventListener);
  },[boot?.sections,preview.sourceMode]);

  // TICARTI_NATIVE_CHECKOUT_ROUTE: Shopify theme must not swallow the native checkout page.
  // TICARTI_CUSTOMER_NATIVE_ROUTES: keep customer pages outside Liquid 404 renderer.
  if(nativePathname==='/checkout'||nativePathname==='/orders'||nativePathname==='/account'||nativePathname.startsWith('/account/')||nativePathname==='/forgot-password'||nativePathname==='/reset-password')return <StorefrontThemeProvider value={{boot:boot||{store:{locale:getLocale(),settings:{}}},design:boot?.design||{},sections:boot?.sections||[],menus:boot?.menus||[],runtime:boot?.themeRuntime||{},isDesignPreview:preview.isPreview,sourceMode:preview.sourceMode,debug:{renderMode:'native-customer-route'}}}>{children}</StorefrontThemeProvider>;
  if(platformBrowser)return <>{children}</>;
  if(error)return <main style={{padding:24}}>{error}</main>;
  if(!boot)return <main aria-busy="true" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#fff'}}></main>;
  if(boot.store?.maintenanceMode)return <MaintenanceCountdown store={boot.store}/>;
  const sourceEngine=String(boot?.theme?.config?.engine||boot?.theme?.config?.manifest?.engine||'');
  if(sourceEngine==='ticarti-liquid-source')return <StorefrontThemeProvider value={{boot,design:boot.design||{},sections:boot.sections||[],menus:boot.menus||[],runtime:boot.themeRuntime||{},isDesignPreview:preview.isPreview,sourceMode:preview.sourceMode,debug:{renderMode:'liquid-source'}}}><LiveTrackerBeacon/><DesignPreviewBridge/><TrackingScripts settings={boot.store?.settings||{}} store={boot.store}/><LiquidThemeRuntime boot={boot} initialThemeOnServer={initialThemeOnServer} isPreview={preview.isPreview}/><CookieBanner/></StorefrontThemeProvider>;

  const design=localizeNode(normalizeDesign(draftDesign||boot.design||{}),getLocale());
  const savedSections=Array.isArray(boot.sections)?boot.sections:[];
  const sections=localizeNode(draftSections||savedSections,getLocale());
  const menus=draftMenus||(Array.isArray(boot.menus)?boot.menus:[]);
  const themeRuntime=localizeNode(draftRuntime||boot.themeRuntime||{},getLocale());
  const activeTheme=String(boot?.store?.activeTheme||'').trim();
  if(!preview.isPreview&&(!activeTheme||activeTheme==='__none__'||activeTheme==='none')){
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:32,textAlign:'center',background:'#fff',color:'#111'}}><div><h1 style={{margin:'0 0 10px',fontSize:28}}>{sfText('gate.noTheme',getLocale())}</h1><p style={{margin:0,color:'#667085'}}>{sfText('gate.noThemeHelp',getLocale())}</p></div></main>;
  }
  if(!preview.isPreview&&!sections.length){
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:32,textAlign:'center',background:'#fff',color:'#111'}}><div><h1 style={{margin:'0 0 10px',fontSize:28}}>{sfText('gate.emptyTheme',getLocale())}</h1><p style={{margin:0,color:'#667085'}}>{sfText('gate.emptyThemeHelp',getLocale())}</p></div></main>;
  }
  const effectiveBoot={...boot,design,sections,menus,themeRuntime};
  const ThemeShell=getThemeShell({boot:effectiveBoot,design});
  const contextValue={boot:effectiveBoot,design,sections,menus,runtime:themeRuntime,isDesignPreview:preview.isPreview,sourceMode:preview.sourceMode,debug:{renderMode:preview.isPreview?'preview':'live',designSource:'theme-state',sectionsSource:draftSections?'draft':'theme-state',runtimeSource:draftRuntime?'draft':'theme-state',bootSectionCount:savedSections.length,bootSections:savedSections}};
  return <StorefrontThemeProvider value={contextValue}><LiveTrackerBeacon/><DesignPreviewBridge/><TrackingScripts settings={boot.store?.settings||{}} store={boot.store}/><ThemeShell boot={effectiveBoot} design={design}>{children}</ThemeShell><CookieBanner/></StorefrontThemeProvider>;
}
