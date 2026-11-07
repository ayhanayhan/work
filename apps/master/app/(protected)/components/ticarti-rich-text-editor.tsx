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
  sourceValue?:string;onSourceChange?:(text:string)=>void;sourceToHtml?:(text:string)=>string;
  onHtmlSourceChange?:(html:string)=>void;htmlToSafeHtml?:(html:string)=>string;
};
function escapeHtml(value:string){
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function safeUrl(value:string){
  const v=value.trim();
  return /^(https:\/\/|http:\/\/|\/assets\/)[^\s<>"']+$/i.test(v)?v:null;
}
export function TicartiRichTextEditor({
  initialValue='',minHeight=220,onChange,sourceValue,onSourceChange,sourceToHtml,onHtmlSourceChange,htmlToSafeHtml
}:EditorProps){
  const ref=useRef<HTMLDivElement|null>(null);
  const [sourceMode,setSourceMode]=useState<'visual'|'markdown'|'html'>('visual');
  const [htmlDraft,setHtmlDraft]=useState('');
  const previousSourceMode=useRef<'visual'|'markdown'|'html'>('visual');
  const lastIncomingValue=useRef(initialValue);
  const lastEmittedValue=useRef<string|null>(null);
  const selection=useRef<Range|null>(null);
  useEffect(()=>{
    if(sourceMode==='visual'&&ref.current){
      const html=previousSourceMode.current==='html'&&htmlToSafeHtml?htmlToSafeHtml(htmlDraft):
        previousSourceMode.current==='markdown'&&sourceToHtml?sourceToHtml(sourceValue||''):initialValue;
      const changedExternally=initialValue!==lastIncomingValue.current&&initialValue!==lastEmittedValue.current;
      if(previousSourceMode.current!=='visual'||!ref.current.innerHTML||changedExternally)ref.current.innerHTML=html;
    }
    lastIncomingValue.current=initialValue;
    previousSourceMode.current=sourceMode;
  },[sourceMode,initialValue,sourceValue,sourceToHtml,htmlToSafeHtml,htmlDraft]);
  const emit=()=>{const html=ref.current?.innerHTML??'';lastEmittedValue.current=html;onChange?.(html)};
  const switchMode=(next:'visual'|'markdown'|'html')=>{
    if(next===sourceMode)return;
    if(sourceMode==='html'&&onHtmlSourceChange)onHtmlSourceChange(htmlDraft);
    if(next==='html')setHtmlDraft(sourceMode==='visual'?(ref.current?.innerHTML||''):(sourceToHtml?sourceToHtml(sourceValue||''):initialValue));
    setSourceMode(next);
  };
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
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
      <span className="text-xs font-semibold text-muted-foreground">İçerik Düzenleyici</span>
      {typeof onSourceChange==='function'?<div className="ml-auto flex items-center gap-1 rounded border bg-background p-1">
        <Button type="button" variant={sourceMode==='visual'?'primary':'ghost'} size="sm" onClick={()=>switchMode('visual')}>Görsel</Button>
        <Button type="button" variant={sourceMode==='markdown'?'primary':'ghost'} size="sm" onClick={()=>switchMode('markdown')}>Markdown</Button>
        {typeof onHtmlSourceChange==='function'?<Button type="button" variant={sourceMode==='html'?'primary':'ghost'} size="sm" onClick={()=>switchMode('html')}><Code2 className="size-4"/>HTML</Button>:null}
      </div>:null}

    </div>
    {sourceMode==='visual'?<div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
      <select aria-label="Metin biçimi" title="Metin biçimi" defaultValue="p"
        className="h-8 rounded border bg-background px-2 text-xs"
        onMouseDown={remember} onChange={e=>{run('formatBlock',e.target.value);e.target.value='p'}} disabled={sourceMode!=='visual'}>
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
    </div>:null}
    {sourceMode==='markdown'&&typeof onSourceChange==='function'?
      <textarea spellCheck={false} aria-label="Markdown kaynak kodu" value={sourceValue||''}
        style={{minHeight,maxHeight:480,overflowY:'auto'}} className="w-full resize-y bg-background p-5 font-mono text-sm leading-7 outline-none"
        onChange={e=>onSourceChange(e.target.value)}/>:
     sourceMode==='html'&&typeof onHtmlSourceChange==='function'?
      <textarea spellCheck={false} aria-label="HTML kaynak kodu" value={htmlDraft}
        style={{minHeight}} className="w-full resize-y bg-background p-5 font-mono text-sm leading-7 outline-none"
        onChange={e=>{setHtmlDraft(e.target.value);onHtmlSourceChange(e.target.value)}}/>:
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={()=>{remember();emit()}}
        onPaste={e=>{const txt=e.clipboardData.getData('text/plain').trim();
          if(htmlToSafeHtml&&/^<(?:!doctype|html|h[1-6]|p|div|section|article|ul|ol|table|blockquote|pre|figure|img|strong)\b/i.test(txt)){
            e.preventDefault();insert(htmlToSafeHtml(txt));
          }
        }}
        onMouseUp={remember} onKeyUp={remember} style={{minHeight,maxHeight:480,overflowY:'auto'}}
        className="prose max-w-none overflow-auto p-5 text-base leading-7 outline-none [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:my-4 [&_h1]:text-[36px] [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:my-4 [&_h2]:text-[30px] [&_h3]:font-bold [&_h3]:leading-tight [&_h3]:my-4 [&_h3]:text-[25px] [&_h4]:font-bold [&_h4]:leading-tight [&_h4]:my-4 [&_h4]:text-[21px] [&_h5]:font-bold [&_h5]:leading-tight [&_h5]:my-4 [&_h5]:text-[18px] [&_h6]:font-bold [&_h6]:leading-tight [&_h6]:my-4 [&_h6]:text-[16px] [&_p]:my-3 [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-6 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_pre]:whitespace-pre-wrap [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4"
      />}
    <div className="flex items-center justify-between border-t bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
      <span>{sourceMode==='html'?'HTML kaynak modu':sourceMode==='markdown'?'Markdown kaynak modu':'Görsel düzenleme'}</span>
      <span>Başlıklar · Tablo · Kod · Bağlantı</span>
    </div>
  </div>;
}
