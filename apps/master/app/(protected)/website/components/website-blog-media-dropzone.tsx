'use client';
import {useState} from 'react';
import {ImagePlus,LoaderCircle,Trash2} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Button} from '@/components/ui/button';
import {Dialog,DialogBody,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';

type Media={id:string;publicUrl:string;originalName?:string;fileName?:string};
export function WebsiteBlogMediaDropzone({label='Kapak görseli',value,onChange}:{label?:string;value:string;onChange:(url:string)=>void}){
  const {request}=useMasterSession();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[drag,setDrag]=useState(false);
  const [rows,setRows]=useState<Media[]>([]),[error,setError]=useState('');
  const library=async()=>{
    setOpen(true);setError('');
    try{const result=await request('/superadmin/media');setRows(Array.isArray(result)?result:[])}
    catch(e:any){setError(e?.message||'Medya kütüphanesi açılamadı.')}
  };
  const upload=async(files:FileList|File[])=>{
    const file=Array.from(files)[0];if(!file)return;
    if(!file.type.startsWith('image/')){setError('Lütfen görsel seçin.');return;}
    setBusy(true);setError('');
    try{
      const form=new FormData();form.append('file',file);
      const result=await request('/superadmin/media/upload',{method:'POST',body:form}) as Media;
      if(result?.publicUrl){onChange(result.publicUrl);setRows(prev=>[result,...prev.filter(x=>x.id!==result.id)]);}
    }catch(e:any){setError(e?.message||'Görsel yüklenemedi.')}
    finally{setBusy(false)}
  };
  return <>
    <div role="button" tabIndex={0}
      className={'relative min-h-40 rounded-xl border border-dashed flex cursor-pointer items-center justify-center p-6 text-center transition-colors '+(drag?'bg-muted/60':'hover:bg-muted/30')}
      onClick={()=>void library()}
      onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void library()}}}
      onDragEnter={e=>{e.preventDefault();setDrag(true)}}
      onDragOver={e=>e.preventDefault()}
      onDragLeave={e=>{e.preventDefault();setDrag(false)}}
      onDrop={e=>{e.preventDefault();setDrag(false);void upload(e.dataTransfer.files)}}>
      <div className="w-full">
        {busy?<LoaderCircle className="mx-auto size-8 animate-spin text-muted-foreground"/>:value?<img src={value} alt="" className="mx-auto mb-3 max-h-32 object-contain"/>:<ImagePlus className="mx-auto mb-3 size-8 text-muted-foreground"/>}
        <div className="font-medium">{label}</div>
        <div className="text-sm text-muted-foreground mt-1">Sürükleyip bırakırsanız doğrudan yüklenir. Tıklarsanız Medya Kütüphanesi açılır.</div>
      </div>
    </div>
    {value?<div className="flex justify-end"><Button size="sm" variant="outline" onClick={()=>onChange('')}><Trash2 className="size-4"/>Görseli kaldır</Button></div>:null}
    {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-4xl">
      <DialogHeader><DialogTitle>Medya Kütüphanesi</DialogTitle></DialogHeader>
      <DialogBody className="grid max-h-[65vh] gap-4 overflow-y-auto">
        <label className="grid gap-2 text-sm font-medium">Yeni görsel yükle
          <Input type="file" accept="image/*" disabled={busy} onChange={e=>{if(e.target.files?.length){void upload(e.target.files);setOpen(false)}e.target.value=''}}/>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rows.map(row=><button type="button" key={row.id} className="rounded border p-2 text-start hover:border-primary" onClick={()=>{onChange(row.publicUrl);setOpen(false)}}>
            <img src={row.publicUrl} className="aspect-video w-full object-contain" alt={row.originalName||row.fileName||''}/>
            <span className="block truncate p-1 text-xs">{row.originalName||row.fileName||'Görsel'}</span>
          </button>)}
        </div>
        {!rows.length?<p className="py-6 text-sm text-muted-foreground">Medya kaydı bulunamadı.</p>:null}
      </DialogBody>
    </DialogContent></Dialog>
  </>;
}
