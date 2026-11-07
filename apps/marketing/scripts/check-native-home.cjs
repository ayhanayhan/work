const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');

const root=path.resolve(__dirname,'..');
function importTs(relative,stubs={}){
  const file=path.resolve(root,relative);
  const source=fs.readFileSync(file,'utf8');
  const js=ts.transpileModule(source,{
    fileName:file,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
      jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
  });
  const errors=(js.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,'TypeScript transpilation: '+relative);
  const m=new Module(file,module);
  m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
  const orig=m.require.bind(m);
  m.require=(name)=>stubs[name]||orig(name);
  m._compile(js.outputText,file);
  return m.exports;
}
const link=({href,children,...props})=>React.createElement('a',{href,...props},children);
const data=importTs('lib/home-data.ts');
const blog={blogPath:(lang,slug)=>(lang==='tr'?'':'/'+lang)+'/blog'+(slug?'/'+slug:'')};
const {HomepageNative,homepageSchemas}=importTs('components/home-native.tsx',{
  'next/link':link,
  '@/lib/home-data':data,
  '@/lib/blog':blog
});
const modules=[
  {id:'faq',sortOrder:4,enabled:true,fields:{heading:{tr:'Sorular'}},items:[{
    id:'q1',enabled:true,fields:{question:{tr:'Mağazam nasıl açılır?'},answer:{tr:'Kayıt yaparak.'}}}]},
  {id:'blog',sortOrder:3,enabled:true,fields:{heading:{tr:'Yeni Yazılar'}},items:[]},
  {id:'hero',sortOrder:1,enabled:true,fields:{heading:{tr:'Gerçek Mağaza'},
    description:{tr:'Veritabanı açıklaması'}},items:[]},
  {id:'builder',sortOrder:2,enabled:true,fields:{},items:[{
    id:'c1',enabled:true,fields:{heading:{tr:'Gerçek Özellik'},description:{tr:'Gerçek veri'}}}]},
  {id:'radar',sortOrder:5,enabled:false,fields:{heading:{tr:'Gizli modül'}},items:[]}
];
const article={id:'published',slug:'gercek-yazi',title:'Yayındaki Makale',excerpt:'Gerçek özet',
  featuredImage:'',imageAlt:'',category:'Haberler'};
const props={home:{version:9,locale:'tr',modules},lang:'tr',
  locales:[{locale:'tr',label:'Türkçe',isDefault:true},{locale:'de',label:'Deutsch',isDefault:false}],
  posts:[article]};
const html=renderToStaticMarkup(React.createElement(HomepageNative,props));
for(const value of ['Gerçek Mağaza','Veritabanı açıklaması','Gerçek Özellik',
  'Yeni Yazılar','Yayındaki Makale','Mağazam nasıl açılır?','Deutsch'])
  assert.ok(html.includes(value),'Missing actual CMS content: '+value);
assert.ok(!html.includes('Gizli modül'),'Disabled modules must stay hidden');
assert.ok(!html.includes('src="/assets/images/blog/store.svg"'),'No fake blog thumbnails');
assert.ok(html.indexOf('Gerçek Mağaza')<html.indexOf('Gerçek Özellik'));
assert.ok(html.indexOf('Gerçek Özellik')<html.indexOf('Yeni Yazılar'));
assert.ok(html.indexOf('Yeni Yazılar')<html.indexOf('Mağazam nasıl açılır?'));
const schema=homepageSchemas(props.home,'tr',props.posts);
const faq=schema.find(v=>v['@type']==='FAQPage');
assert.equal(faq.mainEntity[0].name,'Mağazam nasıl açılır?');
const blank=renderToStaticMarkup(React.createElement(HomepageNative,{
  home:{version:0,locale:'de',modules:[]},lang:'de',locales:props.locales,posts:[]
}));
assert.ok(!blank.includes('Gerçek Mağaza'));
assert.ok(!blank.includes('Veritabanı açıklaması'));
assert.ok(!blank.includes('Yayındaki Makale'));
assert.ok(!blank.includes('La casa del mejor talento'));
assert.ok(blank.includes('href="/de/"'));
const page=fs.readFileSync(path.resolve(root,'app/[[...slug]]/page.tsx'),'utf8');
assert.ok(page.includes('<HomepageNative'));
assert.ok(page.indexOf('return <>\n      <HomepageNative')<page.lastIndexOf('renderPage(slug,await searchParams)'));
console.log('PASS: true Next.js React homepage renders DB-backed content, sorted modules, native FAQ and localized footer without demo');
