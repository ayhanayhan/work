/* The original HTML is a reference fixture ONLY for this test; never read at runtime. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const dir=path.resolve(__dirname,'../components/home-snapshot');
const componentNames=['hero','hero-cards','hero-logo-group','hero-callback','phone-validators','animated','builder','radar','radar-display','channels','orders-preview','showcase','references','bottomCta','bottomCta-callback','blog','blog-cards','faq','header','mobile-mega','footer','index','interactions'];
const compiled=new Map();
function compileFile(input,homeComponent=false){
  const candidates=[input,input+'.tsx',input+'.ts',input+'.js'];
  const file=candidates.find(x=>fs.existsSync(x)&&fs.statSync(x).isFile());
  if(!file)throw Error('Missing snapshot dependency '+input);
  if(compiled.has(file))return compiled.get(file).exports;
  const source=fs.readFileSync(file,'utf8');
  if(homeComponent){
    assert.ok(!source.includes('dangerouslySetInnerHTML'),'No runtime HTML injection: '+file);
    assert.ok(!source.includes('fetch('),'No client fetch in snapshot JSX: '+file);
  }
  const result=ts.transpileModule(source,{
    fileName:file,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
      jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
  });
  const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  if(errors.length)throw Error(file+' TypeScript JSX syntax: '+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '));
  const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));compiled.set(file,m);
  const original=m.require.bind(m);
  m.require=id=>id.startsWith('./')||id.startsWith('../')
    ?compileFile(path.resolve(path.dirname(file),id))
    :id.startsWith('@/')?compileFile(path.resolve(__dirname,'../',id.slice(2))):original(id);
  m._compile(result.outputText,file);return m.exports;
}
function load(name){return compileFile(path.join(dir,name+(name==='phone-validators'?'.ts':'.tsx')),true)}
for(const name of componentNames)load(name);
const {validatePhone}=load('phone-validators');
assert.equal(validatePhone('532 123 45 67','TR','+90'),'','Correct TR phone accepted');
assert.ok(validatePhone('111','TR','+90'),'Invalid TR phone rejected');
assert.equal(validatePhone('202 555 0175','US','+1'),'','Correct US phone accepted');
for(const component of ['radar-display','orders-preview']){
  const source=fs.readFileSync(path.join(dir,component+'.tsx'),'utf8');
  assert.ok(source.includes('useState('),'Animation must be driven by React state: '+component);
  assert.ok(!source.includes('document.createElement('),'No imperative DOM creation: '+component);
}

const callbackSource=fs.readFileSync(path.join(dir,'hero-callback.tsx'),'utf8');
const footerCallbackSource=fs.readFileSync(path.join(dir,'bottomCta-callback.tsx'),'utf8');
for(const source of [callbackSource,footerCallbackSource]){
  assert.ok(source.includes('useState('),'Callback form must be React-managed');
  assert.ok(source.includes('onSubmit={submit}'),'Callback submit must be handled by React');
  assert.ok(!source.includes('window.TicartiValidators'),'No legacy form globals');
}
const markup=renderToStaticMarkup(React.createElement(load('index').default));
// The new integration updates only the selected modules. No browser text patches.
const cmsFixture={version:1,locale:'tr',disabledModuleIds:[],consentContract:{key:'KVKK_NOTICE',contentKey:'kvkk-notice',href:'/kvkk.html'},modules:[
  {id:'hero',enabled:true,configured:true,ctaEnabled:false,fields:{
    heading:{tr:'Dinamik Hero Başlığı'},button:{tr:'Başlayalım'},buttonUrl:{tr:'/paketler.html'}
  },items:[{id:'reference-1',enabled:true,fields:{heading:{tr:'Vitrin'},description:{tr:'Referans açıklaması'}},
    assets:{image:'/assets/images/test.jpg',logo:'/assets/images/test-logo.svg'}}],
    logos:[{id:'logo-1',enabled:true,fields:{title:{tr:'Marka başlığı'}},assets:{image:'/assets/images/test-logo.svg'}}]},
  {id:'references',enabled:true,configured:true,fields:{},items:[{id:'press-1',enabled:true,fields:{description:{tr:'Basın açıklaması'}},assets:{image:'/assets/images/test.jpg'}}]},
  {id:'faq',enabled:true,configured:true,fields:{heading:{tr:'Yeni Sorular'},button:{tr:'İletişime geç'},buttonUrl:{tr:'/contacto.html'}},
    items:[{id:'question-1',enabled:true,fields:{question:{tr:'Nasıl kurulur?'},answer:{tr:'Hemen başlayabilirsin.'}}}]},
  {id:'blog',enabled:true,configured:true,fields:{heading:{tr:'En Son Makaleler'}},items:[],categoryIds:['cat-guides']}
]};
const previewPost={id:'post-1',slug:'ornek-makale',category:'Rehberler',categoryId:'cat-guides',
 title:'Blog CMS Yazısı',excerpt:'E-ticaret rehberi özeti.',featuredImage:'/assets/images/blog/store.svg',imageAlt:'Blog',content:'İçerik'};
const cmsMarkup=renderToStaticMarkup(React.createElement(load('index').default,{home:cmsFixture,posts:[previewPost],locale:'tr'}));
for(const expected of ['Dinamik Hero Başlığı','Referans açıklaması','Marka başlığı','Nasıl kurulur?',
  'Hemen başlayabilirsin.','En Son Makaleler','Blog CMS Yazısı']){
  assert.ok(cmsMarkup.includes(expected),'CMS fixture not rendered: '+expected);
}
assert.ok(cmsMarkup.includes('href="/blog/ornek-makale"'),'Blog card links to real post route');
const cmsHero=compileFile(path.join(dir,'hero-cms.tsx')).default;
const singleCard=renderToStaticMarkup(React.createElement(cmsHero,{
 home:{version:1,locale:'tr',modules:[cmsFixture.modules[0]]},locale:'tr'
}));
assert.equal((singleCard.match(/class="tc-ui-card"/g)||[]).length,1,
 'One CMS reference must render exactly one slider card');
assert.equal((singleCard.match(/class="tc-site-hero__arrow/g)||[]).length,0,
 'One slide must not show navigation arrows');
assert.ok(singleCard.includes('data-cms-card-count="1"'),
 'Short CMS carousels must disable infinite-loop centering');
const localizedFaq=compileFile(path.join(dir,'faq-cms.tsx')).default;
const faqRecord={...cmsFixture.modules.find(x=>x.id==='faq'),
 fields:{heading:{tr:'Sorular',en:'Questions'}},
 items:[{id:'q-bilingual',enabled:true,fields:{
 question:{tr:'Nasıl başlanır?',en:'How do I start?'},
 answer:{tr:'Mağaza kurun.',en:'Create a store.'}
 }}]};
const englishFaq=renderToStaticMarkup(React.createElement(localizedFaq,{
 home:{version:1,locale:'en',modules:[faqRecord]},locale:'en'
}));
assert.ok(englishFaq.includes('How do I start?')&&englishFaq.includes('Create a store.'),
 'FAQ question and answer must both use the globally selected homepage locale');
assert.ok(!englishFaq.includes('Nasıl başlanır?')&&!englishFaq.includes('Mağaza kurun.'),
 'English FAQ must not display Turkish question or answer');

assert.ok(!cmsMarkup.includes('id="tc-phone-main-hero"'),'Hero CTA toggle must hide just the hero form');
// Unconnected sections must preserve the existing visual design and static content.
for(const className of ['tc-site-hero','tc-animated-heading','tc-builder-section',
 'tc-dashboard-radar','tc-sales-channels','tc-showcase','tc-press','tc-bottom-cta']){
 assert.ok(markup.includes('class="'+className)||markup.includes('class="'+className+' '),
  'Original unconfigured homepage section was unexpectedly removed: '+className);
}
assert.ok(!markup.includes('class="tc-faq"'),
 'Unconfigured FAQ cannot render static sample questions');
const faqSource=fs.readFileSync(path.join(dir,'faq.tsx'),'utf8');
assert.ok(!faqSource.includes('E-ticaret paketi nedir?'),
 'FAQ may not contain hardcoded question copy');
const configuredEmpty={
 version:2,locale:'en',modules:[
  {id:'hero',configured:true,enabled:true,fields:{heading:{tr:'Test Türkçe'}},items:[],logos:[]},
  {id:'faq',configured:true,enabled:true,fields:{heading:{tr:'Sorular'}},items:[]},
  {id:'builder',configured:true,enabled:true,fields:{},items:[]}
 ]
};
const emptyLocale=renderToStaticMarkup(React.createElement(load('index').default,{
 home:configuredEmpty,posts:[],locale:'en'
}));
for(const name of ['tc-site-hero','tc-faq','tc-builder-section']){
 assert.ok(!emptyLocale.includes('class="'+name+'"')&&!emptyLocale.includes('class="'+name+' '),
  'Configured module without English content must remain hidden: '+name);
}
const english=renderToStaticMarkup(React.createElement(load('index').default,{
  home:cmsFixture,posts:[],locale:'en'
}));
for(const text of ['Dinamik Hero Başlığı','Nasıl kurulur?','Hemen başlayabilirsin.']){
  assert.ok(!english.includes(text),'Missing EN translation must not fall back to TR/demo: '+text);
}
assert.ok(!english.includes('class="tc-faq"'),'Empty English FAQ must be hidden');
assert.ok(english.includes('class="tc-builder-section"'),'Unconfigured original feature section must be preserved');
assert.ok(!markup.includes('<script'),'Scripts are not embedded in server markup');
const page=fs.readFileSync(path.resolve(__dirname,'../app/[[...slug]]/page.tsx'),'utf8');
const homeStart=page.indexOf('if(slug.length===0');
assert.ok(homeStart>=0&&page.includes('<HomeSnapshot home={home}'),'Native React homepage must be routed');
assert.ok(!page.includes("'/assets/js/pages/website-home-cms.js'"),'Client CMS patching must not be loaded');
assert.ok(!page.includes("'/assets/js/pages/orders-preview.js'"),'No mocked order feed');
assert.ok(page.includes('<SiteShell>'),'Homepage must use shared header/footer and interactions shell');
const homepageSource=fs.readFileSync(path.join(dir,'index.tsx'),'utf8');
const shellSource=fs.readFileSync(path.resolve(__dirname,'../components/site-shell.tsx'),'utf8');
const blogSource=fs.readFileSync(path.resolve(__dirname,'../components/blog-pages.tsx'),'utf8');
assert.ok(!homepageSource.includes('<HeaderSnapshot')&&!homepageSource.includes('<FooterSnapshot'),
 'Homepage content modules must not duplicate site header or footer');
assert.ok(shellSource.includes('<HeaderSnapshot/>')&&shellSource.includes('<FooterSnapshot/>'),
 'One central shell must own both header and footer');
assert.ok(blogSource.includes('<SiteShell>')&&page.includes('<SiteShell>'),
 'Blog and homepage must use the exact same header/footer shell');
for(const id of ['hero','builder','radar','channels','showcase','references','bottomCta','animated']){
 const original=fs.readFileSync(path.join(dir,id+'.tsx'),'utf8');
 assert.ok(original.includes('module?.configured')&&original.includes("CmsSection"),
  'Each migrated module must preserve original appearance until configured: '+id);
}

assert.ok(faqSource.includes("from './faq-cms'"),'FAQ must use the CMS-only renderer');
assert.ok(!page.includes('HOME_VISUAL_SCRIPTS'),'No legacy homepage script injection');
const behavior=fs.readFileSync(path.join(dir,'interactions.tsx'),'utf8');
assert.ok(!behavior.includes('innerHTML') || behavior.includes('No legacy <script> injection'),'No runtime HTML replacement');
assert.ok(!behavior.includes('appendChild('),'No legacy DOM append operations');
console.log('PASS: original unconfigured sections restored, configured missing locales hidden, shared site shell used');
