'use client';
/* Reorderable section tree, independent from draft persistence and preview. */
import {ArrowDown,ArrowUp,Copy,Eye,EyeOff,Plus,Trash2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {sectionMap,sectionOrder,schemaText,type Selection} from './editor-model';

export function SectionList({
  title,state,schemas,area,selection,setSelection,onMove,onToggle,onDelete,onDuplicate,onAdd,onDrag
}:{title:string;state:any;schemas:Map<string,any>;area:'header'|'template'|'footer';selection:Selection;setSelection:(s:Selection)=>void;onMove:(area:any,id:string,delta:number)=>void;onToggle:(area:any,id:string)=>void;onDelete:(area:any,id:string)=>void;onDuplicate:(area:any,id:string)=>void;onAdd:(area:any)=>void;onDrag:(area:any,from:string,to:string)=>void}){
  const{t}=useTranslation();const sections=sectionMap(state),order=sectionOrder(state);
  return <div className="grid gap-2">
    <div className="flex items-center justify-between px-1"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{schemaText(t,title,title)}</div>{area==='template'&&<Button size="sm" variant="outline" onClick={()=>onAdd(area)}><Plus className="size-4"/>{String(t('themeEditor.addSection',{defaultValue:'Add section'}))}</Button>}</div>
    <div className="grid gap-1">
      {order.map((id,index)=>{const row=sections[id]||{},schema=schemas.get(String(row.type||''))?.schema||{};const active=selection?.area===area&&selection?.id===id;return <div key={id} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(from&&from!==id)onDrag(area,from,id)}} className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 ${active?'border-primary bg-primary/5':'bg-background'}`}>
        <button className="min-w-0 grow text-left" onClick={()=>setSelection({area,id})}><div className="truncate text-sm font-medium">{schemaText(t,schema?.name,String(row.type||id))}</div><div className="truncate text-[11px] text-muted-foreground">{row.type}</div></button>
        <Button size="icon" variant="ghost" className="size-7" disabled={index===0} onClick={()=>onMove(area,id,-1)}><ArrowUp className="size-3.5"/></Button>
        <Button size="icon" variant="ghost" className="size-7" disabled={index===order.length-1} onClick={()=>onMove(area,id,1)}><ArrowDown className="size-3.5"/></Button>
        <Button size="icon" variant="ghost" className="size-7" onClick={()=>onToggle(area,id)}>{row.disabled?<EyeOff className="size-3.5"/>:<Eye className="size-3.5"/>}</Button>
        {area==='template'&&<Button aria-label="Bölümü çoğalt" title="Bölümü çoğalt" size="icon" variant="ghost" className="size-7" onClick={()=>onDuplicate(area,id)}><Copy className="size-3.5"/></Button>}
        {area==='template'&&<Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={()=>onDelete(area,id)}><Trash2 className="size-3.5"/></Button>}
      </div>})}
    </div>
  </div>
}

