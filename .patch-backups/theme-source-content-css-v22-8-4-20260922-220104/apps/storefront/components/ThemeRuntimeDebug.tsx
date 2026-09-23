'use client';
import {useStorefrontTheme} from './StorefrontThemeContext';

function sectionRow(x:any){return {id:String(x?.id||''),sourceId:String(x?.sourceId||x?.settings?.__sourceId||''),type:String(x?.sectionType||''),title:String(x?.settings?.main_heading||x?.settings?.title||'')}}

export default function ThemeRuntimeDebug(){
  const state=useStorefrontTheme();
  const debug=state.debug||{};
  const payload={
    build:'v22.8.1',
    preview:{enabled:state.isDesignPreview,sourceMode:state.sourceMode},
    store:{activeTheme:state.boot?.store?.activeTheme,name:state.boot?.store?.name},
    theme:{apiThemeSlug:state.boot?.theme?.slug,skin:state.design?.general?.skinSlug||state.design?.general?.skin,bundleSkin:state.design?.general?.themeBundleSkinSlug,sectionsSkin:state.design?.general?.themeBundleSectionsSkinSlug,designSource:debug.designSource,sectionsSource:debug.sectionsSource},
    header:{sourceId:state.design?.header?.sourceId,layout:state.design?.header?.layout,logoText:state.design?.header?.logoText},
    footer:{sourceId:state.design?.footer?.sourceId,layout:state.design?.footer?.layoutClass,newsletterSourceId:state.design?.footer?.newsletterSourceId},
    typography:{body:state.design?.themeSettings?.general?.google_font_name_body||state.design?.general?.bodyFont,heading:state.design?.themeSettings?.general?.google_font_name_heading||state.design?.general?.headingFont,pageWidth:state.design?.themeSettings?.general?.page_width||state.design?.general?.containerWidth},
    counts:{apiSections:debug.bootSectionCount,effectiveSections:state.sections?.length||0},
    apiFirstSections:(debug.bootSections||[]).slice(0,6).map(sectionRow),
    effectiveFirstSections:(state.sections||[]).slice(0,6).map(sectionRow),
    expectedFirstSource:debug.expectedFirstSource||'',
    expectedFirstTitle:debug.expectedFirstTitle||'',
  };
  return <section id="ticarti-theme-runtime-debug" style={{background:'#111',color:'#d7ffd9',font:'12px/1.45 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',padding:'18px 20px',whiteSpace:'normal',overflow:'auto',borderTop:'3px solid #52e070'}} data-build="v22.8.1">
    <div style={{fontWeight:800,fontSize:14,marginBottom:8,color:'#fff'}}>TICARTI THEME DEBUG · v22.8.1</div>
    <pre style={{margin:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere',color:'inherit'}}>{JSON.stringify(payload,null,2)}</pre>
  </section>;
}
