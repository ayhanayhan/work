'use client';
import {useState} from 'react';
import {FilePlus2,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useMasterSession} from '@/app/components/MasterSession';

/** Temporary initial-content action. Remove after the ten articles are inserted. */
export default function ImportTicartiArticles({onDone}:{onDone:()=>Promise<void>}){
 const {request,restoring}=useMasterSession();
 const [busy,setBusy]=useState(false);
 const [completed,setCompleted]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const run=async()=>{
  if(busy||completed)return;
  setBusy(true);setError('');setMessage('');
  try{
   const result=await request('/superadmin/website/blog/seed-initial',{method:'POST',body:'{}'});
   if(result?.ok!==true)throw new Error('Beklenmeyen aktarım yanıtı.');
   const count=Number(result.createdPosts)||0;
   setMessage(result.alreadyImported?'10 makale zaten mevcut; tekrar eklenmedi.':
     count+' makale eklendi, '+(Number(result.createdCategories)||0)+' kategori oluşturuldu, '+
     (Number(result.filledTranslations)||0)+' çeviri alanı tamamlandı.');
   setCompleted(true);
   await onDone();
  }catch(e:any){setError(e?.message||'Makaleler eklenemedi.')}
  finally{setBusy(false)}
 };
 return <div className="flex flex-col items-end gap-1">
  <Button type="button" variant="outline" disabled={busy||restoring||completed} onClick={()=>void run()}>
   {busy?<LoaderCircle className="size-4 animate-spin"/>:<FilePlus2 className="size-4"/>}10 Makaleyi Ekle
  </Button>
  {error?<span role="alert" className="max-w-sm text-right text-xs text-destructive">{error}</span>:null}
  {message?<span role="status" className="max-w-sm text-right text-xs text-muted-foreground">{message}</span>:null}
 </div>;
}
