import Link from 'next/link';
import type {HomeData,HomeItem,HomeModule,ActiveLocale} from '@/lib/home-data';
import {localized,visibleItems,validLink,validMedia} from '@/lib/home-data';
import type {BlogPost} from '@/lib/blog';
import {blogPath} from '@/lib/blog';

type Props={home:HomeData;lang:string;locales:ActiveLocale[];posts:BlogPost[]};
const t=(m:HomeModule,key:string,lang:string)=>localized(m.fields,key,lang);
const it=(m:HomeItem,key:string,lang:string)=>localized(m.fields,key,lang);
const uiText:Record<string,Record<string,string>>={
  tr:{features:'Özellikler',blog:'Blog',faq:'Sık Sorulan Sorular',contact:'İletişim',login:'Giriş yap',
    create:'E-ticaret siteni oluştur',trial:'Ücretsiz dene',all:'Tüm yazılar',packages:'Paketler',privacy:'Gizlilik',locale:'Dil'},
  en:{features:'Features',blog:'Blog',faq:'Frequently Asked Questions',contact:'Contact',login:'Log in',
    create:'Create your online store',trial:'Try for free',all:'All articles',packages:'Plans',privacy:'Privacy',locale:'Language'},
  de:{features:'Funktionen',blog:'Blog',faq:'Häufige Fragen',contact:'Kontakt',login:'Anmelden',
    create:'Onlineshop erstellen',trial:'Kostenlos testen',all:'Alle Artikel',packages:'Tarife',privacy:'Datenschutz',locale:'Sprache'},
  ru:{features:'Возможности',blog:'Блог',faq:'Частые вопросы',contact:'Контакты',login:'Войти',
    create:'Создать интернет-магазин',trial:'Попробовать бесплатно',all:'Все статьи',packages:'Тарифы',privacy:'Конфиденциальность',locale:'Язык'},
  pt:{features:'Funcionalidades',blog:'Blog',faq:'Perguntas frequentes',contact:'Contato',login:'Entrar',
    create:'Criar a loja online',trial:'Experimentar grátis',all:'Todos os artigos',packages:'Planos',privacy:'Privacidade',locale:'Idioma'},
  ar:{features:'المميزات',blog:'المدونة',faq:'الأسئلة الشائعة',contact:'اتصل بنا',login:'تسجيل الدخول',
    create:'أنشئ متجرك الإلكتروني',trial:'جرّب مجاناً',all:'كل المقالات',packages:'الباقات',privacy:'الخصوصية',locale:'اللغة'}
};
const ui=(lang:string,key:string)=>uiText[lang]?.[key]||uiText.en[key]||key;
const prefix=(lang:string)=>lang==='tr'?'':'/'+lang;
const url=(lang:string,path:string)=>prefix(lang)+path;
const media=(src:string,alt:string,cls?:string)=>{
  const image=validMedia(src);
  return image?<img src={image} alt={alt} className={cls} loading="lazy"/>:null;
};
function Nav({lang,features,blog,faq}:{lang:string;features:boolean;blog:boolean;faq:boolean}){
  const root=prefix(lang);
  return <header className="tc-native-header">
    <div className="tc-native-shell tc-native-header-row">
      <Link href={root+'/'} className="tc-native-logo" aria-label="Ticarti anasayfa"><img src="/assets/images/ticarti-logo.svg" alt="Ticarti"/></Link>
      <nav aria-label="Ana menü" className="tc-native-nav">
        {features?<Link href={root+'/#ozellikler'}>{ui(lang,'features')}</Link>:null}
        {blog?<Link href={root+'/#blog'}>{ui(lang,'blog')}</Link>:null}
        {faq?<Link href={root+'/#sss'}>{ui(lang,'faq')}</Link>:null}
      </nav>
      <div className="tc-native-header-actions">
        <Link href={root+'/contacto.html'}>{ui(lang,'contact')}</Link>
        <Link className="tc-native-button tc-native-button--primary" href={root+'/login.html'}>{ui(lang,'login')}</Link>
      </div>
    </div>
  </header>;
}
function Hero({m,lang}:{m:HomeModule;lang:string}){
  const heading=t(m,'heading',lang),description=t(m,'description',lang),offer=t(m,'offer',lang);
  if(!heading&&!description&&!offer)return null;
  return <section className="tc-native-hero tc-site-hero" aria-label="Ticarti">
    <div className="tc-native-shell tc-native-hero-body">
      {heading?<h1 className="tc-native-h1">{heading}</h1>:null}
      {description?<p className="tc-native-lead">{description}</p>:null}
      {offer?<p className="tc-native-offer">{offer}</p>:null}
      <div className="tc-native-actions">
        <Link className="tc-native-button tc-native-button--primary" href={url(lang,'/register.html')}>{ui(lang,'create')}</Link>
      </div>
    </div>
  </section>;
}
function EntryCard({moduleId,item,lang}:{moduleId:string;item:HomeItem;lang:string}){
  const title=it(item,'heading',lang),description=it(item,'description',lang),role=it(item,'role',lang),button=it(item,'button',lang);
  const link=validLink(item.links?.href);
  const image=media(item.assets?.image||'',title);
  if(!title&&!description&&!role&&!button&&!image)return null;
  const child=<>
    {image?<div className="tc-native-card-image">{image}</div>:null}
    {title?<h3>{title}</h3>:null}
    {role?<p className="tc-native-role">{role}</p>:null}
    {description?<p>{description}</p>:null}
    {button?<span className="tc-native-inline-link">{button}</span>:null}
  </>;
  return <article className={'tc-native-card tc-native-card--'+moduleId}>
    {link?<a href={link}>{child}</a>:child}
  </article>;
}
function StandardSection({m,lang}:{m:HomeModule;lang:string}){
  const list=visibleItems(m,lang);
  const heading=t(m,'heading',lang),description=t(m,'description',lang);
  if(!heading&&!description&&!list.length)return null;
  const names:Record<string,string>={animated:'Hareketli başlık',builder:'Özellik kartları',radar:'Operasyon',channels:'Satış kanalları',showcase:'Öne çıkan özellikler',references:'Referanslar'};
  return <section id={m.id==='builder'?'ozellikler':m.id} className={'tc-native-section tc-native-module--'+m.id} aria-label={names[m.id]||m.title}>
    <div className="tc-native-shell">
      {heading?<h2 className="tc-native-section-title">{heading}</h2>:null}
      {description?<p className="tc-native-section-description">{description}</p>:null}
      {list.length?<div className={'tc-native-card-grid tc-native-card-grid--'+m.id}>
        {list.map(item=><EntryCard key={item.id} moduleId={m.id} item={item} lang={lang}/>)}
      </div>:null}
    </div>
  </section>;
}
function BottomCta({m,lang}:{m:HomeModule;lang:string}){
  const heading=t(m,'heading',lang),offer=t(m,'offer',lang);
  if(!heading&&!offer)return null;
  return <section className="tc-native-section tc-native-bottom-cta"><div className="tc-native-shell">
    {heading?<h2 className="tc-native-section-title">{heading}</h2>:null}
    {offer?<p className="tc-native-section-description">{offer}</p>:null}
    <Link className="tc-native-button tc-native-button--primary" href={url(lang,'/register.html')}>{ui(lang,'trial')}</Link>
  </div></section>;
}
function Blog({m,posts,lang}:{m:HomeModule;posts:BlogPost[];lang:string}){
  if(!posts.length)return null;
  const heading=t(m,'heading',lang),description=t(m,'description',lang);
  return <section id="blog" className="tc-native-section tc-native-blog">
    <div className="tc-native-shell">
      {heading?<h2 className="tc-native-section-title">{heading}</h2>:null}
      {description?<p className="tc-native-section-description">{description}</p>:null}
      <div className="tc-native-card-grid tc-native-card-grid--blog">
        {posts.slice(0,6).map(post=><article key={post.id} className="tc-native-card">
          <Link href={blogPath(lang,post.slug)}>
            {media(post.featuredImage,post.imageAlt||post.title)}
            {post.category?<span className="tc-native-category">{post.category}</span>:null}
            <h3>{post.title}</h3>
            {post.excerpt?<p>{post.excerpt}</p>:null}
          </Link>
        </article>)}
      </div>
      <Link className="tc-native-text-link" href={blogPath(lang)}>{ui(lang,'all')}</Link>
    </div>
  </section>;
}
function Faq({m,lang}:{m:HomeModule;lang:string}){
  const rows=visibleItems(m,lang).map(item=>({id:item.id,question:it(item,'question',lang),answer:it(item,'answer',lang)}))
    .filter(row=>row.question&&row.answer);
  if(!rows.length)return null;
  return <section id="sss" className="tc-native-section tc-native-faq"><div className="tc-native-shell">
    {t(m,'heading',lang)?<h2 className="tc-native-section-title">{t(m,'heading',lang)}</h2>:null}
    {t(m,'description',lang)?<p className="tc-native-section-description">{t(m,'description',lang)}</p>:null}
    <div className="tc-native-faq-list">{rows.map(row=><details key={row.id} className="tc-native-faq-item">
      <summary>{row.question}</summary><p>{row.answer}</p>
    </details>)}</div>
  </div></section>;
}
function Footer({lang,locales}:{lang:string;locales:ActiveLocale[]}){
  const root=prefix(lang);
  return <footer className="tc-native-footer"><div className="tc-native-shell">
    <div className="tc-native-footer-row">
      <Link href={root+'/'} className="tc-native-logo"><img src="/assets/images/ticarti-logo.svg" alt="Ticarti"/></Link>
      <nav aria-label="Alt menü">
        <Link href={root+'/paketler.html'}>{ui(lang,'packages')}</Link>
        <Link href={root+'/contacto.html'}>{ui(lang,'contact')}</Link>
        <Link href={root+'/gizlilik-politikasi.html'}>{ui(lang,'privacy')}</Link>
        <Link href={root+'/kvkk.html'}>KVKK</Link>
      </nav>
      {locales.length?<details className="tc-native-language">
        <summary>{locales.find(l=>l.locale===lang)?.label||lang.toUpperCase()}</summary>
        <ul>{locales.map(l=><li key={l.locale}>
          <Link href={prefix(l.locale)+'/'} hrefLang={l.locale} aria-current={lang===l.locale?'page':undefined}>{l.label}</Link>
        </li>)}</ul>
      </details>:null}
    </div>
    <small>© {new Date().getFullYear()} Ticarti</small>
  </div></footer>;
}
export function HomepageNative({home,lang,locales,posts}:Props){
  const known=new Set(['hero','animated','builder','radar','channels','showcase','references','bottomCta','blog','faq']);
  const activeModules=home.modules.filter(m=>m.enabled&&known.has(m.id)).sort((a,b)=>a.sortOrder-b.sortOrder);
  const featureModule=activeModules.find(m=>m.id==='builder');
  const features=!!featureModule&&visibleItems(featureModule,lang).length>0;
  const blog=!!posts.length&&activeModules.some(m=>m.id==='blog');
  const faq=activeModules.some(m=>m.id==='faq'&&visibleItems(m,lang).some(i=>it(i,'question',lang)&&it(i,'answer',lang)));
  const content=activeModules.map(m=>{
    switch(m.id){
      case 'hero':return <Hero key={m.id} m={m} lang={lang}/>;
      case 'bottomCta':return <BottomCta key={m.id} m={m} lang={lang}/>;
      case 'blog':return <Blog key={m.id} m={m} lang={lang} posts={posts}/>;
      case 'faq':return <Faq key={m.id} m={m} lang={lang}/>;
      default:return <StandardSection key={m.id} m={m} lang={lang}/>;
    }
  });
  return <div className="tc-native-home">
    <Nav lang={lang} features={features} blog={blog} faq={faq}/>
    <main id="main-content">{content}</main>
    <Footer lang={lang} locales={locales}/>
  </div>;
}
export function homepageSchemas(home:HomeData,lang:string,posts:BlogPost[]){
  const root=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
  const url=root+prefix(lang)+'/';
  const faq=home.modules.find(m=>m.id==='faq'&&m.enabled);
  const questions=faq?visibleItems(faq,lang).map(item=>({
    question:it(item,'question',lang),answer:it(item,'answer',lang)
  })).filter(q=>q.question&&q.answer):[];
  const schemas:object[]=[
    {'@context':'https://schema.org','@type':'WebSite',url:root,name:'Ticarti',inLanguage:lang},
    {'@context':'https://schema.org','@type':'WebPage',url,inLanguage:lang,name:'Ticarti'}
  ];
  if(questions.length)schemas.push({'@context':'https://schema.org','@type':'FAQPage',
    mainEntity:questions.map(q=>({'@type':'Question',name:q.question,acceptedAnswer:{'@type':'Answer',text:q.answer}}))});
  return schemas;
}
