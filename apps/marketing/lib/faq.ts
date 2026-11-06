import {escapeHtml} from './blog';

export type FaqEntry={id:string;question:string;answer:string};
export type FaqContent={enabled:boolean;configured:boolean;heading:string;description:string;items:FaqEntry[]};
const API_ORIGIN=(process.env.API_ORIGIN||'').replace(/\/$/,'');
const empty: FaqContent={enabled:true,configured:false,heading:'',description:'',items:[]};

/** All visible FAQ answers and the FAQPage schema must use this exact content. */
export async function getHomepageFaq(lang:string):Promise<FaqContent>{
  if(!API_ORIGIN)return empty;
  try{
    const r=await fetch(API_ORIGIN+'/v1/public/website/home?lang='+encodeURIComponent(lang),
      {next:{revalidate:30},signal:AbortSignal.timeout(3500)});
    if(!r.ok)return empty;
    const data=await r.json();
    const faq=Array.isArray(data?.modules)?data.modules.find((x:any)=>x?.id==='faq'):null;
    if(!faq)return empty;
    const localized=(field:any)=>typeof field?.[lang]==='string'?field[lang].trim():'';
    const items:Array<FaqEntry>=Array.isArray(faq.items)?faq.items
      .filter((item:any)=>item?.enabled!==false)
      .map((item:any)=>({id:String(item.id||''),question:localized(item.fields?.question),answer:localized(item.fields?.answer)}))
      .filter(item=>!!item.question&&!!item.answer):[];
    return {enabled:faq.enabled!==false,configured:Number(data.version)>0&&Array.isArray(faq.items)&&faq.items.length>0,
      heading:localized(faq.fields?.heading),description:localized(faq.fields?.description),items};
  }catch{return empty}
}
function findClosingDiv(html:string,from:number):number{
  const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=from;
  let depth=1,match:RegExpExecArray|null;
  while((match=tags.exec(html))!==null){
    if(/^<\/div/i.test(match[0]))depth--;
    else depth++;
    if(depth===0)return match.index+match[0].length;
  }
  return -1;
}
export function applyHomepageFaq(html:string,faq:FaqContent):string{
  if(!faq.enabled)return html.replace(/<section\b(?=[^>]*\bid="tc-faq")[^>]*>[\s\S]*?<\/section>/i,'');
  if(!faq.configured)return html; // Original site remains if no real CMS data was saved.
  const start=html.indexOf('<section class="tc-faq" id="tc-faq">');
  if(start<0)return html;
  const close=html.indexOf('</section>',start);
  if(close<0)return html;
  if(faq.items.length===0)return html.slice(0,start)+html.slice(close+'</section>'.length); // no untranslated fallback
  let section=html.slice(start,close+'</section>'.length);
  const icon=section.match(/<span\b[^>]*class="tc-faq__icon"[^>]*>[\s\S]*?<\/span>/)?.[0]||'<span aria-hidden="true" class="tc-faq__icon">⌄</span>';
  const listTag='<div class="tc-faq__list">';
  const listStart=section.indexOf(listTag);
  if(listStart<0)return html;
  const listEnd=findClosingDiv(section,listStart+listTag.length);
  if(listEnd<0)return html;
  const records=faq.items.map((item,i)=>{
    const id='tc-faq-cms-'+i,open=i===0;
    return '<div class="tc-faq__item'+(open?' is-open':'')+'">'+
      '<button type="button" class="tc-faq__question" id="'+id+'-heading" aria-controls="'+id+'-panel" aria-expanded="'+open+'">'+
      '<span class="tc-faq__q-text">'+escapeHtml(item.question)+'</span>'+icon+'</button>'+
      '<div class="tc-faq__panel" id="'+id+'-panel" aria-labelledby="'+id+'-heading" role="region">'+
      '<div class="tc-faq__answer"><p>'+escapeHtml(item.answer)+'</p></div></div></div>';
  }).join('');
  section=section.slice(0,listStart+listTag.length)+records+section.slice(listEnd-listTag.length);
  if(faq.heading)section=section.replace(/(<h2\b[^>]*class="tc-faq__title"[^>]*>)[\s\S]*?(<\/h2>)/,'$1'+escapeHtml(faq.heading)+'$2');
  if(faq.description)section=section.replace(/(<p\b[^>]*class="tc-faq__subtitle"[^>]*>)[\s\S]*?(<\/p>)/,'$1'+escapeHtml(faq.description)+'$2');
  section=section.replace('id="tc-faq"','id="tc-faq" data-tc-ssr-faq="1"');
  return html.slice(0,start)+section+html.slice(close+'</section>'.length);
}
