'use client';
import {useMemo,useRef,useState} from 'react';
import {ImagePlus,LoaderCircle} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
import {MediaLibraryDialog} from './media-library-dialog';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Asset={id?:string|null;publicUrl:string;originalName?:string;fileName?:string;mimeType?:string;metadata?:any;createdAt?:string};
export function TicartiMediaDropzone({label='Medya seç',multiple=true,value,onChange,title}:{label?:string;multiple?:boolean;value?:string|string[];onChange?:(value:string|string[],asset?:Asset)=>void;title?:string}){
 const{session}=useAdminSession();const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[drag,setDrag]=useState(false),[local,setLocal]=useState<string[]>(()=>Array.isArray(value)?value:value?[value]:[]);const inputRef=useRef<HTMLInputElement|null>(null);
 const authHeaders=useMemo(()=>({authorization:`Bearer ${session?.accessToken||''}`,'x-tenant-id':session?.tenantId||''}),[session?.accessToken,session?.tenantId]);
 const current=Array.isArray(value)?value:value?[value]:local;
 const commit=(urls:string[],asset?:Asset)=>{if(onChange)onChange(multiple?urls:(urls[0]||''),asset);else setLocal(urls)};
 const upload=async(files:FileList|File[])=>{if(!session?.storeId||!files?.length)return;setBusy(true);try{const next=[...current];for(const file of Array.from(files)){const fd=new FormData();fd.append('file',file);const r=await fetch(`${API}/admin/media/upload?storeId=${encodeURIComponent(session.storeId)}`,{method:'POST',credentials:'include',headers:authHeaders,body:fd});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Görsel yüklenemedi.');if(j.publicUrl){if(multiple)next.push(j.publicUrl);else{next.splice(0,next.length,j.publicUrl)}}}commit(next)}catch(e:any){window.alert(e?.message||'Görsel yüklenemedi.')}finally{setBusy(false);if(inputRef.current)inputRef.current.value=''}};
 return <><div role="button" tabIndex={0} className={`relative min-h-40 rounded-xl border border-dashed flex cursor-pointer items-center justify-center p-6 text-center transition-colors ${drag?'bg-muted/60':'hover:bg-muted/30'}`} onClick={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setOpen(true)}} onDragEnter={e=>{e.preventDefault();e.stopPropagation();setDrag(true)}} onDragOver={e=>{e.preventDefault();e.stopPropagation()}} onDragLeave={e=>{e.preventDefault();setDrag(false)}} onDrop={e=>{e.preventDefault();e.stopPropagation();setDrag(false);void upload(e.dataTransfer.files)}}>
   <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden"/>
   <div className="w-full">{busy?<LoaderCircle className="mx-auto size-8 animate-spin mb-3"/>:<ImagePlus className="mx-auto size-8 text-muted-foreground mb-3"/>}<div className="font-medium">{label}</div><div className="text-sm text-muted-foreground mt-1">Sürükleyip bırakırsanız doğrudan yüklenir. Tıklarsanız Medya Kütüphanesi açılır.</div>{current.length>0&&<div className="mt-4 flex flex-wrap justify-center gap-2">{current.slice(0,8).map((u,i)=><img key={`${u}-${i}`} src={u} alt="" className="size-16 rounded-md border object-cover"/>)}</div>}</div>
  </div><MediaLibraryDialog open={open} onOpenChange={setOpen} title={title||label} onSelect={(url,asset)=>{const next=multiple?[...current,url]:[url];commit(next,asset)}}/></>;
}
