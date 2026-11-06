import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
const list=read('templates/en/blog/index.html');
const article=read('templates/en/blog/post.html');
const home=read('templates/en/index.html');
const original=read('templates/en/success-stories/index.html');
assert.ok(list.includes('tc-vendor-theme')&&list.includes('tc-vendor-casos-hero'),'Story theme classes must survive');
assert.ok(article.includes('tc-vendor-theme')&&article.includes('onecolumn-content-section'),'Crowdy layout must survive');
assert.ok(!list.includes('tc-page-corporate-blog'),'Broken styling class must not be used');
assert.ok(!list.includes('tc-stories-hero-logos'),'Foreign logo rail must not appear in blog');
assert.ok(list.includes('TICARTI_BLOG_CARDS_START')&&article.includes('TICARTI_POST_CONTENT'),'SSR markers required');
assert.ok(home.includes('tc-blog__track')&&home.includes('tc-faq'),'Original homepage required');
assert.ok(original.includes('tc-stories-exito-main-section-module-9'),'Original story template required');
const scripts=[...home.matchAll(/<script\s+[^>]*src="([^"]+)"/g)].map(x=>x[1]);
for(const src of scripts){const clean=src.split('?')[0];const path=clean.replace(/^\.\.\/assets\//,'public/assets/');if(!path.includes('://'))assert.ok(statSync(join(root,path)).isFile(),`Missing script: ${src}`);}
const posts=JSON.parse(read('public/assets/data/blog-posts.json')).posts;
assert.equal(posts.length,6);
for(const p of posts){assert.ok(p.slug&&p.title&&p.cover);assert.ok(statSync(join(root,'public/assets/images/blog/'+p.cover+'.svg')).isFile());}
const allAssetFiles=[];function walk(dir){for(const name of readdirSync(dir)){const p=join(dir,name);if(statSync(p).isDirectory())walk(p);else allAssetFiles.push(p)}}walk(join(root,'public/assets'));
assert.ok(allAssetFiles.length>=60,'Source assets incomplete');
console.log('OK: unchanged homepage assets, Story CSS classes, Crowdy layout, six blog posts, original scripts and '+allAssetFiles.length+' assets');
