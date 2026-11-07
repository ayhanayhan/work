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
  const category={
    id:'cat-guides',parentId:null,isActive:true,
    translations:{tr:{title:'Rehberler',slug:'rehberler'},en:{title:'Guides',slug:'guides'}}
  };
  const withCategory={...both,status:'PUBLISHED',categoryId:'cat-guides'};
  const categorized=await svc.updateBlog({version:4,posts:[withCategory],categories:[category]});
  assert.equal(categorized.categories.length,1,'Categories must be saved alongside posts');
  assert.equal((await svc.publicBlog('tr')).posts[0].category,'Rehberler');
  assert.equal((await svc.publicBlog('tr')).posts[0].categoryId,'cat-guides');
  assert.equal((await svc.publicBlog('en')).posts[0].category,'Guides');
  await assert.rejects(svc.updateBlog({version:5,posts:[withCategory],categories:[]}),
    'Cannot delete a category referenced by an article');
  const afterCategoryEdit=await svc.updateBlog({version:5,posts:[withCategory],
    categories:[{...category,translations:{...category.translations,tr:{title:'Eğitim',slug:'egitim'}}}]});
  assert.equal(afterCategoryEdit.posts.length,1,'Editing a category must preserve articles');
  assert.equal((await svc.publicBlog('tr')).posts[0].category,'Eğitim');
  assert.equal((await svc.blog()).categories.length,1);
  const related={
    ...post,id:'related-post',slug:'ilgili-yazi',status:'PUBLISHED',
    translations:{tr:{title:'İlgili makale',content:'İçerik'}}
  };
  const enhanced={
    ...withCategory,tags:['e-ticaret','rehber'],relatedPostIds:[related.id],
    isFeatured:true,ogImage:'https://cdn.example.com/og.webp',
    canonicalUrl:'https://ticarti.com/blog/ornek-yazi',noIndex:true,
    scheduledAt:new Date(Date.now()+86_400_000).toISOString()
  };
  const scheduled=await svc.updateBlog({version:6,posts:[enhanced,related],
    categories:afterCategoryEdit.categories});
  assert.equal(scheduled.posts.length,2);
  assert.deepEqual(scheduled.posts[0].tags,['e-ticaret','rehber']);
  assert.equal(scheduled.posts[0].ogImage,enhanced.ogImage);
  assert.equal(scheduled.posts[0].noIndex,true);
  assert.deepEqual(scheduled.posts[0].relatedPostIds,[related.id]);
  assert.equal((await svc.publicBlog('tr')).posts.length,1,'Future publication is hidden');
  assert.equal((await svc.publicBlog('tr')).posts[0].slug,'ilgili-yazi');
  await assert.rejects(svc.updateBlog({version:7,posts:[{...enhanced,relatedPostIds:['missing']}],
    categories:afterCategoryEdit.categories}),'Unknown related posts must fail validation');
  const translatedPost={
    ...enhanced,scheduledAt:null,
    translations:{
      tr:{title:'Türkçe makale',slug:'ornek-yazi',content:'İçerik'},
      en:{title:'English article',slug:'english-article',content:'English content'}
    }
  };
  const localized=await svc.updateBlog({version:7,posts:[translatedPost,related],
    categories:afterCategoryEdit.categories});
  assert.equal(localized.posts[0].translations.en.slug,'english-article');
  assert.equal((await svc.publicBlog('tr')).posts.find(p=>p.id===translatedPost.id)?.slug,'ornek-yazi');
  const englishLocalized=(await svc.publicBlog('en')).posts[0];
  assert.equal(englishLocalized.slug,'english-article');
  assert.equal(englishLocalized.localeSlugs.tr,'ornek-yazi');
  assert.equal(englishLocalized.localeSlugs.en,'english-article');
  assert.equal((await svc.publicBlogPost('english-article','en'))?.id,translatedPost.id);
  // The exact same platform settings control the superadmin locale endpoint
  // and public CMS publishing. Inactive translations remain stored.
  store.set('general',{locales:[
    {locale:'tr',label:'Türkçe',isActive:true,isDefault:true},
    {locale:'de',label:'Deutsch',isActive:true,isDefault:false},
    {locale:'en',label:'English',isActive:false,isDefault:false}
  ]});
  const germanPost={...related,id:'german-post',slug:'deutscher-beitrag',
    translations:{de:{title:'Deutscher Beitrag',content:'Echter Inhalt'},
      en:{title:'Previously translated',content:'Kept but disabled'}}};
  const live=await svc.updateBlog({version:8,posts:[germanPost],
    categories:afterCategoryEdit.categories});
  assert.equal(live.posts[0].translations.en.title,'Previously translated');
  assert.equal((await svc.publicBlog('de')).posts[0].title,'Deutscher Beitrag');
  assert.equal((await svc.publicBlog('en')).posts.length,0,'Disabled platform language must not publish');
  assert.deepEqual((await svc.publicBlog('de')).posts[0].availableLocales,['de']);
  // Marketing homepage selected modules: localized hero CTA, KVKK mapping,
  // repeatable references/logos, and category selection live in Prisma settings.
  const emptyHome=await svc.home();
  assert.equal(emptyHome.version,0);
  const contractSettings={contracts:[{key:'KVKK_NOTICE',contentKey:'kvkk-notice',isActive:true,placements:['REGISTER_KVKK']}]};
  store.set('platform_contracts',contractSettings);
  const heroSaved=await svc.updateModule('hero',{version:0,enabled:true,ctaEnabled:false,
    fields:{heading:{tr:'Mağazanı kur'},button:{tr:'Başla'},buttonUrl:{tr:'/paketler.html'},phoneEmpty:{tr:'Telefon gerekli'}},
    items:[{id:'reference-1',enabled:true,fields:{heading:{tr:'Örnek mağaza'},description:{tr:'Referans açıklaması'}},
      assets:{image:'/assets/images/test.png',logo:'/assets/images/test-logo.png'},storeId:''}],
    logos:[{id:'logo-1',enabled:true,fields:{title:{tr:'Örnek marka'}},assets:{image:'/assets/images/test-logo.png'},storeId:''}]
  });
  assert.equal(heroSaved.module.ctaEnabled,false);
  assert.equal(heroSaved.module.items[0].assets.logo,'/assets/images/test-logo.png');
  assert.equal(heroSaved.module.logos[0].fields.title.tr,'Örnek marka');
  assert.equal((await svc.publicHome('tr')).consentContract.href,'/kvkk.html');
  const blogHome=await svc.updateModule('blog',{version:1,enabled:true,fields:{heading:{tr:'Makaleler'}},
    categoryIds:['cat-guides'],items:[]});
  assert.deepEqual(blogHome.module.categoryIds,['cat-guides']);
  assert.deepEqual((await svc.publicHome('tr')).modules.find((x:any)=>x.id==='blog').categoryIds,['cat-guides']);
  // FAQ uses the homepage CMS module, never a second seeded datastore.
  const faqSaved=await svc.updateModule('faq',{version:2,enabled:true,fields:{
    heading:{tr:'Sıkça Sorulan Sorular',de:'Häufige Fragen'}
  },items:[{id:'faq-1',enabled:true,fields:{
    question:{tr:'Nasıl başlarım?',de:'Wie beginne ich?'},
    answer:{tr:'Hesabını oluştur.',de:'Erstelle ein Konto.'}
  }}]});
  assert.equal(faqSaved.module.items.length,1);
  assert.equal((await svc.publicFaq('de')).items[0].fields.question.de,'Wie beginne ich?');
  assert.equal((await svc.publicFaq('en')).enabled,false,'Inactive language cannot publish FAQ');
  await svc.updateModule('faq',{version:3,enabled:false,fields:faqSaved.module.fields,items:faqSaved.module.items});
  assert.equal((await svc.publicFaq('tr')).enabled,false,'Disabled FAQ module stays disabled in public endpoint');
  const author={
    id:'author-1',slug:'ticarti-uzmani',avatar:'https://example.com/avatar.webp',isActive:true,
    socials:{linkedin:'https://www.linkedin.com/in/ticarti'},translations:{
      tr:{name:'Ticarti Uzmanı',bio:'E-ticaret uzmanı',seoTitle:'Uzman',seoDescription:'Yazar profili'},
      de:{name:'Ticarti Fachperson',bio:'E-Commerce Spezialist',seoTitle:'Experte',seoDescription:'Autorprofil'}
    }
  };
  const authored=await svc.updateBlog({version:9,posts:[{...germanPost,authorId:author.id}],
    categories:afterCategoryEdit.categories,authors:[author]});
  assert.equal(authored.authors.length,1,'Author record persisted in same blog snapshot');
  const germanArticle=(await svc.publicBlog('de')).posts[0];
  assert.equal(germanArticle.author?.name,'Ticarti Fachperson');
  assert.equal(germanArticle.author?.bio,'E-Commerce Spezialist');
  assert.equal(germanArticle.author?.socials.linkedin,author.socials.linkedin);
  assert.equal(germanArticle.excerpt,'Echter Inhalt','Public summary derives from actual content');
  await assert.rejects(svc.updateBlog({version:10,posts:[{...germanPost,authorId:author.id}],
    categories:afterCategoryEdit.categories,authors:[]}),
    'Deleting an author referenced by a post must fail');
  const oldHome=await svc.home();
  const ids=oldHome.modules.map(m=>m.id).reverse();
  const ordered=await svc.reorderHome({version:oldHome.version,ids});
  assert.deepEqual(ordered.modules.map(x=>x.id),ids,'New order must be saved');
  assert.deepEqual((await svc.publicHome('tr')).modules.map(x=>x.id),ids.filter(id=>id!=='faq'),
    'Public React homepage receives saved order and excludes disabled sections');
  await assert.rejects(svc.reorderHome({version:oldHome.version,ids}),
    'Concurrent module ordering must reject stale versions');
  console.log('PASS: active locales, blog authors, persisted native homepage ordering, FAQ and SEO');
}
test().catch(e=>{console.error(e);process.exitCode=1});
