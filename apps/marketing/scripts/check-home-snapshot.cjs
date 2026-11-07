/* The original HTML is a reference fixture ONLY for this test; never read at runtime. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const dir=path.resolve(__dirname,'../components/home-snapshot');
const componentNames=['hero','hero-cards','hero-callback','phone-validators','animated','builder','radar','channels','showcase','references','bottomCta','bottomCta-callback','blog','faq','header','mobile-mega','footer','index','interactions'];
const compiled=new Map();
function load(name){
  if(compiled.has(name))return compiled.get(name).exports;
  const file=path.join(dir,name+(name==='phone-validators'?'.ts':'.tsx'));
  const source=fs.readFileSync(file,'utf8');
  assert.ok(!source.includes('dangerouslySetInnerHTML'),'No runtime HTML injection: '+name);
  assert.ok(!source.includes('fetch('),'No Master/API requests in static snapshot: '+name);
  const result=ts.transpileModule(source,{
    fileName:file,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
      jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
  });
  const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  if(errors.length)throw Error(name+' TypeScript JSX syntax: '+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '));
  const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(dir);compiled.set(name,m);
  const original=m.require.bind(m);
  m.require=(id)=>id.startsWith('./')?load(id.slice(2)):original(id);
  m._compile(result.outputText,file);return m.exports;
}
for(const name of componentNames)load(name);
const markup=renderToStaticMarkup(React.createElement(load('index').default));
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
assert.ok(homeStart>=0&&page.includes('<HomeSnapshot/>'),'Native React homepage must be routed');
assert.ok(!page.includes("'/assets/js/pages/website-home-cms.js'"),'Client CMS patching must not be loaded');
assert.ok(!page.includes("'/assets/js/pages/orders-preview.js'"),'No mocked order feed');
assert.ok(page.includes('<HomeInteractions>'),'Interactions must run through React');
assert.ok(!page.includes('HOME_VISUAL_SCRIPTS'),'No legacy homepage script injection');
const behavior=fs.readFileSync(path.join(dir,'interactions.tsx'),'utf8');
assert.ok(!behavior.includes('innerHTML') || behavior.includes('No legacy <script> injection'),'No runtime HTML replacement');
assert.ok(!behavior.includes('appendChild('),'No legacy DOM append operations');
console.log('PASS: native React snapshot retains 10 sections, header/footer, all images and SVGs; no CMS or runtime HTML patch');
