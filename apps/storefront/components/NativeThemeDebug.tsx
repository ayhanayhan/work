'use client';
import {useSearchParams} from 'next/navigation';
export default function NativeThemeDebug({boot,design}:{boot:any;design:any}){
  const q=useSearchParams();if(q.get('theme_debug')!=='1')return null;
  const rows=(boot?.sections||[]).map((x:any)=>({id:x.sourceId||x.id,type:x.sectionType,enabled:x.enabled!==false,items:Array.isArray(x.settings?.items)?x.settings.items.length:0}));
  const payload={theme:design?.general?.themeSlug||design?.general?.themeId||boot?.theme?.slug,headerPreset:design?.header?.template||design?.header?.preset||1,footerPreset:design?.footer?.template||design?.footer?.preset||1,sections:rows,customerAuth:boot?.customerAuth||null};
  return <pre style={{position:'fixed',right:12,bottom:12,zIndex:99999,maxWidth:520,maxHeight:'55vh',overflow:'auto',background:'#111',color:'#d7ffd7',padding:14,borderRadius:8,fontSize:12}}>{JSON.stringify(payload,null,2)}</pre>
}
