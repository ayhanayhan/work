import SiteShell from '@/components/site-shell';

/**
 * Tools pages use the same editorial layout, heading styles, cards, FAQ and
 * sidebar as the existing Ticarti blog. Content is supplied by Master only.
 * Calculator functionality will be inserted into the reserved slot later.
 */
export type ToolSummary={id:string;title:string;subtitle:string;description:string;image:string};
export type ToolPage={id:string;title:string;image:string;fields:Record<string,string>;
 sections:{id:string;kind:string;title:string;body:string;image:string}[];
 faqs:{id:string;question:string;answer:string}[]};
const base=(process.env.API_ORIGIN||'').replace(/\/$/,'');
type Ui={title:string;description:string;back:string;more:string;notReady:string;empty:string;faq:string};
const labels:Record<string,Ui>={
 tr:{title:'Ücretsiz Araçlar',description:'E-ticaret ve işletme yönetiminde kullanabileceğiniz araçlar.',back:'Tüm araçlar',more:'Diğer araçlar',notReady:'Hesaplama aracı yakında kullanıma açılacak.',empty:'Henüz yayımlanmış araç bulunmuyor.',faq:'Sıkça Sorulan Sorular'},
 en:{title:'Free Tools',description:'Tools for e-commerce and business management.',back:'All tools',more:'Other tools',notReady:'Calculator coming soon.',empty:'No tools have been published yet.',faq:'Frequently Asked Questions'},
 de:{title:'Kostenlose Tools',description:'Werkzeuge für E-Commerce und Unternehmen.',back:'Alle Tools',more:'Weitere Tools',notReady:'Rechner folgt in Kürze.',empty:'Noch keine Tools veröffentlicht.',faq:'Häufig gestellte Fragen'},
 ru:{title:'Бесплатные инструменты',description:'Инструменты для электронной коммерции и управления бизнесом.',back:'Все инструменты',more:'Другие инструменты',notReady:'Калькулятор скоро появится.',empty:'Инструменты ещё не опубликованы.',faq:'Частые вопросы'},
 ar:{title:'أدوات مجانية',description:'أدوات للتجارة الإلكترونية وإدارة الأعمال.',back:'كل الأدوات',more:'أدوات أخرى',notReady:'ستتوفر الحاسبة قريباً.',empty:'لم يتم نشر أي أدوات بعد.',faq:'الأسئلة الشائعة'},
 bg:{title:'Безплатни инструменти',description:'Инструменти за електронна търговия и управление на бизнеса.',back:'Всички инструменти',more:'Други инструменти',notReady:'Калкулаторът ще бъде достъпен скоро.',empty:'Все още няма публикувани инструменти.',faq:'Често задавани въпроси'},
 uk:{title:'Безкоштовні інструменти',description:'Інструменти для електронної комерції та керування бізнесом.',back:'Усі інструменти',more:'Інші інструменти',notReady:'Калькулятор незабаром з’явиться.',empty:'Інструменти ще не опубліковані.',faq:'Поширені запитання'},
 id:{title:'Alat Gratis',description:'Alat untuk e-commerce dan pengelolaan bisnis.',back:'Semua alat',more:'Alat lainnya',notReady:'Kalkulator segera hadir.',empty:'Belum ada alat yang diterbitkan.',faq:'Pertanyaan Umum'},
 vi:{title:'Công cụ miễn phí',description:'Công cụ dành cho thương mại điện tử và quản lý doanh nghiệp.',back:'Tất cả công cụ',more:'Công cụ khác',notReady:'Công cụ tính toán sẽ sớm ra mắt.',empty:'Chưa có công cụ nào được xuất bản.',faq:'Câu hỏi thường gặp'}
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
function Copy({children}:{children:string}){return <p>{children}</p>}
function StoryFrame({children}:{children:React.ReactNode}){
 return <SiteShell><main className="tc-marketing-blog tc-tools-page">{children}</main></SiteShell>;
}
function ToolCard({tool,locale}:{tool:ToolSummary;locale:string}){
 return <article className="card-items list-item box card-visible tc-blog__card tc-tools-card" key={tool.id}>
  <div className="card-wrap">
   <a className="tc-blog__card-link" href={toolPath(locale,tool.id)} aria-label={tool.title}>
    {tool.image?<div className="bg-imge"><div className="img">
      <img loading="lazy" src={tool.image} alt={tool.title}/>
    </div></div>:null}
    <div className="card-body">
     <div className="content"><h4>{tool.title}</h4></div>
     {tool.subtitle||tool.description?<div className="card-expand">
      <div className="card-expand-desc">{tool.subtitle||tool.description}</div>
     </div>:null}
    </div>
   </a>
  </div>
 </article>;
}
export function ToolIndex({locale,tools}:{locale:string;tools:ToolSummary[]}){
 const t=copy(locale);
 return <StoryFrame>
  <section className="tc-blog-archive-hero">
   <div className="tc-stories-hero-section"><h1>{t.title}</h1><p className="tc-stories-hero-desc">{t.description}</p></div>
  </section>
  {tools.length?<section className="tc-blog-list tc-tools-list">
   <div className="card"><div className="card-inner">
    {tools.map(tool=><ToolCard key={tool.id} locale={locale} tool={tool}/>)}
   </div></div>
  </section>:<section className="tc-tools-empty"><p>{t.empty}</p></section>}
 </StoryFrame>;
}
function RichSection({title,body,id}:{title?:string;body?:string;id?:string}){
 if(!title&&!body)return null;
 return <section className="tc-tools-content-section" id={id}>
  {title?<h2>{title}</h2>:null}{body?<Copy>{body}</Copy>:null}
 </section>;
}
function ContentBlock({section}:{section:ToolPage['sections'][number]}){
 if(!section.title&&!section.body&&!section.image)return null;
 const lines=section.body.split('\n').map(line=>line.trim()).filter(Boolean);
 return <section className="tc-tools-content-section" id={'tool-section-'+section.id}>
  {section.title?<h2>{section.title}</h2>:null}
  {section.image?<img className="tc-tool-content-image" loading="lazy" src={section.image} alt={section.title}/>:null}
  {section.kind==='list'?<ul>{lines.map((line,i)=><li key={i}>{line}</li>)}</ul>:
   section.kind==='steps'?<ol>{lines.map((line,i)=><li key={i}>{line}</li>)}</ol>:
   section.kind==='notice'?<blockquote>{section.body}</blockquote>:
   section.body?<Copy>{section.body}</Copy>:null}
 </section>;
}
export function ToolArticle({locale,tool,other}:{locale:string;tool:ToolPage;other:ToolSummary[]}){
 const t=copy(locale),f=tool.fields;
 const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
 const path=toolPath(locale,tool.id);
 const sections=tool.sections.filter(x=>x.title||x.body||x.image);
 const related=other.filter(x=>x.id!==tool.id);
 const jsonld=[
  {'@context':'https://schema.org','@type':'WebPage',name:tool.title,url:origin+path,
   description:f.seoDescription||f.intro||'',inLanguage:locale},
  {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
   {'@type':'ListItem',position:1,name:t.back,item:origin+toolPath(locale)},
   {'@type':'ListItem',position:2,name:tool.title,item:origin+path}
  ]},
  ...(tool.faqs.length?[{'@context':'https://schema.org','@type':'FAQPage',
   mainEntity:tool.faqs.map(faq=>({'@type':'Question',name:faq.question,
    acceptedAnswer:{'@type':'Answer',text:faq.answer}}))}]:[])
 ];
 const hasCalculatorIntro=Boolean(f.calculatorTitle||f.calculatorDescription);
 return <StoryFrame>
  <div className="tc-blog-single-layout tc-tools-single-layout">
   <div className="tc-blog-single-primary">
    <header className="tc-post-hero"><div className="section-heading">
     <h1 id="tool-title">{tool.title}</h1>
     {f.subtitle?<div className="content"><p>{f.subtitle}</p></div>:null}
     {f.intro?<div className="content"><p>{f.intro}</p></div>:null}
     <a className="tc-blog-back" href={toolPath(locale)}>{t.back}</a>
    </div></header>
    <article className="tc-blog-article">
     {tool.image?<img className="tc-blog-article-cover" src={tool.image} alt={f.imageAlt||tool.title}/>:null}
     <div className="tc-blog-article-copy">
      {hasCalculatorIntro?<section className="tc-tools-calculator-slot" id="tool-calculator">
       {f.calculatorTitle?<h2>{f.calculatorTitle}</h2>:null}
       {f.calculatorDescription?<Copy>{f.calculatorDescription}</Copy>:null}
       <p className="tc-tools-calculator-status">{t.notReady}</p>
      </section>:null}
      <RichSection body={f.description} id="tool-description"/>
      <RichSection title={f.howItWorksTitle} body={f.howItWorks} id="tool-how-it-works"/>
      {sections.map(section=><ContentBlock key={section.id} section={section}/>)}
      <RichSection title={f.exampleTitle} body={f.example} id="tool-example"/>
      {tool.faqs.length?<section className="tc-tools-faq" id="tool-faq">
       <h2>{f.faqTitle||t.faq}</h2>
       {tool.faqs.map(faq=><details key={faq.id}>
        <summary>{faq.question}</summary><Copy>{faq.answer}</Copy>
       </details>)}
      </section>:null}
      {f.disclaimer?<aside className="tc-tools-disclaimer"><Copy>{f.disclaimer}</Copy></aside>:null}
      {f.ctaTitle||f.ctaText||f.ctaButton&&f.ctaUrl?<div className="tc-tools-bottom-cta">
       {f.ctaTitle?<h2>{f.ctaTitle}</h2>:null}
       {f.ctaText?<Copy>{f.ctaText}</Copy>:null}
       {f.ctaButton&&f.ctaUrl&&(f.ctaUrl.startsWith('/')||f.ctaUrl.startsWith('https://'))?
        <a className="btn-featured" href={f.ctaUrl}>{f.ctaButton}</a>:null}
      </div>:null}
     </div>
    </article>
   </div>
   {related.length||sections.length||tool.faqs.length?
    <aside className="tc-blog-single-sidebar tc-tools-sidebar" aria-label={t.more}>
     {sections.length||tool.faqs.length?<div className="tc-post-toc">
      <h2>{t.title}</h2>
      <nav>
       <a href="#tool-title">{tool.title}</a>
       {sections.filter(section=>section.title).map(section=><a key={section.id}
        href={'#tool-section-'+section.id}>{section.title}</a>)}
       {tool.faqs.length?<a href="#tool-faq">{f.faqTitle||t.faq}</a>:null}
      </nav>
     </div>:null}
     {related.length?<div className="tc-post-recent"><h2>{t.more}</h2>
      {related.map(item=><a key={item.id} href={toolPath(locale,item.id)}>
       {item.image?<img src={item.image} alt="" loading="lazy"/>:null}
       <span>{item.title}</span>
      </a>)}
     </div>:null}
    </aside>:null}
  </div>
  <script type="application/ld+json"
   dangerouslySetInnerHTML={{__html:JSON.stringify(jsonld).replace(/</g,'\u003c')}}/>
 </StoryFrame>;
}
