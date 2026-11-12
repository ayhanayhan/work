'use client';

import {useEffect,useMemo} from 'react';
import {googleFontFamilies,resolveTicartiThemeSettings,ticartiCssVariables} from '../config/theme-settings';

function safeCssValue(value:any){const out=String(value??'');if(!out||/[\n\r]/.test(out)||out.includes(':-webkit-scrollbar')||out.includes('not([src*=')||out==="url('data:image/svg+xml")return '';return out.replace(/<\/style/gi,'<\\/style')}
function safeThemeCss(value:any){
 const css=String(value||'');
 if(!css)return '';
 if(css.length>1500000)return '';
 if(/<\/style/i.test(css)||/@import\b/i.test(css)||/javascript\s*:/i.test(css)||/expression\s*\(/i.test(css))return '';
 return css;
}
export default function ThemeHead({design,children}:{design:any;children:React.ReactNode}){
 const effectiveDesign=design||{};
 const settings=useMemo(()=>resolveTicartiThemeSettings(effectiveDesign),[effectiveDesign]);
 const vars=useMemo(()=>{const raw:any={...ticartiCssVariables(settings)};for(const key of Object.keys(raw)){const value=safeCssValue(raw[key]);if(!key.startsWith('--')||!value)delete raw[key];else raw[key]=value}return raw as Record<string,string>},[settings]);
 const cssVarsText=useMemo(()=>{const declarations=Object.entries(vars).map(([k,v])=>`${k}:${v}`).join(';');return `:root,body,.ticarti-theme{${declarations}}`},[vars]);
 const themeCss=useMemo(()=>{const styles=effectiveDesign?.themeStyles&&typeof effectiveDesign.themeStyles==='object'?effectiveDesign.themeStyles:{};return Object.keys(styles).sort().map(k=>safeThemeCss(styles[k])).filter(Boolean).join('\n')},[effectiveDesign?.themeStyles]);
 useEffect(()=>{const id='ticarti-theme-runtime-vars';let style=document.getElementById(id) as HTMLStyleElement|null;if(!style){style=document.createElement('style');style.id=id;document.head.appendChild(style)}style.textContent=cssVarsText;document.body.dataset.ticartiTheme='native';return()=>{if(style?.parentNode)style.parentNode.removeChild(style);delete document.body.dataset.ticartiTheme}},[cssVarsText]);
 useEffect(()=>{const families=googleFontFamilies(settings);const id='ticarti-theme-google-fonts';const old=document.getElementById(id) as HTMLLinkElement|null;if(!families.length){old?.remove();return}const href='https://fonts.googleapis.com/css2?'+families.map(x=>`family=${encodeURIComponent(x).replace(/%20/g,'+')}:wght@300;400;500;600;700;800;900`).join('&')+'&display=swap';const el=old||document.createElement('link');el.id=id;el.rel='stylesheet';el.href=href;if(!old)document.head.appendChild(el)},[settings]);
 return <div className="ticarti-theme" data-theme-id={String(effectiveDesign?.general?.packageSlug||'ticarti-native')} data-theme-name={String((settings as any).themeName||'Ticarti')}>
{themeCss&&<style data-theme-package-css dangerouslySetInnerHTML={{__html:themeCss}}/>}
   {children}
 </div>;
}
