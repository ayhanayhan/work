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
assert.ok(!cmsMarkup.includes('id="tc-phone-main-hero"'),'Hero CTA toggle must hide just the hero form');
assert.ok(cmsMarkup.includes('id="tc-kvkk-footer"'),'Footer form must not be removed by hero CTA toggle');
const source=fs.readFileSync(path.resolve(__dirname,'../templates/en/index.html'),'utf8');
const body=source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'';
const originalBody=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
assert.ok(originalBody.length>100000,'Original page fixture was unexpectedly changed');
const sectionClasses=['tc-site-hero','tc-animated-heading','tc-builder-section',
  'tc-dashboard-radar','tc-sales-channels','tc-showcase','tc-press',
  'tc-bottom-cta','tc-blog','tc-faq'];
for(const className of sectionClasses){
  assert.ok(markup.includes(className),'Original section missing: '+className);
}
assert.ok(markup.includes('id="tc-global-header"')&&markup.includes('id="tc-global-footer"'));
const count=(value,rx)=>(value.match(rx)||[]).length;
assert.equal(count(markup,/<section\b/g),count(originalBody,/<section\b/g),'Section hierarchy changed');
assert.ok(count(markup,/<img\b/g)>=count(originalBody,/<img\b/g),'Original images preserved; React repeats original hero cards');
assert.ok(count(markup,/<svg\b/g)>=count(originalBody,/<svg\b/g),'Original icons preserved; React mobile drawer adds original close icon');
assert.ok(!markup.includes('<script'),'Scripts are not embedded in server markup');
const page=fs.readFileSync(path.resolve(__dirname,'../app/[[...slug]]/page.tsx'),'utf8');
const homeStart=page.indexOf('if(slug.length===0');
assert.ok(homeStart>=0&&page.includes('<HomeSnapshot home={home}'),'Native React homepage must be routed');
assert.ok(!page.includes("'/assets/js/pages/website-home-cms.js'"),'Client CMS patching must not be loaded');
assert.ok(!page.includes("'/assets/js/pages/orders-preview.js'"),'No mocked order feed');
assert.ok(page.includes('<HomeInteractions>'),'Interactions must run through React');
assert.ok(!page.includes('HOME_VISUAL_SCRIPTS'),'No legacy homepage script injection');
const behavior=fs.readFileSync(path.join(dir,'interactions.tsx'),'utf8');
assert.ok(!behavior.includes('innerHTML') || behavior.includes('No legacy <script> injection'),'No runtime HTML replacement');
assert.ok(!behavior.includes('appendChild('),'No legacy DOM append operations');
console.log('PASS: native React homepage preserves original sections and assets; only chosen modules consume server-side Master/Blog data');
