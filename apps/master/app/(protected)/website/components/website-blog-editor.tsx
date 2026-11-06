'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {LoaderCircle,Plus,RefreshCw,Search,Trash2,ArrowUp,ArrowDown} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Input} from '@/components/ui/input';

type Post={id:string;slug:string;status:string;featuredImage?:string;authorName?:string;translations:Record<string,{title?:string;content?:string;enabled?:boolean}>};
type Snapshot={version:number;posts:Post[];categories:any[]};
export default function WebsiteBlogEditor(){
  const {request,restoring,locales,localesLoading,localesError,reloadLocales}=useMasterSession();
  const [data,setData]=useState<Snapshot>({version:0,posts:[],categories:[]});
  const [loading,setLoading]=useState(true),[working,setWorking]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[query,setQuery]=useState('');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{const result=await request('/superadmin/website/blog') as Snapshot;
      setData({...result,posts:Array.isArray(result.posts)?result.posts:[],categories:Array.isArray(result.categories)?result.categories:[]});
    }catch(e:any){setError(e.message||'Yazılar alınamadı.')}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const primary=locales.find(x=>x.isDefault)?.locale||locales[0]?.locale;
  const title=(post:Post)=>post.translations?.[primary]?.title||
    Object.values(post.translations||{}).find(x=>x.title?.trim())?.title||post.slug||'Başlıksız yazı';
  const shown=useMemo(()=>data.posts.filter(post=>[post.slug,...Object.values(post.translations||{}).map(x=>x.title)].join(' ').toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))),[data.posts,query]);
  const change=async(posts:Post[],success:string)=>{
    setWorking(true);setError('');setNotice('');
    try{
      const result=await request('/superadmin/website/blog',{method:'PATCH',body:JSON.stringify({version:data.version,posts,categories:data.categories})}) as Snapshot;
      setData({...result,categories:result.categories||[]});
      setNotice(success);
    }catch(e:any){setError(e.message||'Kayıt güncellenemedi. Yenileyin.')}
    finally{setWorking(false)}
  };
  const remove=async(post:Post)=>{
    if(!window.confirm('Bu blog yazısı silinsin mi?'))return;
    await change(data.posts.filter(x=>x.id!==post.id),'Blog yazısı silindi.');
  };
  const move=async(post:Post,offset:number)=>{
    const from=data.posts.findIndex(x=>x.id===post.id);
    const to=from+offset;if(from<0||to<0||to>=data.posts.length)return;
    const posts=[...data.posts];const [moved]=posts.splice(from,1);posts.splice(to,0,moved);
    await change(posts,'Sıralama kaydedildi.');
  };
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Blog İçerikleri</h1>
      <ToolbarDescription>Ticarti.com blog yazıları ve yayın durumları</ToolbarDescription>
    </ToolbarHeading><ToolbarActions>
      <Button asChild variant="outline"><Link href="/website/blog/categories">Blog Kategorileri</Link></Button>
      <Button variant="outline" disabled={loading} onClick={()=>{void load();void reloadLocales()}}><RefreshCw className="size-4"/>Yenile</Button>
      <Button asChild><Link href="/website/blog/new"><Plus className="size-4"/>Yeni Yazı</Link></Button>
    </ToolbarActions></Toolbar></Container>
    <Container className="grid gap-4 pb-10">
      {error?<p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>:null}
      {localesError?<p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{localesError}</p>:null}
      {notice?<p className="text-sm text-foreground">{notice}</p>:null}
      <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardHeading>Blog Yazıları</CardHeading>
        <p className="mt-1 text-sm text-muted-foreground">{data.posts.length} yazı · {data.posts.filter(x=>x.status==='PUBLISHED').length} yayında</p></div>
        <div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
          <Input className="w-72 ps-9" placeholder="Başlık veya URL ara" value={query} onChange={e=>setQuery(e.target.value)}/>
        </div></div></CardHeader>
      <CardContent className="grid gap-2 p-4">
        {loading||localesLoading?<div className="grid min-h-40 place-items-center"><LoaderCircle className="size-5 animate-spin"/></div>:
        shown.map(post=><div key={post.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          {post.featuredImage?<img className="h-14 w-20 rounded border object-contain" src={post.featuredImage} alt=""/>:null}
          <div className="min-w-0 flex-1"><div className="truncate font-medium">{title(post)}</div><div className="mt-0.5 text-xs text-muted-foreground">{post.slug}</div></div>
          {locales.map(locale=>{
            const t=post.translations?.[locale.locale];if(!t?.title?.trim())return null;
            const live=post.status==='PUBLISHED'&&t.enabled!==false&&!!t.content?.trim();
            return <Badge key={locale.locale} appearance="light" variant={live?'success':'secondary'}>{locale.label} · {live?'Yayında':'Taslak'}</Badge>;
          })}
          <Badge appearance="light" variant={post.status==='PUBLISHED'?'success':'secondary'}>{post.status==='PUBLISHED'?'Yayında':post.status==='ARCHIVED'?'Arşiv':'Taslak'}</Badge>
          <Button variant="outline" size="icon" disabled={working||data.posts.indexOf(post)===0} onClick={()=>void move(post,-1)}><ArrowUp className="size-4"/></Button>
          <Button variant="outline" size="icon" disabled={working||data.posts.indexOf(post)===data.posts.length-1} onClick={()=>void move(post,1)}><ArrowDown className="size-4"/></Button>
          <Button asChild variant="outline"><Link href={'/website/blog/'+encodeURIComponent(post.id)+'/edit'}>Düzenle</Link></Button>
          <Button variant="outline" size="icon" disabled={working} onClick={()=>void remove(post)}><Trash2 className="size-4"/></Button>
        </div>)}
        {!loading&&!shown.length?<p className="py-12 text-center text-sm text-muted-foreground">Blog yazısı bulunamadı.</p>:null}
      </CardContent></Card>
    </Container>
  </>;
}
