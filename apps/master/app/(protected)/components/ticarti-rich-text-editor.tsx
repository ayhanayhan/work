'use client';

import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {
  Bold,Italic,Underline,Strikethrough,Link2,Unlink,List,ListOrdered,
  Redo2,Undo2,Quote,Code2,Table2,ImagePlus,Minus,AlignLeft,
  RemoveFormatting,Rows3,Columns3
} from 'lucide-react';

type EditorProps={
  initialValue?:string;minHeight?:number;onChange?:(html:string)=>void;
  /** Called for the Markdown source view; other consumers may keep HTML storage. */
  sourceValue?:string;onSourceChange?:(text:string)=>void;
};
function escapeHtml(value:string){
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function safeUrl(value:string){
  const v=value.trim();
  return /^(https:\/\/|http:\/\/|\/assets\/)[^\s<>"']+$/i.test(v)?v:null;
}
export function TicartiRichTextEditor({
  initialValue='',minHeight=220,onChange,sourceValue,onSourceChange
}:EditorProps){
  const ref=useRef<HTMLDivElement|null>(null);
  const [sourceMode,setSourceMode]=useState(false);
  const selection=useRef<Range|null>(null);
  useEffect(()=>{if(!sourceMode&&ref.current&&ref.current.innerHTML!==initialValue)ref.current.innerHTML=initialValue},[initialValue,sourceMode]);
  const emit=()=>onChange?.(ref.current?.innerHTML??'');
  const remember=()=>{
    const s=window.getSelection();
    if(s?.rangeCount&&ref.current?.contains(s.anchorNode))selection.current=s.getRangeAt(0).cloneRange();
  };
  const focusSelection=()=>{
    ref.current?.focus();
    const s=window.getSelection();
    if(s&&selection.current){s.removeAllRanges();s.addRange(selection.current);}
  };
  const run=(command:string,value?:string)=>{
    focusSelection();
    document.execCommand(command,false,value);
    remember();emit();
  };
  const insert=(markup:string)=>{
    focusSelection();
    document.execCommand('insertHTML',false,markup);
    remember();emit();
  };
  const promptLink=()=>{
    const input=window.prompt('Bağlantı (https://...)');
    if(!input)return;
    const href=safeUrl(input);
    if(!href){window.alert('Güvenli bir bağlantı girin.');return;}
    run('createLink',href);
  };
  const promptImage=()=>{
    const input=window.prompt('Görsel URL (https://... veya /assets/...)');
    if(!input)return;
    const src=safeUrl(input);
    if(!src){window.alert('Güvenli bir görsel adresi girin.');return;}
    const alt=window.prompt('Görsel alternatif metni')||'';
    insert('<figure><img src="'+escapeHtml(src)+'" alt="'+escapeHtml(alt)+'" /></figure><p><br></p>');
  };
  const insertTable=()=>{
    const rows=Math.min(20,Math.max(1,Number(window.prompt('Satır sayısı (başlık hariç)','3'))||3));
    const cols=Math.min(12,Math.max(1,Number(window.prompt('Sütun sayısı','3'))||3));
    const headers='<thead><tr>'+Array.from({length:cols},(_,i)=>'<th>Sütun '+(i+1)+'</th>').join('')+'</tr></thead>';
    const body='<tbody>'+Array.from({length:rows},()=>'<tr>'+Array.from({length:cols},()=>'<td><br></td>').join('')+'</tr>').join('')+'</tbody>';
    insert('<table>'+headers+body+'</table><p><br></p>');
  };
  const codeBlock=()=>{
    const lang=(window.prompt('Kod dili (ör. html, css, javascript)','')||'').replace(/[^a-zA-Z0-9+#-]/g,'');
    const sample=window.prompt('Kod içeriği','')||'';
    insert('<pre data-language="'+escapeHtml(lang)+'"><code>'+escapeHtml(sample)+'</code></pre><p><br></p>');
  };
  const changeTable=(axis:'row'|'column')=>{
    const s=window.getSelection();const node=s?.anchorNode;
    const cell=(node?.nodeType===1?node as Element:node?.parentElement)?.closest('td,th');
    const table=cell?.closest('table');if(!cell||!table){window.alert('Önce tablonun içine tıklayın.');return;}
    const tr=cell.closest('tr');if(!tr)return;
    if(axis==='row'){
      const clone=tr.cloneNode(true) as HTMLTableRowElement;
      for(const c of Array.from(clone.cells))c.textContent='';
      tr.after(clone);
    }else{
      const idx=Array.from(tr.cells).indexOf(cell as HTMLTableCellElement);
      for(const row of Array.from(table.rows)){
        const tag=row.parentElement?.tagName==='THEAD'?'th':'td';
        const next=document.createElement(tag);next.innerHTML='<br>';
        row.cells[idx]?.after(next);
      }
    }
    emit();
  };
  const item=(title:string,icon:React.ReactNode,click:()=>void)=>(
    <Button type="button" mode="icon" size="sm" variant="ghost" title={title} aria-label={title}
      onMouseDown={e=>e.preventDefault()} onClick={click}>{icon}</Button>
  );
  return <div className="overflow-hidden rounded-xl border bg-background">
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
      <select aria-label="Metin biçimi" title="Metin biçimi" defaultValue="p"
        className="h-8 rounded border bg-background px-2 text-xs"
        onMouseDown={remember} onChange={e=>{run('formatBlock',e.target.value);e.target.value='p'}} disabled={sourceMode}>
        <option value="p">Paragraf</option>{[1,2,3,4,5,6].map(n=><option key={n} value={'h'+n}>H{n} Başlık</option>)}
      </select>
      {item('Kalın',<Bold className="size-4"/>,()=>run('bold'))}
      {item('İtalik',<Italic className="size-4"/>,()=>run('italic'))}
      {item('Altı çizili',<Underline className="size-4"/>,()=>run('underline'))}
      {item('Üstü çizili',<Strikethrough className="size-4"/>,()=>run('strikeThrough'))}
      {item('Biçimi temizle',<RemoveFormatting className="size-4"/>,()=>run('removeFormat'))}
      <span className="mx-1 h-5 w-px bg-border"/>
      {item('Madde işaretli liste',<List className="size-4"/>,()=>run('insertUnorderedList'))}
      {item('Numaralı liste',<ListOrdered className="size-4"/>,()=>run('insertOrderedList'))}
      {item('Alıntı',<Quote className="size-4"/>,()=>run('formatBlock','blockquote'))}
      {item('Bağlantı ekle',<Link2 className="size-4"/>,promptLink)}
      {item('Bağlantıyı kaldır',<Unlink className="size-4"/>,()=>run('unlink'))}
      <span className="mx-1 h-5 w-px bg-border"/>
      {item('Tablo ekle',<Table2 className="size-4"/>,insertTable)}
      {item('Satır ekle',<Rows3 className="size-4"/>,()=>changeTable('row'))}
      {item('Sütun ekle',<Columns3 className="size-4"/>,()=>changeTable('column'))}
      {item('Kod bloğu',<Code2 className="size-4"/>,codeBlock)}
      {item('Görsel ekle',<ImagePlus className="size-4"/>,promptImage)}
      {item('Yatay çizgi',<Minus className="size-4"/>,()=>insert('<hr><p><br></p>'))}
      <span className="mx-1 h-5 w-px bg-border"/>
      {item('Geri al',<Undo2 className="size-4"/>,()=>run('undo'))}
      {item('İleri al',<Redo2 className="size-4"/>,()=>run('redo'))}
      {typeof onSourceChange==='function'?<Button type="button" variant={sourceMode?'primary':'outline'} size="sm"
        onMouseDown={remember} onClick={()=>setSourceMode(x=>!x)}><AlignLeft className="size-4"/> {sourceMode?'Görsel editör':'Markdown'}</Button>:null}
    </div>
    {sourceMode&&typeof onSourceChange==='function'?
      <textarea spellCheck={false} aria-label="Markdown kaynak kodu" value={sourceValue||''}
        style={{minHeight}} className="w-full resize-y bg-background p-5 font-mono text-sm leading-7 outline-none"
        onChange={e=>onSourceChange(e.target.value)}/>:
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={()=>{remember();emit()}}
        onMouseUp={remember} onKeyUp={remember} style={{minHeight}}
        className="prose max-w-none overflow-auto p-5 text-sm leading-7 outline-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_pre]:whitespace-pre-wrap [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4"
      />}
  </div>;
}
