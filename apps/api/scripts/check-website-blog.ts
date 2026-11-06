import assert from 'node:assert/strict';
import {WebsiteService} from '../src/website/website.service';

const store=new Map<string,any>();
const prisma={platformSetting:{
  async findUnique({where:{key}}:any){return store.has(key)?{value:structuredClone(store.get(key))}:null},
  async upsert({where:{key},create,update}:any){const value=store.has(key)?update.value:create.value;store.set(key,structuredClone(value));return {value}}
}};
const svc=new WebsiteService(prisma as any);
const post={
  id:'example',slug:'ornek-yazi',status:'PUBLISHED',featuredImage:'',authorName:'Ticarti',
  translations:{
    tr:{title:'Türkçe makale',content:'Türkçe içerik',excerpt:'TR'},
    en:{title:'English article',content:'',excerpt:'EN'},
    ru:{title:'Статья',content:'Текст',enabled:false}
  }
};
async function test(){
  const created=await svc.updateBlog({version:0,posts:[post]});
  assert.equal(created.version,1);
  assert.equal((await svc.publicBlog('tr')).posts.length,1);
  assert.equal((await svc.publicBlog('en')).posts.length,0,'Incomplete English article must not appear');
  assert.equal((await svc.publicBlog('ru')).posts.length,0,'Disabled Russian article must not appear');
  assert.equal((await svc.publicBlog('bg')).posts.length,0,'Unsupported locale must not return Turkish');
  assert.deepEqual((await svc.publicBlog('tr')).posts[0].availableLocales,['tr']);
  assert.equal((await svc.publicBlogPost('ornek-yazi','en')),null);
  assert.ok(created.posts[0].publishedAt,'Publication date must be stored');

  const englishOnly={
    ...post,translations:{
      tr:{title:'',content:''},
      en:{title:'English-only article',content:'English content',excerpt:'English'}
    }
  };
  await svc.updateBlog({version:1,posts:[englishOnly]});
  assert.equal((await svc.publicBlog('tr')).posts.length,0,'No TR fallback allowed');
  const english=(await svc.publicBlog('en')).posts;
  assert.equal(english.length,1);
  assert.deepEqual(english[0].availableLocales,['en']);
  assert.equal(english[0].title,'English-only article');

  const both={...englishOnly,translations:{
    tr:{title:'Türkçe başlık',content:'Türkçe içerik'},
    en:{title:'English-only article',content:'English content'}
  }};
  await svc.updateBlog({version:2,posts:[both]});
  assert.deepEqual((await svc.publicBlog('tr')).posts[0].availableLocales,['tr','en']);
  assert.deepEqual((await svc.publicBlog('en')).posts[0].availableLocales,['tr','en']);

  await svc.updateBlog({version:3,posts:[{...both,status:'DRAFT'}]});
  assert.equal((await svc.publicBlog('tr')).posts.length,0,'Draft must be hidden');
  assert.equal((await svc.publicBlog('en')).posts.length,0,'Draft must be hidden');
  await assert.rejects(svc.updateBlog({version:4,posts:[{...post,translations:{en:{title:'Only title'}}}]}));
  console.log('PASS: blog language isolation, publishing, dates, drafts and SEO alternate locales');
}
test().catch(e=>{console.error(e);process.exitCode=1});
