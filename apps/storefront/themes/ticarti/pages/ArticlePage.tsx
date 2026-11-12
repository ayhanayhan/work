'use client';

import {useStorefrontTheme} from '../../../components/StorefrontThemeContext';
import {articleUrl,systemUrl} from '../../../lib/seo-route-contract';

import Link from 'next/link';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useParams} from 'next/navigation';
import ProductCard from '../components/ProductCard';
import {api,getCurrency,getLocale,STORE,sfText} from '../../sdk/storefront';

export default function BlogDetailPage(){
  const {boot}=useStorefrontTheme();const store=boot?.store||{};const routing=store.settings?.seoAdvanced?.urlRouting;const loc=store.locale||'tr';const blogUrl=systemUrl(routing,'blog',loc,loc);const postUrl=(p:any)=>articleUrl(routing,p.slug,loc,loc,p.category?.slug||'');
  const params=useParams();const slug=String(Array.isArray(params?.slug)?params.slug[0]:params?.slug||'');
  const[post,setPost]=useState<any>(null);const[customer,setCustomer]=useState<any>(null);const[error,setError]=useState('');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');
  async function load(){if(!slug)return;setError('');try{const p=await api(`/storefront/${STORE}/blog/posts/${encodeURIComponent(slug)}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`);setPost(p)}catch(e:any){setError(e.message||'Yazı yüklenemedi')}}
  useEffect(()=>{void load();api('/storefront/customer/me').then(setCustomer).catch(()=>setCustomer(null))},[slug]);
  const canComment=!!post?.commentSettings?.enabled;const allowGuest=post?.commentSettings?.allowGuest!==false;
  const related=useMemo(()=>Array.isArray(post?.products)?post.products.map((x:any)=>x.product).filter(Boolean):[],[post]);const relatedPosts=useMemo(()=>Array.isArray(post?.relatedPosts)?post.relatedPosts:[],[post]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!post)return;setBusy(true);setMsg('');setError('');const f=new FormData(e.currentTarget);const body=String(f.get('body')||'').trim();try{if(customer){await api('/storefront/customer/blog-comments',{method:'POST',body:JSON.stringify({postId:post.id,body})})}else{await api(`/storefront/${STORE}/blog/posts/${encodeURIComponent(slug)}/comments`,{method:'POST',body:JSON.stringify({authorName:String(f.get('authorName')||''),authorEmail:String(f.get('authorEmail')||''),body})})}setMsg(post.commentSettings?.autoApprove?'Yorumunuz yayınlandı.':'Yorumunuz onaya gönderildi.');(e.currentTarget as HTMLFormElement).reset();if(post.commentSettings?.autoApprove)await load()}catch(x:any){setError(x.message||'Yorum gönderilemedi')}finally{setBusy(false)}}
  if(error&&!post)return <main className="container section"><div className="error">{error}</div><p><Link href={blogUrl}>{sfText('deep.final2.212')}</Link></p></main>;
  if(!post)return <main className="container section">{sfText('deep.final2.213')}</main>;
  return <main className="container section blog-detail">
    <div className="blog-detail-head"><Link href={blogUrl} className="blog-back">← Blog</Link>{post.category&&<Link className="blog-category-link" href={blogUrl+'?category='+post.category.slug}>{post.category.title}</Link>}<h1>{post.title}</h1>{post.excerpt&&<p className="blog-lead">{post.excerpt}</p>}<div className="blog-detail-meta"><span>{post.publishedAt?new Date(post.publishedAt).toLocaleDateString(getLocale(),{year:'numeric',month:'long',day:'numeric'}):''}</span>{post.author&&<span><Link href={blogUrl+'/authors/'+post.author.slug}>{post.author.name}</Link></span>}<span>{post.readingTime||1} dk okuma</span>{Array.isArray(post.tags)&&post.tags.length>0&&<span>{post.tags.join(' · ')}</span>}</div></div>
    {post.featuredImageUrl&&<img className="blog-cover" src={post.featuredImageUrl} alt={post.title}/>} 
    <article className="blog-content" dangerouslySetInnerHTML={{__html:String(post.body||'')}}/>
    {related.length>0&&<section className="blog-related"><div className="blog-section-title"><div><span className="blog-kicker">{sfText('deep.final2.214')}</span><h2>{sfText('deep.final2.215')}</h2></div><Link href="/products">{sfText('deep.final2.216')}</Link></div><div className="grid">{related.map((p:any)=><ProductCard key={p.id} p={p} currency={p.displayCurrency||getCurrency()}/>)}</div></section>}
    {relatedPosts.length>0&&<section className="blog-related"><div className="blog-section-title"><div><span className="blog-kicker">BLOG</span><h2>İlgili yazılar</h2></div></div><div className="blog-grid">{relatedPosts.map((p:any)=><article className="blog-card" key={p.id}>{p.featuredImageUrl&&<Link href={postUrl(p)} className="blog-card-media"><img src={p.featuredImageUrl} alt={p.title}/></Link>}<div className="blog-card-body"><h2><Link href={postUrl(p)}>{p.title}</Link></h2>{p.excerpt&&<p>{p.excerpt}</p>}</div></article>)}</div></section>}
    <section className="blog-comments"><div className="blog-section-title"><div><span className="blog-kicker">YORUMLAR</span><h2>{post.comments?.length||0} yorum</h2></div></div>{Array.isArray(post.comments)&&post.comments.length>0?<div className="blog-comment-list">{post.comments.map((c:any)=><div className="blog-comment" key={c.id}><div><strong>{c.authorName}</strong><span>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</span></div><p>{c.body}</p></div>)}</div>:<p className="muted">{sfText('deep.final2.217')}</p>}
      {canComment?<>{msg&&<div className="notice">{msg}</div>}{error&&<div className="error">{error}</div>}{customer||allowGuest?<form className="blog-comment-form" onSubmit={submit}>{!customer&&<div className="form-grid"><label className="field"><span>{sfText('deep.final2.218')}</span><input name="authorName" required/></label><label className="field"><span>E-posta</span><input name="authorEmail" type="email"/></label></div>}<label className="field"><span>Yorumunuz</span><textarea name="body" rows={5} minLength={2} required/></label><button className="btn" disabled={busy}>{busy?sfText('deep.final2.004'):sfText('deep.final2.219')}</button></form>:<div className="notice">{sfText('deep.final2.220')} <Link href={systemUrl(routing,'account',loc,loc)}><b>{sfText('deep.final2.221')}</b></Link>.</div>}</>:<div className="notice">{sfText('deep.final2.222')}</div>}
    </section>
  </main>;
}
