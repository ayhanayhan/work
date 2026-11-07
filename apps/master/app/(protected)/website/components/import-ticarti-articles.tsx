'use client';
import {useRef,useState,type ChangeEvent} from 'react';
import {FileUp,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useMasterSession} from '@/app/components/MasterSession';

type Translation=Record<string,string|boolean>;
type Article={category:string;slug:string;translations:Record<string,Translation>};
type Category={id:string;parentId?:string|null;isActive?:boolean;translations:Record<string,Record<string,string>>};
type Bundle={schema:string;articles:Article[];categories:Category[]};
const locales=['tr','en','de','ru','ar'];
const fields=['title','slug','description','seoTitle','seoDescription'];
const categoryMap:Record<string,string>={
  'E-Ticaret':'e-ticaret','Dijital Pazarlama':'dijital-pazarlama',
  'Pazaryerleri':'pazaryerleri','Kargo ve Lojistik':'kargo-ve-lojistik',
  'Ödeme Sistemleri':'odeme-sistemleri','Vergi ve Yasal Süreçler':'vergi-ve-yasal-surecler',
  'Girişimcilik':'girisimcilik','Ticarti Haberleri':'ticarti-haberleri'
};
/** Temporary one-time import. Remove this component after the initial content is imported. */
export default function ImportTicartiArticles({onDone}:{onDone:()=>Promise<void>}){
 const {request,restoring}=useMasterSession();
 const fileRef=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const handle=async(event:ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file)return;
  setBusy(true);setError('');setMessage('');
  try{
   const bundle=JSON.parse(await file.text()) as Bundle;
   if(bundle.schema!=='ticarti-blog-import-v1'||bundle.articles?.length!==10||bundle.categories?.length!==8||
     bundle.articles.some(a=>!locales.every(l=>a.translations?.[l]?.title&&a.translations?.[l]?.content))||
     bundle.categories.some(c=>!locales.every(l=>c.translations?.[l]?.title&&c.translations?.[l]?.slug))){
     throw new Error('Lütfen Ticarti paketindeki ticarti-import-data.json dosyasını seçin.');
   }
   const current=await request('/superadmin/website/blog');
   if(!Number.isFinite(current.version)||!Array.isArray(current.posts)||!Array.isArray(current.categories))throw new Error('Blog kayıtları yüklenemedi.');
   const posts=structuredClone(current.posts) as any[],categories=structuredClone(current.categories) as any[];
   const categoryIds:Record<string,string>={};
   let addedPosts=0,addedCategories=0,completed=0;
   const norm=(s:unknown)=>String(s||'').trim().toLocaleLowerCase('tr');
   for(const seed of bundle.categories){
    let existing=categories.find(c=>c.id===seed.id||norm(c.translations?.tr?.slug)===norm(seed.translations.tr.slug));
    if(!existing){
     existing={...seed,parentId:seed.parentId||null,isActive:seed.isActive!==false,sortOrder:categories.length};
     categories.push(existing);addedCategories++;
    }else{
     for(const locale of locales){
      const from=seed.translations[locale],to={...(existing.translations?.[locale]||{})};
      for(const key of fields)if(!String(to[key]||'').trim()&&from[key])to[key]=from[key];
      existing.translations={...existing.translations,[locale]:to};
     }
    }
    categoryIds[seed.translations.tr.slug]=existing.id;
   }
   for(const source of bundle.articles){
    const old=posts.find(p=>p.slug===source.slug||p.translations?.tr?.slug===source.slug);
    if(old){
     for(const locale of locales)if(!old.translations?.[locale]?.title&&source.translations[locale]){
      old.translations={...old.translations,[locale]:source.translations[locale]};
      completed++;
     }
     continue;
    }
    const categoryId=categoryIds[categoryMap[source.category]];
    if(!categoryId)throw new Error('Kategori eşleştirmesi yapılamadı: '+source.category);
    posts.push({id:'ticarti-article-'+source.slug,slug:source.slug,status:'DRAFT',categoryId,
      authorId:null,authorName:'Ticarti',featuredImage:'',isFeatured:false,tags:[],relatedPostIds:[],
      scheduledAt:null,ogImage:'',canonicalUrl:'',noIndex:false,translations:source.translations});
    addedPosts++;
   }
   if(!addedPosts&&!addedCategories&&!completed){
    setMessage('10 makale zaten mevcut. Yeni kopya oluşturulmadı.');
    return;
   }
   const summary=addedPosts+' yeni makale, '+addedCategories+' yeni kategori, '+completed+' tamamlanan çeviri.';
   if(!window.confirm(summary+'\\n\\nMakaleler taslak kaydedilecek, mevcut yazıların içeriği korunacak. Devam edilsin mi?'))return;
   await request('/superadmin/website/blog',{
    method:'PATCH',
    body:JSON.stringify({version:current.version,posts,categories,authors:current.authors||[]})
   });
   setMessage('Aktarım tamamlandı: '+summary);
   await onDone();
  }catch(e:any){setError(e?.message||'Aktarım başarısız.')}finally{setBusy(false)}
 };
 return <div className="flex flex-col items-end gap-1">
  <input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={e=>void handle(e)}/>
  <Button type="button" variant="outline" disabled={busy||restoring} onClick={()=>fileRef.current?.click()}>
   {busy?<LoaderCircle className="size-4 animate-spin"/>:<FileUp className="size-4"/>}10 Makaleyi Ekle
  </Button>
  {error?<span role="alert" className="max-w-sm text-right text-xs text-destructive">{error}</span>:null}
  {message?<span role="status" className="max-w-sm text-right text-xs text-muted-foreground">{message}</span>:null}
 </div>;
}
