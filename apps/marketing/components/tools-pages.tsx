import SiteShell from '@/components/site-shell';

export type ToolSummary={id:string;title:string;subtitle:string;description:string;image:string};
export type ToolPage={id:string;title:string;image:string;
 fields:Record<string,string>;
 sections:{id:string;kind:string;title:string;body:string;image:string}[];
 faqs:{id:string;question:string;answer:string}[]};
const base=(process.env.API_ORIGIN||'').replace(/\/$/,'');
const labels:Record<string,{title:string;description:string;back:string;more:string;notReady:string}>={
 tr:{title:'Ücretsiz Araçlar',description:'E-ticaret ve işletme yönetiminde kullanabileceğiniz araçlar.',
  back:'Tüm araçlar',more:'Diğer araçlar',notReady:'Hesaplama özelliği hazırlanıyor.'},
 en:{title:'Free Tools',description:'Tools for e-commerce and business management.',
  back:'All tools',more:'Other tools',notReady:'Calculator coming soon.'},
 de:{title:'Kostenlose Tools',description:'Werkzeuge für E-Commerce und Unternehmen.',
  back:'Alle Tools',more:'Weitere Tools',notReady:'Rechner folgt in Kürze.'},
 ru:{title:'Бесплатные инструменты',description:'Инструменты для электронной коммерции.',
  back:'Все инструменты',more:'Другие инструменты',notReady:'Калькулятор в разработке.'},
 ar:{title:'أدوات مجانية',description:'أدوات للتجارة الإلكترونية وإدارة الأعمال.',
  back:'كل الأدوات',more:'أدوات أخرى',notReady:'الحاسبة قيد الإعداد.'}
};
const copy=(locale:string)=>labels[locale]||labels.tr;
export const toolPath=(locale:string,slug?:string)=>(locale==='tr'?'':'/'+locale)+'/araclar'+(slug?'/'+slug:'');
export async function listTools(locale:string):Promise<ToolSummary[]>{
 if(!base)return [];
 try{
  const response=await fetch(base+'/v1/public/website/tools?lang='+encodeURIComponent(locale),{
   cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return [];
  const data=await response.json();
  return Array.isArray(data)?data:[];
 }catch{return []}
}
export async function toolDetail(slug:string,locale:string):Promise<ToolPage|null>{
 if(!base)return null;
 try{
  const response=await fetch(base+'/v1/public/website/tools/'+encodeURIComponent(slug)+'?lang='+encodeURIComponent(locale),{
   cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return null;
  return await response.json() as ToolPage;
 }catch{return null}
}
function BlockText({children}:{children:string}){
 return <p className="tc-tool-text">{children}</p>;
}
export function ToolIndex({locale,tools}:{locale:string;tools:ToolSummary[]}){
 const t=copy(locale);
 return <SiteShell><main className="tc-tools-page">
  <div className="container">
   <header className="tc-tools-hero"><h1>{t.title}</h1><p>{t.description}</p></header>
   <div className="tc-tools-grid">
    {tools.map(tool=><a key={tool.id} href={toolPath(locale,tool.id)} className="tc-tools-card">
      {tool.image?<img loading="lazy" src={tool.image} alt={tool.title}/>:null}
      <h2>{tool.title}</h2><p>{tool.subtitle||tool.description}</p>
    </a>)}
   </div>
  </div>
 </main></SiteShell>;
}
export function ToolArticle({locale,tool,other}:{locale:string;tool:ToolPage;other:ToolSummary[]}){
 const t=copy(locale),f=tool.fields;
 const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
 const path=toolPath(locale,tool.id);
 const jsonld={
  '@context':'https://schema.org','@type':'WebPage',name:tool.title,url:origin+path,
  description:f.seoDescription||f.intro||'',inLanguage:locale
 };
 return <SiteShell><main className="tc-tools-page">
  <div className="container">
   <nav aria-label="Breadcrumb" className="tc-tools-breadcrumb"><a href={toolPath(locale)}>{t.back}</a><span> / {tool.title}</span></nav>
   <header className="tc-tools-hero">
    <h1>{tool.title}</h1>
    {f.subtitle?<p>{f.subtitle}</p>:null}
    {f.intro?<BlockText>{f.intro}</BlockText>:null}
   </header>
   {tool.image?<img className="tc-tool-featured" src={tool.image} alt={f.imageAlt||tool.title}/>:null}
   <div className="tc-tool-body">
    <article className="tc-tool-content">
     {f.calculatorTitle||f.calculatorDescription?<section className="tc-tool-section tc-tool-calculator-intro">
       {f.calculatorTitle?<h2>{f.calculatorTitle}</h2>:null}
       {f.calculatorDescription?<BlockText>{f.calculatorDescription}</BlockText>:null}
       <p className="tc-tool-unavailable">{t.notReady}</p>
      </section>:null}
     {f.description?<section className="tc-tool-section"><BlockText>{f.description}</BlockText></section>:null}
     {f.howItWorksTitle||f.howItWorks?<section className="tc-tool-section">
      {f.howItWorksTitle?<h2>{f.howItWorksTitle}</h2>:null}
      {f.howItWorks?<BlockText>{f.howItWorks}</BlockText>:null}
     </section>:null}
     {tool.sections.map(section=><section key={section.id} className="tc-tool-section">
      {section.title?<h2>{section.title}</h2>:null}
      {section.image?<img loading="lazy" src={section.image} alt={section.title||tool.title}/>:null}
      {section.body?(section.kind==='list'?
       <ul className="tc-tool-list">{section.body.split('\n').map(x=>x.trim()).filter(Boolean).map((line,i)=><li key={i}>{line}</li>)}</ul>:
       section.kind==='steps'?
       <ol className="tc-tool-list">{section.body.split('\n').map(x=>x.trim()).filter(Boolean).map((line,i)=><li key={i}>{line}</li>)}</ol>:
       <div className={section.kind==='notice'?'tc-tool-inline-note':''}><BlockText>{section.body}</BlockText></div>):null}
     </section>)}
     {f.exampleTitle||f.example?<section className="tc-tool-section">
      {f.exampleTitle?<h2>{f.exampleTitle}</h2>:null}
      {f.example?<BlockText>{f.example}</BlockText>:null}
     </section>:null}
     {tool.faqs.length?<section className="tc-tool-section tc-tool-faq">
      <h2>{f.faqTitle||'Sıkça Sorulan Sorular'}</h2>
      {tool.faqs.map(faq=><details key={faq.id}>
       <summary>{faq.question}</summary><BlockText>{faq.answer}</BlockText>
      </details>)}
     </section>:null}
     {f.disclaimer?<aside className="tc-tool-note"><BlockText>{f.disclaimer}</BlockText></aside>:null}
     {f.ctaTitle||f.ctaText?<section className="tc-tool-cta">
      {f.ctaTitle?<h2>{f.ctaTitle}</h2>:null}
      {f.ctaText?<BlockText>{f.ctaText}</BlockText>:null}
      {f.ctaButton&&f.ctaUrl&&(f.ctaUrl.startsWith('/')||f.ctaUrl.startsWith('https://'))?
       <a href={f.ctaUrl}>{f.ctaButton}</a>:null}
     </section>:null}
    </article>
    <aside className="tc-tool-sidebar">
     <h2>{t.more}</h2>
     <nav>{other.filter(x=>x.id!==tool.id).map(item=><a key={item.id} href={toolPath(locale,item.id)}>{item.title}</a>)}</nav>
    </aside>
   </div>
  </div>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonld).replace(/</g,'\\u003c')}}/>
 </main></SiteShell>;
}
