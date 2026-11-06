'use client';
import {useMemo} from 'react';
import {TicartiRichTextEditor} from '@/app/(protected)/components/ticarti-rich-text-editor';

const escape=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const safeUrl=(v:string)=>/^(https:\/\/|http:\/\/|\/assets\/)[^\s<>"']+$/i.test(v)?v:'';
const inline=(v:string)=>escape(v)
  .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g,'<em>$1</em>')
  .replace(/~~([^~]+)~~/g,'<del>$1</del>')
  .replace(/`([^`]+)`/g,'<code>$1</code>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/assets\/[^\s)]+)\)/g,(_a,t,u)=>safeUrl(u)?'<a href="'+escape(u)+'">'+t+'</a>':t);
function markdownToHtml(raw:string){
  const lines=raw.replace(/\r\n?/g,'\n').split('\n');
  const output:string[]=[];let paragraph:string[]=[],list:string[]=[],ordered=false,code:string[]|null=null,language='';
  const flush=()=>{if(paragraph.length){output.push('<p>'+paragraph.map(inline).join(' ')+'</p>');paragraph=[]}
    if(list.length){output.push('<'+(ordered?'ol':'ul')+'>'+list.map(v=>'<li>'+inline(v)+'</li>').join('')+'</'+(ordered?'ol':'ul')+'>');list=[]}};
  const tableRow=(line:string)=>line.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
  for(let i=0;i<lines.length;i++){
    const t=lines[i].trim();
    if(code){if(/^```\s*$/.test(t)){output.push('<pre data-language="'+escape(language)+'"><code>'+escape(code.join('\n'))+'</code></pre>');code=null;language='';}else code.push(lines[i]);continue}
    const fence=/^```([\w+#-]*)\s*$/.exec(t);
    if(fence){flush();code=[];language=fence[1];continue}
    if(!t){flush();continue}
    if(/^\|?\s*[:-]+\s*\|/.test(lines[i+1]||'')&&t.includes('|')){
      flush();const heads=tableRow(t);output.push('<table><thead><tr>'+heads.map(v=>'<th>'+inline(v)+'</th>').join('')+'</tr></thead><tbody>');
      i++;while(i+1<lines.length&&lines[i+1].trim().includes('|')){
        i++;const cells=tableRow(lines[i]);output.push('<tr>'+heads.map((_,n)=>'<td>'+inline(cells[n]||'')+'</td>').join('')+'</tr>');
      }
      output.push('</tbody></table>');continue;
    }
    const h=/^(#{1,6})\s+(.+)$/.exec(t);
    if(h){flush();output.push('<h'+h[1].length+'>'+inline(h[2])+'</h'+h[1].length+'>');continue}
    const b=/^[-*]\s+(.+)$/.exec(t),o=/^\d+\.\s+(.+)$/.exec(t);
    if(b||o){if(paragraph.length)flush();if(list.length&&ordered!==!!o)flush();ordered=!!o;list.push((b||o)![1]);continue}
    if(/^>\s?/.test(t)){flush();output.push('<blockquote>'+inline(t.replace(/^>\s?/,''))+'</blockquote>');continue}
    if(/^(-{3,}|\*{3,})$/.test(t)){flush();output.push('<hr/>');continue}
    const image=/^!\[([^\]]*)\]\(([^)]+)\)$/.exec(t);
    if(image){flush();const src=safeUrl(image[2]);if(src)output.push('<figure><img src="'+escape(src)+'" alt="'+escape(image[1])+'"/></figure>');continue}
    if(list.length)flush();paragraph.push(t);
  }
  flush();if(code)output.push('<pre data-language="'+escape(language)+'"><code>'+escape(code.join('\n'))+'</code></pre>');
  return output.join('');
}
function htmlToMarkdown(html:string){
  const body=new DOMParser().parseFromString(html,'text/html').body;
  const walk=(node:Node):string=>{
    if(node.nodeType===Node.TEXT_NODE)return node.textContent||'';
    if(node.nodeType!==Node.ELEMENT_NODE)return '';
    const el=node as HTMLElement,tag=el.tagName.toLowerCase();
    if(['script','style','iframe','object','embed','svg','form'].includes(tag))return '';
    const child=()=>Array.from(el.childNodes).map(walk).join('');
    switch(tag){
      case 'strong':case 'b':return '**'+child()+'**';
      case 'em':case 'i':return '*'+child()+'*';
      case 'del':case 's':case 'strike':return '~~'+child()+'~~';
      case 'code':return el.parentElement?.tagName.toLowerCase()==='pre'?el.textContent||'':'`'+child().replace(/`/g,'')+'`';
      case 'pre':return '\n\n```'+(el.getAttribute('data-language')||'').replace(/[^a-zA-Z0-9+#-]/g,'')+'\n'+(el.textContent||'').replace(/\n$/,'')+'\n```\n\n';
      case 'h1':case 'h2':case 'h3':case 'h4':case 'h5':case 'h6':return '\n\n'+'#'.repeat(Number(tag[1]))+' '+child().trim()+'\n\n';
      case 'blockquote':return '\n\n'+child().trim().split('\n').map(x=>'> '+x).join('\n')+'\n\n';
      case 'hr':return '\n\n---\n\n';
      case 'br':return '\n';
      case 'a':{const url=safeUrl(el.getAttribute('href')||'');return url?'['+child()+']('+url+')':child()}
      case 'img':{const url=safeUrl(el.getAttribute('src')||'');return url?'!['+(el.getAttribute('alt')||'').replace(/[\[\]]/g,'')+']('+url+')':''}
      case 'figure':return '\n\n'+child()+'\n\n';
      case 'ul':return '\n\n'+Array.from(el.children).filter(x=>x.tagName.toLowerCase()==='li').map(x=>'- '+walk(x).trim()).join('\n')+'\n\n';
      case 'ol':return '\n\n'+Array.from(el.children).filter(x=>x.tagName.toLowerCase()==='li').map((x,i)=>(i+1)+'. '+walk(x).trim()).join('\n')+'\n\n';
      case 'li':return child();
      case 'table':{
        const rows=Array.from(el.querySelectorAll('tr'));if(!rows.length)return '';
        const cells=(row:Element)=>Array.from(row.children).filter(x=>['td','th'].includes(x.tagName.toLowerCase()))
          .map(x=>walk(x).replace(/\s+/g,' ').replace(/\|/g,'\\|').trim());
        const heads=cells(rows[0]),cols=heads.length;
        return '\n\n| '+heads.join(' | ')+' |\n| '+Array.from({length:cols},()=> '---').join(' | ')+' |\n'+
          rows.slice(1).map(row=>'| '+cells(row).concat(Array(cols).fill('')).slice(0,cols).join(' | ')+' |').join('\n')+'\n\n';
      }
      case 'p':case 'div':return '\n\n'+child()+'\n\n';
      default:return child();
    }
  };
  return Array.from(body.childNodes).map(walk).join('').replace(/\n{3,}/g,'\n\n').trim();
}
export function WebsiteBlogRichText({value,onChange,editorKey}:{value:string;onChange:(value:string)=>void;editorKey:string}){
  const initial=useMemo(()=>markdownToHtml(value),[editorKey]);
  return <TicartiRichTextEditor key={editorKey} initialValue={initial}
    sourceValue={value} onSourceChange={onChange} onChange={html=>onChange(htmlToMarkdown(html))}
    minHeight={360}/>;
}
