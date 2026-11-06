'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Folder,ImagePlus,LoaderCircle,Search,Trash2,Upload,X} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

/** Platform adaptation of the existing merchant MediaLibraryDialog design.
 * Uses the same real Sharp->WebP backend on /superadmin/media/upload.
 * Merchant tenant media and its folders are intentionally not mixed with platform media.
 */
type Asset={id:string;publicUrl:string;fileName:string;mimeType:string;size:number;createdAt:string};
export function WebsiteBlogMediaDropzone({label='Kapak görseli',value,onChange}:{label?:string;value:string;onChange:(url:string)=>void}){
  const {request}=useMasterSession();
  const [open,setOpen]=useState(false);
  const [assets,setAssets]=useState<Asset[]>([]);
  const [q,setQ]=useState(''),[busy,setBusy]=useState(false),[drag,setDrag]=useState(false),[error,setError]=useState('');
  const fileRef=useRef<HTMLInputElement|null>(null);
  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{
      const rows=await request('/superadmin/media');
      if(!Array.isArray(rows))throw new Error('Medya API yanıtı geçersiz');
      setAssets(rows);
    }catch(e:any){setError(e.message||'Medya kütüphanesi yüklenemedi.')}
    finally{setBusy(false)}
  },[request]);
  useEffect(()=>{if(open)void load()},[open,load]);
  useEffect(()=>{
    // Prevent the browser's default file-drop navigation anywhere on the blog form.
    const protect=(e:DragEvent)=>{
      if(Array.from(e.dataTransfer?.types||[]).includes('Files'))e.preventDefault();
    };
    window.addEventListener('dragover',protect);
    window.addEventListener('drop',protect);
    return ()=>{window.removeEventListener('dragover',protect);window.removeEventListener('drop',protect)};
  },[]);
  const filtered=useMemo(()=>assets.filter(x=>!q||String(x.fileName||'').toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))),[assets,q]);
  const optimize=async(file:File):Promise<File>=>{
    // Normalize EXIF orientation and large browser-decoded files before upload;
    // the API still verifies and converts the result to its canonical WebP.
    if(!('createImageBitmap' in window))return file;
    const bitmap=await createImageBitmap(file);
    try{
      const ratio=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*ratio));
      canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
      const ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('Görsel işleme başlatılamadı.');
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob>((resolve,reject)=>{
        canvas.toBlob(b=>b?resolve(b):reject(new Error('WebP dönüştürülemedi.')),'image/webp',0.84);
      });
      if(blob.type!=='image/webp')throw new Error('Bu tarayıcı WebP dönüştürmesini desteklemiyor.');
      return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'});
    }finally{bitmap.close()}
  };
  const upload=async(files:FileList|File[])=>{
    if(!files?.length)return;
    setBusy(true);setError('');
    try{
      for(const file of Array.from(files)){
        if(!['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif'].includes(file.type))
          throw new Error('JPEG, PNG, WEBP veya AVIF görsel seçin.');
        let processed:File;
        try{processed=await optimize(file)}
        catch(e:any){throw new Error('Görsel tarayıcıda işlenemedi: '+(e?.message||'Desteklenmeyen veya bozuk görsel.'))}
        if(processed.size>8*1024*1024)throw new Error('Sıkıştırılmış görsel bile 8 MB sınırını aşıyor.');
        const form=new FormData();form.append('file',processed);
        const item=await request('/superadmin/media/upload',{method:'POST',body:form}) as Asset;
        if(!item?.publicUrl)throw new Error('Yükleme tamamlandı ancak medya URL alınamadı.');
        setAssets(old=>[item,...old.filter(x=>x.id!==item.id)]);
        // Do not overwrite the current article's cover just because media is uploaded:
        // the user chooses an item explicitly, as in the merchant Media Library.
      }
    }catch(e:any){setError(e?.message||'Görsel yüklenemedi.')}
    finally{setBusy(false);if(fileRef.current)fileRef.current.value=''}
  };
  return <>
    <div className="grid gap-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        {value?<img className="h-20 w-24 rounded border object-contain" src={value} alt="Seçilen görsel"/>:
          <div className="grid h-20 w-24 place-items-center rounded border bg-muted/30"><ImagePlus className="size-6 text-muted-foreground"/></div>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={()=>setOpen(true)}><ImagePlus className="size-4"/>Medya Kütüphanesi</Button>
          {value?<Button type="button" variant="outline" onClick={()=>onChange('')}><Trash2 className="size-4"/>Kaldır</Button>:null}
        </div>
      </div>
    </div>
    {open?<div className="fixed inset-0 z-[12000] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Medya Kütüphanesi"
      onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setOpen(false)}}>
      <div className="flex h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
        onDragOver={e=>{e.preventDefault();e.stopPropagation()}}
        onDrop={e=>{e.preventDefault();e.stopPropagation();setDrag(false);void upload(e.dataTransfer.files)}}>
        <div className="flex items-center justify-between border-b px-5 py-4"><div>
          <div className="font-semibold">Medya Kütüphanesi</div>
          <div className="text-xs text-muted-foreground">Mevcut görsellerden seçin veya yeni görseller yükleyin. Görseller sunucuda WebP formatına dönüştürülür.</div>
        </div><Button type="button" size="icon" variant="ghost" disabled={busy} onClick={()=>setOpen(false)}><X className="size-4"/></Button></div>
        <div className="grid min-h-0 grow grid-cols-[190px_minmax(0,1fr)]">
          <aside className="overflow-auto border-r p-3"><div className="mb-3 text-sm font-semibold">Kütüphane</div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"><Folder className="size-4"/>Tüm Medyalar</div>
            <p className="mt-3 text-xs text-muted-foreground">Kurumsal sitenin medyaları mağaza dosyalarından ayrıdır.</p>
          </aside>
          <main className="flex min-w-0 flex-col">
            <div className="flex flex-wrap gap-3 border-b p-3">
              <div className="relative min-w-40 grow"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input className="pl-9" placeholder="Medya ara..." value={q} onChange={e=>setQ(e.target.value)}/></div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" multiple className="hidden"
                onChange={e=>{if(e.target.files?.length)void upload(e.target.files)}}/>
              <Button type="button" variant="outline" disabled={busy} onClick={()=>fileRef.current?.click()}><Upload className="size-4"/>Yükle</Button>
            </div>
            {error?<div role="alert" className="mx-3 mt-3 rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
            <div className={'m-3 rounded-lg border border-dashed p-4 text-center text-sm '+(drag?'bg-muted/60':'')}
              onDragEnter={e=>{e.preventDefault();setDrag(true)}}
              onDragOver={e=>{e.preventDefault();e.stopPropagation()}}
              onDragLeave={e=>{e.preventDefault();setDrag(false)}}
              onDrop={e=>{e.preventDefault();e.stopPropagation();setDrag(false);void upload(e.dataTransfer.files)}}>
              <ImagePlus className="mx-auto mb-2 size-5 text-muted-foreground"/>Görselleri buraya sürükleyip bırakabilirsiniz.
            </div>
            <div className="min-h-0 grow overflow-auto p-3">
              {busy?<div className="grid h-full place-items-center"><LoaderCircle className="size-6 animate-spin"/></div>:
                filtered.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {filtered.map(item=><button key={item.id} type="button"
                    className={'overflow-hidden rounded-lg border text-left hover:ring-2 hover:ring-primary '+(value===item.publicUrl?'ring-2 ring-primary':'')}
                    onClick={()=>{onChange(item.publicUrl);setOpen(false)}}>
                    <div className="aspect-square bg-muted"><img className="size-full object-cover" src={item.publicUrl} alt={item.fileName||''}/></div>
                    <div className="truncate p-2 text-xs">{item.fileName||'Görsel'}</div>
                    <div className="px-2 pb-2 text-xs text-muted-foreground">WebP · {(Number(item.size||0)/1024).toFixed(0)} KB</div>
                  </button>)}
                </div>:<p className="py-12 text-center text-sm text-muted-foreground">Bu kütüphanede görsel bulunamadı.</p>}
            </div>
          </main>
        </div>
      </div>
    </div>:null}
  </>;
}
