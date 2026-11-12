'use client';
import {useEffect,useMemo,useState} from 'react';

export default function ThemeRuntime({theme,children}:{theme:any;children:React.ReactNode}){
  const[draft,setDraft]=useState<any>(null);
  useEffect(()=>{const h=(event:any)=>{const d=event?.detail;if(d?.kind==='theme'&&d.theme)setDraft(d.theme)};window.addEventListener('ticarti-design-draft',h as EventListener);return()=>window.removeEventListener('ticarti-design-draft',h as EventListener)},[]);
  const active=draft||theme||{};const style=active?.config?.style||{};
  const vars=useMemo(()=>({
    '--theme-accent':style.accent||'#304ffe',
    '--theme-radius':`${Number(style.radius??12)}px`,
    '--theme-container':`${Number(style.containerWidth||1320)}px`,
  } as React.CSSProperties),[style.accent,style.radius,style.containerWidth]);
  return <div className="ticarti-theme-runtime" data-theme={active?.slug||'nova-commerce'} data-theme-card={style.cardStyle||'soft'} data-theme-header={style.headerPreset||'classic'} style={vars}>{children}</div>;
}
