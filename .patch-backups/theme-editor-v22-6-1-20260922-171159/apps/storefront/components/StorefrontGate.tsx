'use client';
import {useEffect,useState} from 'react';
import CookieBanner from './CookieBanner';
import MaintenanceCountdown from './MaintenanceCountdown';
import LiveTrackerBeacon from './LiveTrackerBeacon';
import DesignPreviewBridge from './DesignPreviewBridge';
import TrackingScripts from './TrackingScripts';
import {getThemeShell} from '../themes/registry';
import {api,getCurrency,getLocale,STORE} from '../lib/api';
export default function StorefrontGate({children}:{children:React.ReactNode}){
 const[boot,setBoot]=useState<any>(null);const[error,setError]=useState('');const[draftDesign,setDraftDesign]=useState<any>(null);
 useEffect(()=>{let live=true;const load=()=>api(`/storefront/${STORE}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`).then(x=>{if(live){setBoot(x);setError('');setDraftDesign(null)}}).catch(e=>{if(live)setError(e?.message||'Store unavailable')});void load();const refresh=()=>void load();window.addEventListener('currency-change',refresh);window.addEventListener('locale-change',refresh);return()=>{live=false;window.removeEventListener('currency-change',refresh);window.removeEventListener('locale-change',refresh)}},[]);
 useEffect(()=>{const h=(event:any)=>{const d=event?.detail;if(d?.kind==='design'&&d.design)setDraftDesign(d.design)};window.addEventListener('ticarti-design-draft',h as EventListener);return()=>window.removeEventListener('ticarti-design-draft',h as EventListener)},[]);
 if(error)return <main style={{padding:24}}>{error}</main>;if(!boot)return <main style={{padding:24}}>Loading…</main>;if(boot.store?.maintenanceMode)return <MaintenanceCountdown store={boot.store}/>;
 const design=draftDesign||boot.design||{};const ThemeShell=getThemeShell({boot,design});
 return <><LiveTrackerBeacon/><DesignPreviewBridge/><TrackingScripts settings={boot.store?.settings||{}} store={boot.store}/><ThemeShell boot={boot} design={design}>{children}</ThemeShell>{boot.features?.aiAssistant&&<a className="store-ai-launcher" href="/account?ai=1" aria-label="AI"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l1.45 4.05L17.5 8l-4.05 1.45L12 13.5l-1.45-4.05L6.5 8l4.05-1.45L12 2.5Z"/></svg></a>}<CookieBanner/></>;
}
