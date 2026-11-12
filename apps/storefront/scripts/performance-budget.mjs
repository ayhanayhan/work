import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.cwd(),'.next/static');
if(!fs.existsSync(root)){console.error('[storefront-budget] .next/static bulunamadı');process.exit(1)}
const files=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push({path:p,size:fs.statSync(p).size})}};walk(root);
const js=files.filter(x=>x.path.endsWith('.js')),css=files.filter(x=>x.path.endsWith('.css'));const total=a=>a.reduce((n,x)=>n+x.size,0);const max=a=>a.reduce((m,x)=>Math.max(m,x.size),0);
const limits={jsTotal:Number(process.env.STOREFRONT_BUDGET_JS_TOTAL||2_500_000),jsChunk:Number(process.env.STOREFRONT_BUDGET_JS_CHUNK||750_000),cssTotal:Number(process.env.STOREFRONT_BUDGET_CSS_TOTAL||500_000),staticTotal:Number(process.env.STOREFRONT_BUDGET_STATIC_TOTAL||6_000_000)};
const stats={jsTotal:total(js),largestJs:max(js),cssTotal:total(css),staticTotal:total(files),jsChunks:js.length,cssFiles:css.length};const failures=[];
if(stats.jsTotal>limits.jsTotal)failures.push(`JS toplam ${stats.jsTotal} > ${limits.jsTotal}`);if(stats.largestJs>limits.jsChunk)failures.push(`En büyük JS ${stats.largestJs} > ${limits.jsChunk}`);if(stats.cssTotal>limits.cssTotal)failures.push(`CSS toplam ${stats.cssTotal} > ${limits.cssTotal}`);if(stats.staticTotal>limits.staticTotal)failures.push(`Static toplam ${stats.staticTotal} > ${limits.staticTotal}`);
console.log('[storefront-budget]',JSON.stringify({stats,limits},null,2));if(failures.length){for(const x of failures)console.error('FAIL',x);process.exit(1)}console.log('Ticarti storefront performance budget: OK');
