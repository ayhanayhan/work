import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..');
let ts;try{ts=createRequire(import.meta.url)('typescript')}catch{throw new Error('TypeScript not installed. Run npm install first.')}
const scratch=path.join(root,'.cms-test');fs.mkdirSync(scratch,{recursive:true});
const mock='module.exports={notFound(){throw Error("NEXT_NOT_FOUND")}}';fs.writeFileSync(path.join(scratch,'next-mock.cjs'),mock);
for(const name of ['blog','page-content','legacy']){
 const source=fs.readFileSync(path.join(root,'lib',name+'.ts'),'utf8');
 let compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;
 compiled=compiled.replaceAll('require("./blog")','require("./blog.cjs")').replaceAll('require("./page-content")','require("./page-content.cjs")').replaceAll('require("next/navigation")','require("./next-mock.cjs")').replaceAll('require("../public/assets/data/page-fields.json")',`require(${JSON.stringify(path.join(root,'public/assets/data/page-fields.json'))})`);
 fs.writeFileSync(path.join(scratch,name+'.cjs'),compiled);
}
const require=createRequire(import.meta.url);const {renderPage}=require(path.join(scratch,'legacy.cjs'));
const current=process.cwd();process.chdir(root);
try{
 for(const segments of [[],['en'],['tr'],['pt','index.html'],['paketler.html'],['en','paketler.html'],['en','paketler'],['en','blog'],['en','blog','index.html'],['blog','index.html'],['blog','e-ticaret-sitesi-kurma-rehberi'],['en','blog','e-ticaret-sitesi-kurma-rehberi.html'],['tr','blog','e-ticaret-sitesi-kurma-rehberi'],['en','success-stories'],['en','success-stories','crowdy.html'],['en','companies','enterprise'],['en','contacto'],['en','register.html'],['en','login.html'],['en','kvkk.html'],['en','uyelik-sozlesmesi.html']]){
  const page=await renderPage(segments,{});
  if(page.html.includes('TICARTI_BLOG_')||page.html.includes('TICARTI_POST_'))throw Error('Unresolved blog markers: '+segments.join('/'));
  if(page.html.includes('src="../assets')||page.html.includes('src="../../assets'))throw Error('Relative image left behind: '+segments.join('/'));
  if(page.html.includes('href="../assets'))throw Error('Relative asset hyperlink left behind: '+segments.join('/'));
  if(page.classes.length<8)throw Error('Missing document classes: '+segments.join('/'));
  if(page.isBlogList&&!page.html.includes('tc-blog-cards'))throw Error('Missing blog cards');
  if(segments.join('/').includes('blog/e-ticaret')&&!page.html.includes('Bir e-ticaret mağazasına başlamanın ilk adımı'))throw Error('Article body missing');
  console.log('OK /'+segments.join('/')+'  '+page.title.slice(0,24));
 }
 const bads=[['bad html',{'h1-1':'<script>alert(1)</script>'}],['text',{'h1-1':'Test'}]];
 const {applyPageValues}=require(path.join(scratch,'page-content.cjs'));
 const raw=fs.readFileSync(path.join(root,'templates/en/index.html'),'utf8');
 const used=JSON.parse(fs.readFileSync(path.join(root,'public/assets/data/page-fields.json'),'utf8')).pages[0].fields.find(x=>x.type==='text');
 const escaped=applyPageValues(raw,{[used.id]:'<script>NOT_EXECUTE</script>'},'home');
 if(escaped.includes('<script>NOT_EXECUTE</script>'))throw Error('XSS unescaped');
 if(!escaped.includes('&lt;script&gt;NOT_EXECUTE&lt;/script&gt;'))throw Error('XSS did not change text');
 console.log('OK: escaped dynamic HTML content');
}finally{process.chdir(current);fs.rmSync(scratch,{recursive:true,force:true});}
