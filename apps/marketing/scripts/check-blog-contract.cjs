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
  const advanced=blog.renderBlogContent([
    '# Başlık 1','', '###### Başlık 6','',
    '| Özellik | Değer |','| --- | --- |','| API | Aktif |','',
    '> Alıntı','',
    '```html','<script>alert(1)</script>','```','',
    '![](https://example.com/image.png)','', '---','',
    '`let x = 1`'
  ].join('\\n'));
  assert.ok(advanced.includes('<h1>Başlık 1</h1>'),'H1 must render');
  assert.ok(advanced.includes('<h6>Başlık 6</h6>'),'H6 must render');
  assert.ok(advanced.includes('<table>')&&advanced.includes('<td>Aktif</td>'),'Tables must render');
  assert.ok(advanced.includes('<blockquote>Alıntı</blockquote>'),'Quotes must render');
  assert.ok(advanced.includes('<pre data-language="html"><code>'),'Fenced code block must render');
  assert.ok(advanced.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),'Code must be escaped');
  assert.ok(!advanced.includes('<script>'),'Executable HTML must never be emitted');
  assert.ok(advanced.includes('<figure><img'),'Safe image must render');
  assert.ok(advanced.includes('<hr/>'),'Horizontal rule must render');
  assert.ok(advanced.includes('<code>let x = 1</code>'),'Inline code must render');
  console.log('PASS: no seed fallback; advanced headings, tables, images, safe code blocks and routes');
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{
  if(previousApi===undefined)delete process.env.API_ORIGIN;
  else process.env.API_ORIGIN=previousApi;
  global.fetch=previousFetch;
});
