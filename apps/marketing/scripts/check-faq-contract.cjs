const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const source=path.resolve(__dirname,'../lib/faq.ts');
const blogSource=path.resolve(__dirname,'../lib/blog.ts');
function transpile(file,parent){
  const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
  });
  const m=new Module(file,parent||module);
  m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
  const originalRequire=m.require.bind(m);
  m.require=(name)=>name==='./blog'?blog.exports:originalRequire(name);
  m._compile(out.outputText,file);
  return m;
}
const blog=transpile(blogSource);
const fixture=fs.readFileSync(path.resolve(__dirname,'../templates/en/index.html'),'utf8');
async function run(){
  const previousFetch=global.fetch,oldApi=process.env.API_ORIGIN;
  process.env.API_ORIGIN='https://api.example.invalid';
  // Evaluate after setting API_ORIGIN; the module reads it at initialization.
  const faq=transpile(source);
  try{
    global.fetch=async()=>({ok:true,json:async()=>({
      enabled:true,configured:true,fields:{
        heading:{tr:'Sıkça Sorulan Sorular',en:'Frequently Asked Questions'},
        description:{tr:'Ticarti hakkında bilgiler'}
      },items:[
        {id:'real-q',enabled:true,fields:{question:{tr:'Mağaza nasıl kurulur?',en:'How do I create a store?'},
          answer:{tr:'Hesabını oluştur ve ürünlerini ekle.',en:'Create your account and add products.'}}},
        {id:'missing-en',enabled:true,fields:{question:{tr:'Kargo nasıl çalışır?'},answer:{tr:'Kargo ayarlarından yapılandırılır.'}}},
        {id:'disabled',enabled:false,fields:{question:{tr:'Gizli soru'},answer:{tr:'Gizli cevap'}}}
      ]
    })});
    const tr=await faq.exports.getHomepageFaq('tr');
    const en=await faq.exports.getHomepageFaq('en');
    assert.equal(tr.items.length,2);
    assert.equal(en.items.length,1,'Missing English translation must not use Turkish');
    const html=faq.exports.applyHomepageFaq(fixture,tr);
    assert.ok(html.includes('Mağaza nasıl kurulur?'));
    assert.ok(html.includes('Kargo nasıl çalışır?'));
    assert.ok(!html.includes('Gizli soru'));
    assert.ok(!html.includes('Plus paketi hangi işletmeler'));
    assert.ok(html.includes('data-tc-ssr-faq="1"'));
    assert.ok(html.includes('tc-faq__panel'));
    const other=faq.exports.applyHomepageFaq(fixture,en);
    assert.ok(other.includes('How do I create a store?'));
    assert.ok(!other.includes('Kargo nasıl çalışır?'));
    const emptyLang=faq.exports.applyHomepageFaq(fixture,{...tr,items:[]});
    assert.ok(!emptyLang.includes('id="tc-faq"'),'Untranslated FAQ must not display original Turkish copy');
    const disabled=faq.exports.applyHomepageFaq(fixture,{...tr,enabled:false});
    assert.ok(!disabled.includes('id="tc-faq"'));
    const malicious=faq.exports.applyHomepageFaq(fixture,{...tr,items:[{id:'attack',question:'<script>alert(1)</script>',answer:'<img onerror=alert(1)>'}]});
    assert.ok(malicious.includes('&lt;script&gt;'));
    assert.ok(!malicious.includes('<script>alert(1)</script>'));
    assert.ok(!malicious.includes('<img onerror='));
    console.log('PASS: FAQ uses real CMS translations, cleans old template entries, escapes HTML and respects disabled status');
  }finally{
    global.fetch=previousFetch;
    if(oldApi===undefined)delete process.env.API_ORIGIN;else process.env.API_ORIGIN=oldApi;
  }
}
run().catch(e=>{console.error(e);process.exitCode=1});
