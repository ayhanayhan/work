'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type DragEvent} from 'react';
import {ChevronDown,ChevronRight,CornerDownRight,GripVertical,LoaderCircle,Plus,RefreshCw,Save,Trash2,ArrowLeft,ArrowRight} from 'lucide-react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';

type Translations=Record<string,string>;
type Node={id:string;label:Translations;url:string;enabled:boolean;children:Node[]};
type Tree={header:Node[];footer:Node[]};
type Snapshot={version:number;menus:Tree};
type Area=keyof Tree;
type Row={node:Node;depth:number;parentId:string|null;index:number};
type Placement='before'|'after'|'inside';
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const uuid=()=> 'menu-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
const label=(node:Node,lang:string)=>node.label?.[lang]||node.label?.tr||Object.values(node.label||{}).find(Boolean)||'İsimsiz öğe';
function flat(items:Node[],parentId:string|null=null,depth=0):Row[]{
 return items.flatMap((node,index)=>[{node,depth,parentId,index},...flat(node.children||[],node.id,depth+1)]);
}
function getNode(nodes:Node[],id:string):Node|undefined{
 for(const node of nodes){if(node.id===id)return node;const child=getNode(node.children||[],id);if(child)return child}
}
function detach(nodes:Node[],id:string):{nodes:Node[];item:Node|null}{
 let found:Node|null=null;
 const next=nodes.flatMap(node=>{
  if(node.id===id){found=node;return [];}
  const child=detach(node.children||[],id);
  if(child.item)found=child.item;
  return [{...node,children:child.nodes}];
 });
 return {nodes:next,item:found};
}
function insert(nodes:Node[],targetId:string,mode:Placement,item:Node):Node[]{
 if(!nodes.some(node=>node.id===targetId||getNode(node.children||[],targetId))){
  return nodes;
 }
 return nodes.flatMap(node=>{
  if(node.id===targetId){
   if(mode==='before')return [item,node];
   if(mode==='after')return [node,item];
   return [{...node,children:[...(node.children||[]),item]}];
  }
  return [{...node,children:insert(node.children||[],targetId,mode,item)}];
 });
}
function maxDepth(nodes:Node[],depth=0):number{
 return nodes.reduce((m,node)=>Math.max(m,depth,maxDepth(node.children||[],depth+1)),depth-1);
}
function reposition(nodes:Node[],id:string,targetId:string,mode:Placement):Node[]|null{
 if(id===targetId)return null;
 const removed=detach(nodes,id);
 if(!removed.item||getNode(removed.item.children||[],targetId))return null;
 const result=insert(removed.nodes,targetId,mode,removed.item);
 if(!getNode(result,id)||maxDepth(result)>3)return null;
 return result;
}
function siblingInfo(nodes:Node[],id:string,parent:Node|null=null):{siblings:Node[];index:number;parent:Node|null}|null{
 const index=nodes.findIndex(x=>x.id===id);
 if(index>=0)return {siblings:nodes,index,parent};
 for(const node of nodes){const inner=siblingInfo(node.children||[],id,node);if(inner)return inner}
 return null;
}
export default function MenuTreeEditor(){
 const {request,restoring,locales,localesError}=useMasterSession();
 const [saved,setSaved]=useState<Snapshot|null>(null),[draft,setDraft]=useState<Snapshot|null>(null);
 const [area,setArea]=useState<Area>('header'),[locale,setLocale]=useState('tr');
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [editing,setEditing]=useState<string|null>(null);
 const [dragging,setDragging]=useState<string|null>(null);
 const [hover,setHover]=useState<{id:string;mode:Placement}|null>(null);
 const dragId=useRef<string|null>(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[success,setSuccess]=useState('');
 const load=useCallback(async()=>{
  if(restoring)return;
  setLoading(true);setError('');
  try{
   const result=await request('/superadmin/website/navigation') as Snapshot;
   if(!result?.menus?.header||!result?.menus?.footer)throw Error('Yeni menü verileri alınamadı. API deploy edildi mi?');
   setSaved(result);setDraft(copy(result));
  }catch(e:any){setError(e?.message||'Menüler alınamadı.')}
  finally{setLoading(false)}
 },[request,restoring]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{if(locales.length)setLocale(old=>locales.some(l=>l.locale===old)?old:(locales.find(l=>l.isDefault)?.locale||locales[0].locale));},[locales]);
 const dirty=!!saved&&!!draft&&JSON.stringify(saved.menus)!==JSON.stringify(draft.menus);
 const rows=useMemo(()=>draft?flat(draft.menus[area]):[],[draft,area]);
 const editNode=(id:string,fn:(node:Node)=>Node)=>{
  function modify(nodes:Node[]):Node[]{return nodes.map(n=>n.id===id?fn(n):{...n,children:modify(n.children||[])})}
  setDraft(old=>old?{...old,menus:{...old.menus,[area]:modify(old.menus[area])}}:old);
 };
 const updateTree=(fn:(nodes:Node[])=>Node[]|null)=>{
  setDraft(old=>{
   if(!old)return old;
   const result=fn(old.menus[area]);return result?{...old,menus:{...old.menus,[area]:result}}:old;
  });
 };
 const setField=(id:string,key:'label'|'url',value:string)=>{
  editNode(id,n=>key==='label'?{...n,label:{...n.label,[locale]:value}}:{...n,url:value});
 };
 const add=(parentId?:string)=>{
  const item:Node={id:uuid(),label:{[locale]:'Yeni bağlantı'},url:'',enabled:true,children:[]};
  if(parentId){
   if(rows.find(row=>row.node.id===parentId)?.depth===3){setError('En fazla 4 seviye kullanılabilir.');return;}
   editNode(parentId,n=>({...n,children:[...n.children,item]}));
   setExpanded(old=>({...old,[parentId]:true}));
  }else updateTree(nodes=>[...nodes,item]);
  setEditing(item.id);setSuccess('');setError('');
 };
 const remove=(id:string)=>{
  const node=getNode(draft?.menus[area]||[],id);
  if(!node)return;
  if(node.children.length&&!window.confirm('Bu öğe ve tüm alt menüleri silinsin mi?'))return;
  updateTree(nodes=>detach(nodes,id).nodes);
  if(editing===id)setEditing(null);
 };
 const indent=(id:string)=>{
  const info=siblingInfo(draft?.menus[area]||[],id);
  if(!info||info.index===0)return;
  const previous=info.siblings[info.index-1];
  updateTree(nodes=>reposition(nodes,id,previous.id,'inside'));
  setExpanded(old=>({...old,[previous.id]:true}));
 };
 const outdent=(id:string)=>{
  const info=siblingInfo(draft?.menus[area]||[],id);
  if(!info?.parent)return;
  updateTree(nodes=>reposition(nodes,id,info.parent!.id,'after'));
 };
 const chooseArea=(next:Area)=>{setArea(next);setEditing(null);setHover(null);setError('');};
 const dragStart=(event:DragEvent<HTMLElement>,id:string)=>{
  dragId.current=id;setDragging(id);
  event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id);
 };
 const dragOver=(event:DragEvent<HTMLDivElement>,id:string,depth:number)=>{
  if(!dragId.current||dragId.current===id)return;
  event.preventDefault();event.dataTransfer.dropEffect='move';
  const rect=event.currentTarget.getBoundingClientRect();
  const x=event.clientX-rect.left,y=event.clientY-rect.top;
  const mode:Placement=x>120+depth*24?'inside':y<rect.height/2?'before':'after';
  if(hover?.id!==id||hover.mode!==mode)setHover({id,mode});
 };
 const drop=(event:DragEvent<HTMLDivElement>,targetId:string)=>{
  event.preventDefault();event.stopPropagation();
  const from=dragId.current;
  if(from&&hover&&hover.id===targetId){
   const target=getNode(draft?.menus[area]||[],targetId);
   const source=getNode(draft?.menus[area]||[],from);
   const result=source&&target?reposition(draft!.menus[area],from,targetId,hover.mode):null;
   if(result){updateTree(()=>result);if(hover.mode==='inside')setExpanded(old=>({...old,[targetId]:true}));setError('');}
   else setError('Bu konuma taşınamıyor. Bir öğe kendi altına taşınamaz; en fazla 4 seviye kullanılabilir.');
  }
  dragId.current=null;setDragging(null);setHover(null);
 };
 const save=async()=>{
  if(!draft||busy)return;
  setBusy(true);setError('');setSuccess('');
  try{
   const result=await request('/superadmin/website/navigation',{method:'PATCH',
    body:JSON.stringify({version:draft.version,menus:draft.menus})}) as Snapshot;
   if(!result?.menus||typeof result.version!=='number')throw Error('Kayıt doğrulanamadı.');
   setSaved(result);setDraft(copy(result));setSuccess('Menü ağacı kaydedildi. Header, mobil menü ve Footer güncellendi.');
  }catch(e:any){setError(e?.message||'Kaydedilemedi.')}
  finally{setBusy(false)}
 };
 return <Container className="grid gap-5 pb-12">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-semibold">Menü Yönetimi</h1>
    <p className="mt-1 text-sm text-muted-foreground">Öğeleri sürükleyerek sıralayın; sağa kaydırarak alt menü oluşturun.</p></div>
   <div className="flex gap-2">
    <Button variant="outline" disabled={loading||busy} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button>
    <Button disabled={!draft||loading||busy} onClick={()=>void save()}>
     {busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet
    </Button>
   </div>
  </div>
  {error?<p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>:null}
  {success?<p role="status" className="rounded-md border p-3 text-sm">{success}</p>:null}
  {localesError?<p className="text-sm text-destructive">{localesError}</p>:null}
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
   <div className="flex gap-2">
    <Button variant={area==='header'?'primary':'outline'} onClick={()=>chooseArea('header')}>Header Menüsü</Button>
    <Button variant={area==='footer'?'primary':'outline'} onClick={()=>chooseArea('footer')}>Footer Menüsü</Button>
   </div>
   <div className="flex flex-wrap gap-1">
    {locales.map(lang=><Button key={lang.locale} size="sm" variant={locale===lang.locale?'primary':'outline'}
     onClick={()=>setLocale(lang.locale)}>{lang.label||lang.locale}</Button>)}
   </div>
  </div>
  <div className="grid gap-3 rounded-lg border bg-card p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="font-semibold">{area==='header'?'Header Menü Ağacı':'Footer Menü Ağacı'}</h2>
     <p className="mt-1 text-xs text-muted-foreground">Sürükleme tutamacını kullanın. Sağ içeri, sol dışarı alır. Başlıklara tıklayarak URL ve metni düzenleyin.</p></div>
    <Button variant="outline" onClick={()=>add()} disabled={!draft}><Plus className="size-4"/>Menü Öğesi Ekle</Button>
   </div>
   {loading?<p className="py-10 text-center text-sm">Yükleniyor…</p>:rows.length===0?
    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Bu menü boş. Menü Öğesi Ekle'yi seçin.</div>:
    <div className="grid gap-2">
     {rows.map(row=>{
      const node=row.node,isOpen=editing===node.id;
      const hasChildren=node.children.length>0;
      const highlighted=hover?.id===node.id&&!!dragging;
      const hidden=rows.some(parent=>parent.depth<row.depth&&expanded[parent.node.id]===false&&
        !!getNode(parent.node.children||[],node.id));
      if(hidden)return null;
      return <div key={node.id} className="relative" style={{marginLeft:Math.min(row.depth,3)*26}}>
       <div onDragOver={e=>dragOver(e,node.id,row.depth)} onDrop={e=>drop(e,node.id)}
        className={'rounded-md border bg-card transition-colors '+(highlighted?'border-primary bg-muted ':'')+
         (dragging===node.id?'opacity-60':'')}>
        {highlighted&&hover?.mode==='before'?<div className="h-1 rounded bg-primary"/>:null}
        <div className="flex min-h-12 items-center gap-2 px-3">
         <span draggable onDragStart={e=>dragStart(e,node.id)}
          onDragEnd={()=>{dragId.current=null;setDragging(null);setHover(null);}}
          className="inline-flex cursor-grab select-none rounded p-1 text-muted-foreground"
          role="button" tabIndex={0} aria-label="Sürükleyerek sırala">
          <GripVertical className="size-4"/>
         </span>
         <button className="rounded p-1" aria-label={hasChildren?'Alt menüleri göster veya gizle':'Öğeyi düzenle'}
          onClick={()=>hasChildren?setExpanded(x=>({...x,[node.id]:x[node.id]===false})):setEditing(isOpen?null:node.id)}>
          {hasChildren&&expanded[node.id]!==false?<ChevronDown className="size-4"/>:<ChevronRight className="size-4"/>}
         </button>
         {row.depth>0?<CornerDownRight className="size-3.5 text-muted-foreground"/>:null}
         <button className="min-w-0 flex-1 truncate py-3 text-left text-sm font-medium"
          onClick={()=>setEditing(isOpen?null:node.id)}>{label(node,locale)}</button>
         <span className="hidden text-xs text-muted-foreground sm:inline">{row.depth===0?'Ana öğe':row.depth+'. seviye alt menü'}</span>
         <Switch checked={node.enabled} onCheckedChange={checked=>editNode(node.id,n=>({...n,enabled:checked}))}/>
         <button title="Üst seviyeye çıkar" aria-label="Üst seviyeye çıkar" disabled={row.depth===0}
          className="rounded p-1.5 disabled:opacity-30" onClick={()=>outdent(node.id)}>
          <ArrowLeft className="size-4"/></button>
         <button title="Bir önceki öğenin altına al" aria-label="Bir önceki öğenin altına al" disabled={row.index===0||row.depth>=3}
          className="rounded p-1.5 disabled:opacity-30" onClick={()=>indent(node.id)}>
          <ArrowRight className="size-4"/></button>
         <button title="Alt öğe ekle" aria-label="Alt öğe ekle" disabled={row.depth>=3}
          className="rounded p-1.5 disabled:opacity-30" onClick={()=>add(node.id)}>
          <Plus className="size-4"/></button>
         <button title="Sil" aria-label="Sil" className="rounded p-1.5 text-destructive"
          onClick={()=>remove(node.id)}><Trash2 className="size-4"/></button>
        </div>
        {highlighted&&hover?.mode==='inside'?<p className="px-5 pb-2 text-xs text-primary">Bu öğenin altına taşınacak</p>:null}
        {isOpen?<div className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-2">
         <label className="grid gap-1 text-sm">Menü metni ({locale})
          <Input value={node.label?.[locale]||''} onChange={e=>setField(node.id,'label',e.target.value)}/></label>
         <label className="grid gap-1 text-sm">Bağlantı adresi
          <Input placeholder="/araclar" value={node.url} onChange={e=>setField(node.id,'url',e.target.value)}/></label>
         <div className="sm:col-span-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={()=>setEditing(null)}>Tamam</Button>
         </div>
        </div>:null}
        {highlighted&&hover?.mode==='after'?<div className="h-1 rounded bg-primary"/>:null}
       </div>
      </div>
     })}
    </div>}
   <div className="flex flex-wrap items-center justify-between gap-2">
    <span className="text-xs text-muted-foreground">{rows.length} öğe · En fazla 4 seviye · {dirty?'Kaydedilmemiş değişiklikler':'Kaydedilmiş'}</span>
    <Button disabled={!draft||busy} onClick={()=>void save()}><Save className="size-4"/>Menüyü Kaydet</Button>
   </div>
  </div>
 </Container>;
}
