'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useParams} from 'next/navigation';
import ProductCard from '../../../components/ProductCard';
import {api,getCurrency,getLocale,STORE} from '../../../lib/api';

function paragraphs(body:string){return String(body||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean)}

export default function BlogDetailPage(){
  const params=useParams();
  const slug=String(Array.isArray(params?.slug)?params.slug[0]:params?.slug||'');
  const[post,setPost]=useState<any>(null);
  const[customer,setCustomer]=useState<any>(null);
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');

  async function load(){
    if(!slug)return;
    setError('');
    try{
      const p=await api(`/storefront/${STORE}/blog/posts/${encodeURIComponent(slug)}?currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`);
      setPost(p);
    }catch(e:any){
      setError(e.message||'Yazı yüklenemedi');
    }
  }

  useEffect(()=>{
    void load();
    api('/storefront/customer/me').then(setCustomer).catch(()=>setCustomer(null));
  },[slug]);

  const canComment=!!post?.commentSettings?.enabled;
  const allowGuest=post?.commentSettings?.allowGuest!==false;
  const related=useMemo(()=>Array.isArray(post?.products)?post.products.map((x:any)=>x.product).filter(Boolean):[],[post]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!post)return;
    setBusy(true);
    setMsg('');
    setError('');
    const f=new FormData(e.currentTarget);
    const body=String(f.get('body')||'').trim();
    try{
      if(customer){
        await api('/storefront/customer/blog-comments',{method:'POST',body:JSON.stringify({postId:post.id,body})});
      }else{
        await api(`/storefront/${STORE}/blog/posts/${encodeURIComponent(slug)}/comments`,{method:'POST',body:JSON.stringify({authorName:String(f.get('authorName')||''),authorEmail:String(f.get('authorEmail')||''),body})});
      }
      setMsg(post.commentSettings?.autoApprove?'Yorumunuz yayınlandı.':'Yorumunuz onaya gönderildi.');
      (e.currentTarget as HTMLFormElement).reset();
      if(post.commentSettings?.autoApprove)await load();
    }catch(x:any){
      setError(x.message||'Yorum gönderilemedi');
    }finally{
      setBusy(false);
    }
  }

  if(error&&!post){
    return <main className="page-width top-spacing-small"><div className="error">{error}</div><p><Link href="/blog">← Bloga dön</Link></p></main>;
  }

  if(!post){
    return <main className="page-width top-spacing-small">Yazı yükleniyor…</main>;
  }

  return (
    <main id="theme-section-ticarti-article" data-section-name="main-article">
      <div className="page-width top-spacing-small">
        <div className="article-template__header text-center">
          <Link href="/blog" className="link body3">← Blog</Link>
          {post.category&&<Link className="link body3 text-uppercase" href={'/blog?category='+post.category.slug}>{post.category.title}</Link>}
          <h1>{post.title}</h1>
          {post.excerpt&&<p className="body2 mt15">{post.excerpt}</p>}
          <div className="body3 mt15">
            <span>{post.publishedAt?new Date(post.publishedAt).toLocaleDateString('tr-TR',{year:'numeric',month:'long',day:'numeric'}):''}</span>
            {Array.isArray(post.tags)&&post.tags.length>0&&<span>{post.tags.join(' · ')}</span>}
          </div>
        </div>

        {post.featuredImageUrl&&<img className="article-template__hero image-hover-box mt30" src={post.featuredImageUrl} alt={post.title}/>} 

        <article className="article-template__content rte body2 mt40">
          {paragraphs(post.body).map((p,i)=><p key={i}>{p.split('\n').map((line,j)=><span key={j}>{j>0&&<br/>}{line}</span>)}</p>)}
        </article>

        {related.length>0&&(
          <section className="featured-tabs top-spacing-small">
            <div className="section-header__container">
              <div><span className="body3 text-uppercase">İLGİLİ ÜRÜNLER</span><h2>Bu yazıdaki ürünler</h2></div>
              <Link href="/products">Tüm ürünler →</Link>
            </div>
            <div className="grid">{related.map((p:any)=><ProductCard key={p.id} p={p} currency={p.displayCurrency||getCurrency()}/>)}</div>
          </section>
        )}

        <section className="article-template__comments top-spacing-small">
          <div className="section-header__container"><div><span className="body3 text-uppercase">YORUMLAR</span><h2>{post.comments?.length||0} yorum</h2></div></div>
          {Array.isArray(post.comments)&&post.comments.length>0?(
            <div className="page-grid-1 page-vertical-gap-20 mt20">
              {post.comments.map((c:any)=><div className="article-comment border__radius" key={c.id}><div><strong>{c.authorName}</strong><span>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</span></div><p>{c.body}</p></div>)}
            </div>
          ):<p className="muted">Henüz yayınlanmış yorum yok.</p>}

          {canComment?<>
            {msg&&<div className="notice">{msg}</div>}
            {error&&<div className="error">{error}</div>}
            {customer||allowGuest?(
              <form className="article-comment-form mt30" onSubmit={submit}>
                {!customer&&<div className="form-grid"><label className="field"><span>Adınız</span><input name="authorName" required/></label><label className="field"><span>E-posta</span><input name="authorEmail" type="email"/></label></div>}
                <label className="field"><span>Yorumunuz</span><textarea name="body" rows={5} minLength={2} required/></label>
                <button className="btn" disabled={busy}>{busy?'Gönderiliyor…':'Yorumu gönder'}</button>
              </form>
            ):<div className="notice">Yorum yapmak için <Link href="/account"><b>hesabınıza giriş yapın</b></Link>.</div>}
          </>:<div className="notice">Bu yazıda yorumlar kapalı.</div>}
        </section>
      </div>
    </main>
  );
}
