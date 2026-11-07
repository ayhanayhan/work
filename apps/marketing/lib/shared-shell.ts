/** Remove only the duplicated layout wrappers from an original HTML page.
 * This keeps page-specific markup, scripts, and CSS classes untouched.
 * Header and footer are rendered exclusively by the shared React shell.
 */
function removeBalancedDiv(html:string,anchor:string):string{
 const at=html.indexOf(anchor);
 if(at<0)throw new Error('Legacy page shell marker not found: '+anchor);
 const start=html.lastIndexOf('<div',at);
 if(start<0)throw new Error('Legacy layout opening div not found');
 const firstEnd=html.indexOf('>',at);
 if(firstEnd<0)throw new Error('Legacy layout opening tag incomplete');
 const tokens=/<div\b[^>]*>|<\/div\s*>/gi;
 tokens.lastIndex=start;
 let depth=0,token:RegExpExecArray|null;
 while((token=tokens.exec(html))){
   if(/^<div\b/i.test(token[0]))depth++;
   else depth--;
   if(depth===0)return html.slice(0,start)+html.slice(tokens.lastIndex);
 }
 throw new Error('Unclosed legacy shell wrapper: '+anchor);
}
export function stripLegacyShell(html:string){
 let result=removeBalancedDiv(html,'id="tc-widget-014"');
 result=removeBalancedDiv(result,'id="tc-widget-006"');
 return result;
}
