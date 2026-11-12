'use client';

import {sfText} from '../../../lib/i18n';
import {useStorefrontTheme} from '../../../components/StorefrontThemeContext';
import ThemeStaticPageRenderer from '../../runtime/ThemeStaticPageRenderer';

export default function ContentPageClient({slug,page}:{slug:string;locale?:string;page?:any}){
  const state=useStorefrontTheme();
  if(!page)return <main className="content-page container"><div className="content-page-card"><h1>{sfText('deep.final2.296')}</h1><p>Sayfa bulunamadı.</p></div></main>;
  const templates=state.runtime?.templates||{};if(templates[`page.${slug}`]||templates.page)return <ThemeStaticPageRenderer slug={slug} page={page}/>;
  return <main className="content-page container"><article className="content-page-card">{page.imageUrl&&<img className="content-page-hero" src={page.imageUrl} alt=""/>}<h1>{page.title}</h1>{page.seoDescription&&<p className="content-page-lead">{page.seoDescription}</p>}<div className="content-page-body">{String(page.body||'').split(/\n{2,}/).map((block:string,i:number)=>{const lines=block.split('\n');return <p key={i}>{lines.map((line:string,j:number)=><span key={j}>{line}{j<lines.length-1&&<br/>}</span>)}</p>})}</div></article></main>;
}
