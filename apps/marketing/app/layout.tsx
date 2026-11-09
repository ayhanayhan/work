import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const metadata:Metadata={title:'Ticarti | Ticaretin yeni hali',description:'Ticarti ile e-ticaret siteni oluştur, tek yerden yönet.'};
async function htmlAttrs(){
  const uri=(await headers()).get('x-marketing-page')||'/';
  const pathPart=uri.replace(/^\/+|\/+$/g,'');
  const part=pathPart.replace(/^(?:tr|en|de|ru|ar|bg|uk|id|vi)(?:\/|$)/,'');
  const safe=/^[a-zA-Z0-9_./-]*$/.test(part)&&!part.includes('..')?part:'';
  const fixed=safe==='en/blog'||safe==='en/blog/index.html'||safe==='blog'||safe==='blog/index.html'?'en/blog/index.html':
    safe.startsWith('en/blog/')||safe.startsWith('blog/')?'en/blog/post.html':
    safe.endsWith('.html')?safe:(safe===''||safe==='en'?'en/index.html':safe==='success-stories'?'success-stories/index.html':['paketler','contacto','login','register','kvkk','gizlilik-politikasi','uyelik-sozlesmesi','companies/enterprise','success-stories/crowdy'].includes(safe)?safe+'.html':safe+'/index.html');
  const file=fixed.startsWith('en/')?fixed:'en/'+fixed;
  try{
    const html=await readFile(path.join(process.cwd(),'templates',file),'utf8');
    return html.match(/<html\b[^>]*class="([^"]*)"/i)?.[1]||'';
  }catch{return 'tc-page-home'}
}
export default async function RootLayout({children}:{children:ReactNode}) {
  const route=(await headers()).get('x-marketing-page')||'/';
  const parts=route.split('/').filter(Boolean);
  const snapshotHome=parts.length===0||(parts.length===1&&['tr','en','de','ru','ar'].includes(parts[0]));
  const homeAlias=parts.length===1&&parts[0]==='index.html'||parts.length===2&&['tr','en','de','ru','ar'].includes(parts[0])&&parts[1]==='index.html';
  // Tools share the approved Blog archive/article template classes, not the
  // homepage fallback used when a legacy static HTML template is absent.
  const contentParts=parts[0]&&['tr','en','de','ru','ar','bg','uk','id','vi'].includes(parts[0])?parts.slice(1):parts;
  const toolsPage=contentParts[0]==='araclar';
  const cls=toolsPage?
   (contentParts.length>1?
    'tc-page-crowdy tc-vendor-aos tc-vendor-theme tc-page-stories tc-marketing-blog':
    'tc-page-stories tc-vendor-aos tc-vendor-theme tc-vendor-casos-hero tc-vendor-casos-highlight tc-marketing-blog'):
   snapshotHome||homeAlias?'tc-page-home':await htmlAttrs();
  const lang=route.match(/^\/(tr|en|de|ru|ar|bg|uk|id|vi)(?:\/|$)/)?.[1]||'tr';
  return <html lang={lang} dir={lang==='ar'?'rtl':'ltr'} className={cls}><head>
    <link rel="stylesheet" href="/assets/css/style.css?v=v2-pricing-payment-footer-1104"/>
    <link rel="stylesheet" href="/assets/css/shared-footer.css?v=2"/>
    <link rel="stylesheet" href="/assets/css/marketing-blog.css?v=6"/>
    <link rel="stylesheet" href="/assets/css/marketing-tools.css?v=2"/>
    <link rel="stylesheet" href="/assets/css/marketing-404.css?v=3"/>
    <link rel="stylesheet" href="/assets/css/marketing-contact.css?v=3"/>
    <link rel="stylesheet" href="/assets/css/marketing-help.css?v=1"/>
    <link rel="stylesheet" href="/assets/css/navigation-tree.css?v=1"/>
    {snapshotHome||homeAlias?<link rel="stylesheet" href="/assets/css/home-react-behavior.css?v=3"/>:null}
    {snapshotHome||homeAlias?<link rel="stylesheet" href="/assets/css/home-react-effects.css?v=1"/>:null}
  </head><body>{children}</body></html>;
}
