'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {api,STORE} from '../../lib/api';

type Category={id:string;title:string;slug:string;description?:string|null;imageUrl?:string|null;parentId?:string|null};
type Post={id:string;title:string;slug:string;excerpt?:string|null;featuredImageUrl?:string|null;publishedAt?:string|null;category?:{id:string;title:string;slug:string}|null;_count?:{comments:number}};

export default function BlogPage(){
  const[categories,setCategories]=useState<Category[]>([]);const[items,setItems]=useState<Post[]>([]);const[category,setCategory]=useState('');const[query,setQuery]=useState('');const[draft,setDraft]=useState('');const[page,setPage]=useState(1);const[pages,setPages]=useState(1);const[total,setTotal]=useState(0);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  useEffect(()=>{const p=new URLSearchParams(window.location.search);setCategory(p.get('category')||'');setDraft(p.get('q')||'');setQuery(p.get('q')||'')},[]);
  useEffect(()=>{api(`/storefront/${STORE}/blog/categories`).then((x:any)=>setCategories(Array.isArray(x)?x:[])).catch(()=>{})},[]);
  useEffect(()=>{let live=true;setLoading(true);setError('');const sp=new URLSearchParams({page:String(page),limit:'12'});if(category)sp.set('category',category);if(query)sp.set('q',query);api(`/storefront/${STORE}/blog/posts?${sp.toString()}`).then((x:any)=>{if(!live)return;setItems(Array.isArray(x.items)?x.items:[]);setPages(Math.max(1,Number(x.pages||1)));setTotal(Number(x.total||0))}).catch((e:any)=>{if(live)setError(e.message||'Blog yüklenemedi')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[category,query,page]);
  const activeTitle=useMemo(()=>categories.find(x=>x.slug===category)?.title,[categories,category]);
  function applySearch(e:FormEvent){e.preventDefault();setPage(1);setQuery(draft.trim())}
  function selectCategory(slug:string){setCategory(slug);setPage(1)}
  return <main id="theme-section-ticarti-blog" data-section-name="main-blog"><div className="page-width top-spacing-small">
    <div className="section-header__container page-grid-2 page-grid-sp-1"><div><span className="body3 text-uppercase">BLOG</span><h1>{activeTitle||'İlham, rehberler ve mağaza haberleri'}</h1><p>{activeTitle?'Bu kategorideki yayınları keşfedin.':'Ürünler, trendler ve alışveriş deneyimi hakkında güncel içerikler.'}</p></div><form className="field field-with-icon" onSubmit={applySearch}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Blogda ara..."/><button className="btn">Ara</button></form></div>
    <div className="display-flex flex-wrap gap10 mt30"><button className={'btn btn--small '+(!category?'active':'')} onClick={()=>selectCategory('')}>Tümü</button>{categories.map(c=><button key={c.id} className={'btn btn--small '+(category===c.slug?'active':'')} onClick={()=>selectCategory(c.slug)}>{c.title}</button>)}</div>
    <div className="body3 mt30 display-flex justify-content-between"><span>{loading?'Yükleniyor…':`${total} yazı`}</span>{query&&<button className="blog-clear" onClick={()=>{setDraft('');setQuery('');setPage(1)}}>Aramayı temizle</button>}</div>
    {error&&<div className="error">{error}</div>}
    {!loading&&!error&&<div className="page-grid-sp-1 page-grid-st-2 page-grid-3 page-vertical-gap-40 mt30">{items.length?items.map(post=><article className="blog-posts__item" key={post.id}><Link href={'/blog/'+post.slug} className="image-hover-box__container">{post.featuredImageUrl?<img className="image-hover-box" src={post.featuredImageUrl} alt={post.title}/>:<div className="blog-card-placeholder">BLOG</div>}</Link><div className="mt15"><div className="body3">{post.category?.title&&<span>{post.category.title}</span>}<span>{post.publishedAt?new Date(post.publishedAt).toLocaleDateString('tr-TR'):'Yeni'}</span></div><h2><Link href={'/blog/'+post.slug}>{post.title}</Link></h2><p>{post.excerpt||'Yazının devamını okumak için tıklayın.'}</p><div className="body3 mt15 display-flex justify-content-between"><Link href={'/blog/'+post.slug}>Devamını oku →</Link><span>{post._count?.comments||0} yorum</span></div></div></article>):<div className="blog-empty">Bu filtre için yayınlanmış yazı bulunamadı.</div>}</div>}
    {pages>1&&<div className="pagination-wrapper mt40 display-flex justify-content-center gap10"><button className="btn alt" disabled={page<=1} onClick={()=>setPage(x=>Math.max(1,x-1))}>Önceki</button><span>{page} / {pages}</span><button className="btn alt" disabled={page>=pages} onClick={()=>setPage(x=>Math.min(pages,x+1))}>Sonraki</button></div>}
  </div></main>;
}
