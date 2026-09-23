'use client';
import {useEffect,useState} from 'react';
import CookieBanner from './CookieBanner';
import MaintenanceCountdown from './MaintenanceCountdown';
import LiveTrackerBeacon from './LiveTrackerBeacon';
import DesignPreviewBridge from './DesignPreviewBridge';
import TrackingScripts from './TrackingScripts';
import {getThemeShell} from '../themes/registry';
import {getTicartiSkin} from '../themes/ticarti/config/skin-registry';
import {api,getCurrency,getLocale,STORE} from '../lib/api';
function previewDesignFromLocation(){
 if(typeof window==='undefined')return null;
 const params=new URLSearchParams(window.location.search);
 if(params.get('ticarti_design')!=='1'||params.get('ticarti_source')!=='demo')return null;
 const slug=String(params.get('ticarti_skin')||'').trim();
 if(!slug)return null;
 const skin=getTicartiSkin(slug);
 return skin?.design?JSON.parse(JSON.stringify(skin.design)):null;
}
export default function StorefrontGate({children}:{children:React.ReactNode}){
 const[boot,setBoot]=useState<any>(null);const[error,setError]=useState('');const[draftDesign,setDraftDesign]=useState<any>(()=>previewDesignFromLocation());const[draftMenus,setDraftMenus]=useState<any[]|null>(null);
 useEffect(()=>{let live=true;const load=()=>api(`/storefront/${STORE}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`).then(x=>{if(live){setBoot(x);setError('');setDraftDesign(null);setDraftMenus(null)}}).catch(e=>{if(live)setError(e?.message||'Store unavailable')});void load();const refresh=()=>void load();window.addEventListener('currency-change',refresh);window.addEventListener('locale-change',refresh);return()=>{live=false;window.removeEventListener('currency-change',refresh);window.removeEventListener('locale-change',refresh)}},[]);
 useEffect(()=>{const runtime=window as any;const cached=runtime.__TICARTI_DESIGN_DRAFTS__||{};if(cached.design?.design)setDraftDesign(cached.design.design);if(Array.isArray(cached.menus?.menus))setDraftMenus(cached.menus.menus);const h=(event:any)=>{const d=event?.detail;if(d?.kind==='design'&&d.design)setDraftDesign(d.design);if(d?.kind==='menus'&&Array.isArray(d.menus))setDraftMenus(d.menus)};window.addEventListener('ticarti-design-draft',h as EventListener);return()=>window.removeEventListener('ticarti-design-draft',h as EventListener)},[]);
 if(error)return <main style={{padding:24}}>{error}</main>;if(!boot)return <main style={{padding:24}}>Loading…</main>;if(boot.store?.maintenanceMode)return <MaintenanceCountdown store={boot.store}/>;
 const design=draftDesign||boot.design||{};const effectiveBoot=draftMenus?{...boot,menus:draftMenus}:boot;const ThemeShell=getThemeShell({boot:effectiveBoot,design});
 return <><LiveTrackerBeacon/><DesignPreviewBridge/><TrackingScripts settings={boot.store?.settings||{}} store={boot.store}/><ThemeShell boot={effectiveBoot} design={design}>{children}</ThemeShell>{boot.features?.aiAssistant&&<a className="store-ai-launcher" href="/account?ai=1" aria-label="AI"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l1.45 4.05L17.5 8l-4.05 1.45L12 13.5l-1.45-4.05L6.5 8l4.05-1.45L12 2.5Z"/></svg></a>}<CookieBanner/></>;
}
