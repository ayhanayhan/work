'use client';

import ThemeHead from './layout/ThemeHead';
import ThemeLayoutRenderer from '../runtime/ThemeLayoutRenderer';
import NativeThemeDebug from '../../components/NativeThemeDebug';

export default function ThemeShell({boot,design,children}:{boot:any;design:any;children:React.ReactNode}){
  const effectiveBoot={...boot,design};
  const customCss=String(design?.general?.customCss||'');

  return <ThemeHead design={design}>
    {customCss&&<style>{customCss}</style>}

    <ThemeLayoutRenderer type="header" boot={effectiveBoot}/>

    <main id="MainContent" className="content-for-layout focus-none" role="main" tabIndex={-1}>
      {children}
    </main>

    <ThemeLayoutRenderer type="footer" boot={effectiveBoot}/>

    <NativeThemeDebug boot={effectiveBoot} design={design}/>
  </ThemeHead>;
}
