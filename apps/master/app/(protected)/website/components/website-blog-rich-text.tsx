'use client';
import {useMemo} from 'react';
import {TicartiRichTextEditor} from '@/app/(protected)/components/ticarti-rich-text-editor';

// Keep the existing Markdown storage/output contract while reusing the exact
// merchant blog editing toolbar and editable surface.
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function inlineHtml(raw:string){
  return esc(raw)
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>');
}
function markdownToHtml(source:string){
  const lines=source.replace(/\r\n?/g,'\n').split('\n');
  const out:string[]=[];let paragraphs:string[]=[];let items:string[]=[];
  const flush=()=>{if(paragraphs.length){out.push('<p>'+paragraphs.map(inlineHtml).join(' ')+'</p>');paragraphs=[];}if(items.length){out.push('<ul>'+items.map(x=>'<li>'+inlineHtml(x)+'</li>').join('')+'</ul>');items=[];}};
  for(const line of lines){
    const t=line.trim();if(!t){flush();continue;}
    const heading=/^(#{2,4})\s+(.+)$/.exec(t);
    if(heading){flush();out.push('<h'+heading[1].length+'>'+inlineHtml(heading[2])+'</h'+heading[1].length+'>');continue;}
    const bullet=/^[-*]\s+(.+)$/.exec(t);
    if(bullet){if(paragraphs.length)flush();items.push(bullet[1]);continue;}
    if(items.length)flush();paragraphs.push(t);
  }flush();
  return out.join('');
}
function htmlToMarkdown(html:string){
  const root=new DOMParser().parseFromString(html,'text/html').body;
  const walk=(node:Node):string=>{
    if(node.nodeType===Node.TEXT_NODE)return node.textContent||'';
    if(node.nodeType!==Node.ELEMENT_NODE)return '';
    const element=node as HTMLElement;
    const children=Array.from(element.childNodes).map(walk).join('');
    switch(element.tagName.toLowerCase()){
      case 'strong':case 'b':return '**'+children+'**';
      case 'em':case 'i':return '*'+children+'*';
      case 'h2':return '\n\n## '+children+'\n\n';
      case 'h3':return '\n\n### '+children+'\n\n';
      case 'h4':return '\n\n#### '+children+'\n\n';
      case 'li':return '- '+children.trim()+'\n';
      case 'ul':return '\n'+children+'\n';
      case 'ol':return '\n'+Array.from(element.children).map((li,i)=>String(i+1)+'. '+walk(li).replace(/^-\s*/, '').trim()).join('\n')+'\n';
      case 'p':case 'div':return '\n\n'+children+'\n\n';
      case 'br':return '\n';
      case 'a':{
        const href=element.getAttribute('href')||'';
        return /^https:\/\/[^\s)]+$/i.test(href)?'['+children+']('+href+')':children;
      }
      default:return children;
    }
  };
  return Array.from(root.childNodes).map(walk).join('').replace(/\n{3,}/g,'\n\n').trim();
}
export function WebsiteBlogRichText({value,onChange,editorKey}:{value:string;onChange:(value:string)=>void;editorKey:string}){
  const initial=useMemo(()=>markdownToHtml(value),[editorKey]);
  return <TicartiRichTextEditor key={editorKey} initialValue={initial} onChange={html=>onChange(htmlToMarkdown(html))} minHeight={360}/>;
}
