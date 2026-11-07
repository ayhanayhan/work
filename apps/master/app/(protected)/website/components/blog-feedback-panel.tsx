'use client';
import {useCallback,useEffect,useState} from 'react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
type Comment={id:string;postSlug:string;name:string;comment:string;createdAt:string};
type Callback={id:string;slug:string;phone:string;createdAt:string};
export default function BlogFeedbackPanel(){
 const {request,restoring}=useMasterSession();
 const [comments,setComments]=useState<Comment[]>([]);
 const [callbacks,setCallbacks]=useState<Callback[]>([]);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  if(restoring)return;
  try{
   const [pending,requests]=await Promise.all([
    request('/superadmin/website/blog-comments/pending'),
    request('/superadmin/website/blog-callbacks')
   ]);
   setComments(Array.isArray(pending)?pending:[]);
   setCallbacks(Array.isArray(requests)?requests:[]);
  }catch(e:any){setError(e.message||'Blog başvuruları yüklenemedi.')}
 },[request,restoring]);
 useEffect(()=>{void load()},[load]);
 const complete=async(id:string)=>{
  setBusy(true);setError('');
  try{
   await request('/superadmin/website/blog-callbacks/'+encodeURIComponent(id)+'/complete',{method:'PATCH',body:'{}'});
   await load();
  }catch(e:any){setError(e.message||'Başvuru güncellenemedi.')}finally{setBusy(false)}
 };
 const moderate=async(id:string,status:'APPROVED'|'REJECTED')=>{
  setBusy(true);setError('');
  try{
   await request('/superadmin/website/blog-comments/'+encodeURIComponent(id),{
    method:'PATCH',body:JSON.stringify({status})
   });
   await load();
  }catch(e:any){setError(e.message||'Yorum güncellenemedi.')}finally{setBusy(false)}
 };
 return <div className="grid gap-4 lg:grid-cols-2">
  <Card><CardHeader><CardHeading>Onay Bekleyen Yorumlar ({comments.length})</CardHeading></CardHeader>
   <CardContent className="grid max-h-[460px] gap-3 overflow-y-auto p-4">
    {comments.map(c=><div key={c.id} className="grid gap-2 rounded-lg border p-3">
     <div className="text-sm font-medium">{c.name} <span className="font-normal text-muted-foreground">· {c.postSlug}</span></div>
     <p className="whitespace-pre-wrap text-sm">{c.comment}</p>
     <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={()=>void moderate(c.id,'APPROVED')}>Onayla</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>void moderate(c.id,'REJECTED')}>Reddet</Button></div>
    </div>)}
    {!comments.length?<p className="text-sm text-muted-foreground">Onay bekleyen yorum yok.</p>:null}
   </CardContent>
  </Card>
  <Card><CardHeader><CardHeading>Blog Telefon Talepleri ({callbacks.length})</CardHeading></CardHeader>
   <CardContent className="grid max-h-[460px] gap-3 overflow-y-auto p-4">
    {callbacks.map(c=><div key={c.id} className="rounded-lg border p-3">
     <div className="text-sm font-medium"><a href={'tel:'+c.phone} className="underline">{c.phone}</a></div>
     <div className="mt-1 text-xs text-muted-foreground">{c.slug} · {new Date(c.createdAt).toLocaleString('tr-TR')}</div>
     <Button size="sm" className="mt-2" variant="outline" disabled={busy} onClick={()=>void complete(c.id)}>İşlendi</Button>
    </div>)}
    {!callbacks.length?<p className="text-sm text-muted-foreground">Telefon talebi yok.</p>:null}
   </CardContent>
  </Card>
  {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
 </div>;
}
