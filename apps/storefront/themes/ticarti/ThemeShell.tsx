'use client';
import ThemeHead from './layout/ThemeHead';
import Header from './layout/Header';
import Footer from './layout/Footer';
export default function ThemeShell({boot,design,children}:{boot:any;design:any;children:React.ReactNode}){
 const effectiveBoot={...boot,design};
 const customCss=String(design?.general?.customCss||'');
 return <ThemeHead design={design}>
   {customCss&&<style>{customCss}</style>}
   <Header boot={effectiveBoot}/>
   <main id="MainContent" className="content-for-layout focus-none" role="main" tabIndex={-1}>{children}</main>
   <Footer boot={effectiveBoot}/>
 </ThemeHead>;
}
