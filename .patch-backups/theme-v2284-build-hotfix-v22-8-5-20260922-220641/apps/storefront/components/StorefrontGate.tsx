'use client';
import {useEffect,useMemo,useState} from 'react';
import CookieBanner from './CookieBanner';
import MaintenanceCountdown from './MaintenanceCountdown';
import LiveTrackerBeacon from './LiveTrackerBeacon';
import DesignPreviewBridge from './DesignPreviewBridge';
import TrackingScripts from './TrackingScripts';
import {StorefrontThemeProvider} from './StorefrontThemeContext';
import {getThemeShell} from '../themes/registry';
import {getTicartiSkin,mergeSkinDesign,resolveTicartiSkin} from '../themes/ticarti/config/skin-registry';
import {sourceHomePreset} from '../themes/ticarti/config/home-preset';
import {api,getCurrency,getLocale,STORE} from '../lib/api';

function clone<T>(value:T):T{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value??null)) as T}}
function withBundleMarker(design:any,skinSlug:string){const next=clone(design||{});next.general={...(next.general||{}),skinSlug,skin:skinSlug,themeBundleSkinSlug:skinSlug,themeBundleVersion:'v22.8.4'};return next}
function previewStateFromLocation(){
 if(typeof window==='undefined')return {isPreview:false,sourceMode:'',design:null,sections:null as any[]|null,skinSlug:''};
 const params=new URLSearchParams(window.location.search);
 if(params.get('ticarti_design')!=='1')return {isPreview:false,sourceMode:'',design:null,sections:null as any[]|null,skinSlug:''};
 const sourceMode=String(params.get('ticarti_source')||'edit');
 const slug=String(params.get('ticarti_skin')||'').trim();
 if(sourceMode!=='demo'||!slug)return {isPreview:true,sourceMode,design:null,sections:null as any[]|null,skinSlug:slug};
 const skin=getTicartiSkin(slug);
 const design=skin?.design?withBundleMarker(skin.design,skin.slug):null;
 return {isPreview:true,sourceMode,design,sections:design?sourceHomePreset(design):null,skinSlug:slug};
}
function normalizeDesign(raw:any){
 const skin=resolveTicartiSkin(raw||{});
 const source=withBundleMarker(skin?.design||{},skin.slug);
 const marker=String(raw?.general?.themeBundleSkinSlug||'');
 const candidate=marker===skin.slug?raw:{};
 const merged=mergeSkinDesign(candidate,skin);
 const themeName=String(raw?.general?.themeName||merged?.general?.themeName||source?.general?.themeName||'Ticarti');
 return {
   ...source,...merged,
   general:{...(source.general||{}),...(merged.general||{}),themeName,skinSlug:skin.slug,skin:skin.slug,themeBundleSkinSlug:skin.slug,themeBundleVersion:'v22.8.4'},
   header:{...(source.header||{}),...(merged.header||{})},
   footer:{...(source.footer||{}),...(merged.footer||{})},
   products:{...(source.products||{}),...(merged.products||{})},
   themeSettings:{
     ...(source.themeSettings||{}),...(merged.themeSettings||{}),
     general:{...(source.themeSettings?.general||{}),...(merged.themeSettings?.general||{})},
     header:{...(source.themeSettings?.header||{}),...(merged.themeSettings?.header||{})},
     footer:{...(source.themeSettings?.footer||{}),...(merged.themeSettings?.footer||{})},
     products:{...(source.themeSettings?.products||{}),...(merged.themeSettings?.products||{})},
   },
 };
}
function sourceId(row:any){return String(row?.sourceId||row?.settings?.__sourceId||'').trim()}

export default function StorefrontGate({children}:{children:React.ReactNode}){
 const preview=useMemo(()=>previewStateFromLocation(),[]);
 const[boot,setBoot]=useState<any>(null);const[error,setError]=useState('');
 const[draftDesign,setDraftDesign]=useState<any>(()=>preview.design);
 const[draftSections,setDraftSections]=useState<any[]|null>(()=>preview.sections);
 const[draftMenus,setDraftMenus]=useState<any[]|null>(null);

 useEffect(()=>{let live=true;const load=()=>api(`/storefront/${STORE}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`).then(x=>{if(live){setBoot(x);setError('');if(!preview.isPreview){setDraftDesign(null);setDraftSections(null);setDraftMenus(null)}}}).catch(e=>{if(live)setError(e?.message||'Store unavailable')});void load();const refresh=()=>void load();window.addEventListener('currency-change',refresh);window.addEventListener('locale-change',refresh);return()=>{live=false;window.removeEventListener('currency-change',refresh);window.removeEventListener('locale-change',refresh)}},[preview.isPreview]);

 useEffect(()=>{const runtime=window as any;const cached=runtime.__TICARTI_DESIGN_DRAFTS__||{};
  if(cached.design?.design)setDraftDesign(cached.design.design);
  if(Array.isArray(cached.sections?.sections))setDraftSections(cached.sections.sections);
  if(Array.isArray(cached.menus?.menus))setDraftMenus(cached.menus.menus);
  const h=(event:any)=>{const d=event?.detail;if(d?.kind==='design'&&d.design)setDraftDesign(d.design);if(d?.kind==='sections'&&Array.isArray(d.sections))setDraftSections(d.sections);if(d?.kind==='section'&&d.section)setDraftSections(current=>{const raw=draftDesign||boot?.design||{};const normalized=normalizeDesign(raw);const base=current||sourceHomePreset(normalized);const sid=sourceId(d.section)||String(d.section?.id||'');let hit=false;const next=base.map((x:any)=>{const xid=sourceId(x)||String(x?.id||'');if(sid&&xid===sid){hit=true;return {...x,...d.section,settings:{...(x.settings||{}),...(d.section.settings||{}),...(sid?{__sourceId:sid}:{})}}}return x});return hit?next:[...next,d.section]});if(d?.kind==='menus'&&Array.isArray(d.menus))setDraftMenus(d.menus)};
  window.addEventListener('ticarti-design-draft',h as EventListener);return()=>window.removeEventListener('ticarti-design-draft',h as EventListener)
 },[boot?.design,draftDesign,preview.sourceMode]);

 if(error)return <main style={{padding:24}}>{error}</main>;if(!boot)return <main style={{padding:24}}>Loading…</main>;if(boot.store?.maintenanceMode)return <MaintenanceCountdown store={boot.store}/>;
 const rawDesign=draftDesign||boot.design||{};
 const design=normalizeDesign(rawDesign);
 const skin=resolveTicartiSkin(design);
 const sourceSections=sourceHomePreset(design);
 const savedSections=Array.isArray(boot.sections)?boot.sections:[];
 const sectionMarker=String(rawDesign?.general?.themeBundleSectionsSkinSlug||'');
 const currentSourceIds=new Set(sourceSections.map(sourceId).filter(Boolean));
 const savedSourceMatchCount=savedSections.reduce((count:number,row:any)=>count+(currentSourceIds.has(sourceId(row))?1:0),0);
 const savedLooksLikeCurrentBundle=sectionMarker===skin.slug&&savedSourceMatchCount>0;
 let sectionsSource='source-fallback';
 let sections:any[];
 if(draftSections){sections=draftSections;sectionsSource=preview.sourceMode==='demo'?'draft-demo':'draft-message'}
 else if(preview.sourceMode==='demo'){sections=sourceSections;sectionsSource='source-demo'}
 else if(savedLooksLikeCurrentBundle){sections=savedSections;sectionsSource='store-bundle'}
 else {sections=sourceSections;sectionsSource=sectionMarker===skin.slug?'source-fallback-invalid-store-bundle':'source-fallback-stale-store'}
 if(!Array.isArray(sections)||!sections.length){sections=sourceSections;sectionsSource='source-fallback-empty'}
 const menus=draftMenus||(Array.isArray(boot.menus)?boot.menus:[]);
 const effectiveBoot={...boot,design,sections,menus};
 const ThemeShell=getThemeShell({boot:effectiveBoot,design});
 const rawMarker=String(rawDesign?.general?.themeBundleSkinSlug||'');
 const contextValue={boot:effectiveBoot,design,sections,menus,isDesignPreview:preview.isPreview,sourceMode:preview.sourceMode,debug:{renderMode:(preview.sourceMode==='demo'||sectionsSource.startsWith('source-'))?'source-bundle':'store-bundle',designSource:preview.sourceMode==='demo'?'source-demo':rawMarker===skin.slug?'store-bundle':'source-fallback-stale-design',sectionsSource,bootSectionCount:savedSections.length,savedSourceMatchCount,bootSections:savedSections,expectedFirstSource:sourceId(sourceSections[0]),expectedFirstTitle:String(sourceSections[0]?.settings?.main_heading||sourceSections[0]?.settings?.title||'')}};
 return <StorefrontThemeProvider value={contextValue}><LiveTrackerBeacon/><DesignPreviewBridge/><TrackingScripts settings={boot.store?.settings||{}} store={boot.store}/><ThemeShell boot={effectiveBoot} design={design}>{children}</ThemeShell>{boot.features?.aiAssistant&&<a className="store-ai-launcher" href="/account?ai=1" aria-label="AI"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l1.45 4.05L17.5 8l-4.05 1.45L12 13.5l-1.45-4.05L6.5 8l4.05-1.45L12 2.5Z"/></svg></a>}<CookieBanner/></StorefrontThemeProvider>;
}
