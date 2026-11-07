import {createElement,type ReactNode} from 'react';

/** Render only small formatting tags entered by trusted CMS editors.
 * Unknown tags and attributes are discarded, never executed.
 */
export function SimpleHtml({html}:{html:string}):ReactNode{
 const root:{tag:string;children:ReactNode[]}={tag:'root',children:[]};
 const stack=[root];
 const tokens=String(html||'').slice(0,20000).match(/<[^>]*>|[^<]+|</g)||[];
 for(const token of tokens){
  const br=/^<br\s*\/?\s*>$/i.test(token);
  if(br){stack[stack.length-1].children.push(createElement('br',{key:stack[stack.length-1].children.length}));continue;}
  const close=/^<\/(b|strong|i|em|u|span|a)>$/i.exec(token);
  if(close){
   if(stack.length>1&&stack[stack.length-1].tag===close[1].toLowerCase()){
    const node=stack.pop()!;
    stack[stack.length-1].children.push(createElement(node.tag,
      {...(node as any).props,key:stack[stack.length-1].children.length},...node.children));
   }
   continue;
  }
  const open=/^<(b|strong|i|em|u|span|a)(\s+[^>]*)?>$/i.exec(token);
  if(open&&stack.length<12){
   const tag=open[1].toLowerCase(),attrs=open[2]||'';
   const props:Record<string,string>={};
   if(tag==='a'){
    const match=/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const url=(match?.[1]||match?.[2]||'').trim();
    if(url.startsWith('/')&&!url.startsWith('//')||/^https:\/\/[^\s"'<>]+$/i.test(url))props.href=url;
   }
   stack.push({tag,children:[],props} as any);
   continue;
  }
  if(!token.startsWith('<'))stack[stack.length-1].children.push(token.replace(/&nbsp;/g,'\u00a0').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'));
 }
 while(stack.length>1){
  const node=stack.pop()!;
  stack[stack.length-1].children.push(createElement(node.tag,{...(node as any).props,key:stack[stack.length-1].children.length},...node.children));
 }
 return createElement('span',null,...root.children);
}
