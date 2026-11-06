const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');

const source=path.resolve(__dirname,'../lib/blog.ts');
const transpiled=ts.transpileModule(fs.readFileSync(source,'utf8'),{
  fileName:source,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
});
const loaded=new Module(source,module);
loaded.filename=source;loaded.paths=Module._nodeModulePaths(path.dirname(source));
loaded._compile(transpiled.outputText,source);
const blog=loaded.exports;
const previousApi=process.env.API_ORIGIN;
const previousFetch=global.fetch;

async function run(){
  process.env.API_ORIGIN='';
  assert.deepEqual(await blog.getBlogPosts('tr'),[],'No fake seeded posts without CMS');
  process.env.API_ORIGIN='https://example.invalid';
  global.fetch=async url=>{
    const lang=new URL(url).searchParams.get('lang');
    return {ok:true,json:async()=>({version:1,posts:lang==='en'?[{
      slug:'english-only',status:'PUBLISHED',title:'English only',content:'## Hello\n\nContent',
      excerpt:'An excerpt',category:'Guides',availableLocales:['en'],featuredImage:''
    }]:[]})};
  };
  assert.deepEqual(await blog.getBlogPosts('tr'),[],'No TR content if only EN exists');
  assert.equal((await blog.getBlogPosts('en')).length,1);
  assert.deepEqual(await blog.getBlogPosts('pt'),[]);
  assert.equal(blog.blogPath('tr','test'),'/blog/test');
  assert.equal(blog.blogPath('en','test'),'/en/blog/test');
  const markup=blog.renderBlogContent('<script>alert(1)</script>\n\n## Hello\n\n- item\n- another');
  assert.ok(!markup.includes('<script>'),'Stored HTML must not execute');
  assert.ok(markup.includes('&lt;script&gt;'));
  assert.ok(markup.includes('<h2>Hello</h2>'));
  assert.ok(markup.includes('<ul>'));
  console.log('PASS: no seed fallback; strict locale-only posts; safe blog content and routes');
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{
  if(previousApi===undefined)delete process.env.API_ORIGIN;
  else process.env.API_ORIGIN=previousApi;
  global.fetch=previousFetch;
});
