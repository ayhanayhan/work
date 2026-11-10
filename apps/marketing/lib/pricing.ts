import {escapeHtml} from './blog';
type PublicPlan={code:string;name:string;description:string;badge:string;buttonText:string;cardFeatures:string;price:number;originalPrice:number|null;currency:string;vatIncluded:boolean;trialDays:number;featureIds:string[];featureValues?:{featureId:string;enabled:boolean;value:string}[]};
type Category={id:string;title:string};
type Feature={id:string;categoryId:string;title:string;description:string;isIntegration:boolean};
export type PricingFeed={locale:string;plans:PublicPlan[];categories:Category[];features:Feature[];faq:{enabled:boolean;heading:string;description:string;items:{id:string;question:string;answer:string}[]}};
const API=(process.env.API_ORIGIN||'').replace(/\/$/,'');
export async function getPricingFeed(locale:string):Promise<PricingFeed|null>{
 if(!API)return null;
 try{
  const response=await fetch(API+'/v1/public/website/pricing?lang='+encodeURIComponent(locale),{cache:'no-store',signal:AbortSignal.timeout(7000)});
  if(!response.ok)return null;
  const result=await response.json();
  return result&&Array.isArray(result.plans)&&Array.isArray(result.features)&&Array.isArray(result.categories)?result:null;
 }catch{return null;}
}
const safe=(v:unknown)=>escapeHtml(String(v??''));
const amount=(num:number)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:2}).format(num);
const currencySymbol=(currency:string)=>({TRY:'₺',USD:'$',EUR:'€',GBP:'£'} as Record<string,string>)[currency]||currency;
const money=(num:number,currency:string)=>{
 try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:2}).format(num)}
 catch{return safe(num)+' '+safe(currency)}
};

/**
 * Original-template pricing adapter.
 * Never rebuild cards, table shell, search inputs, layout or FAQ SVG controls.
 * Change only source element contents/attributes and append extra features with
 * the source theme's own row structure.
 */
const slug=(value:string)=>value.toLocaleLowerCase('tr')
 .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u')
 .replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const textContent=(html:string)=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const planCode=(p:PublicPlan)=>String(p.code||'').toLowerCase();
const planUrl=(p:PublicPlan)=>'https://login.ticarti.com/register?plan='+encodeURIComponent(p.code);
const updateText=(html:string,selector:string,value:string)=>{
 const expression=new RegExp('(<'+selector+'\\b[^>]*>)[\\s\\S]*?(<\\/'+selector+'>)','i');
 return html.replace(expression,(_all,open:string,close:string)=>open+safe(value)+close);
};
const replaceContents=(html:string,selector:string,value:string)=>html.replace(
 new RegExp('(<'+selector+'\\b[^>]*>)[\\s\\S]*?(<\\/'+selector+'>)','i'),
 (_all,open:string,close:string)=>open+value+close
);
function matchingElement(html:string,start:number,tag:string){
 const begin=html.indexOf('<'+tag,start);
 if(begin<0)return null;
 const re=new RegExp('<\\/?'+tag+'\\b[^>]*>','gi');
 re.lastIndex=begin;let depth=0;let token:RegExpExecArray|null;
 while((token=re.exec(html))!==null){
  depth+=token[0].startsWith('</')?-1:1;
  if(depth===0)return {start:begin,end:re.lastIndex,html:html.slice(begin,re.lastIndex)};
 }
 return null;
}
function updateCard(source:string,p:PublicPlan){
 let card=source;
 const price=amount(Number(p.price||0));
 const original=p.originalPrice===null?'':money(Number(p.originalPrice),p.currency)+'/yıl';
 card=card.replace(/(<h2\b[^>]*>)[\s\S]*?(<\/h2>)/i,(_m,a,b)=>a+safe(p.name)+b);
 card=card.replace(/(<p class="tc-plan-desc"[^>]*>)[\s\S]*?(<\/p>)/i,(_m,a,b)=>a+safe(p.description||'')+b);
 card=card.replace(/(<span class="tc-price-currency"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+safe(currencySymbol(p.currency))+b);
 card=card.replace(/(<span class="tc-price"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+price+b);
 card=card.replace(/(<span class="tc-price-suffix"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+'/yıl'+b);
 card=card.replace(/(<s class="tc-old-price"[^>]*>)[\s\S]*?(<\/s>)/i,(_m,a,b)=>a+safe(original)+b);
 card=card.replace(/(<span class="tc-tax-note"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+(p.vatIncluded?'KDV dahil':'KDV hariç')+b);
 card=card.replace(/(<a class="tc-cta tc-site-hero__cta tc-site-hero__cta--1" href=")[^"]*("[^>]*>)[\s\S]*?(<span aria-hidden="true">)/i,
 (_m,a,b,c)=>a+safe(planUrl(p))+b+safe(p.buttonText||'Ücretsiz dene')+c);
 // Keep the theme's original eight benefit rows, icons and typography untouched.
 // The full 109-feature catalogue is represented in the comparison table below.
 return card;
}
function updateCards(source:string,plans:PublicPlan[]){
 const grid=source.indexOf('<div class="tc-plan-grid">');
 if(grid<0)return source;
 const close=source.indexOf('<section class="tc-comparison"',grid);
 if(close<0)return source;
 let segment=source.slice(grid,close);
 const cards=[...segment.matchAll(/<article\b[\s\S]*?<\/article>/gi)];
 for(let i=cards.length-1;i>=0;i--){
  const match=cards[i],name=match[0].match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]||'';
  const plan=plans.find(p=>planCode(p)===slug(textContent(name)));
  if(plan)segment=segment.slice(0,match.index!)+updateCard(match[0],plan)+segment.slice(match.index!+match[0].length);
 }
 return source.slice(0,grid)+segment+source.slice(close);
}
function setCell(template:string,enabled:boolean,value:string){
 const display=enabled?(value||'Dahil'):(value||'—');
 const tag=enabled?'tc-val':'tc-dash';
 return template.replace(/<span class="(?:tc-val|tc-dash)"[^>]*>[\s\S]*?<\/span>/i,
 '<span class="'+tag+'">'+safe(display)+'</span>');
}
function planSelection(p:PublicPlan,featureId:string){
 const row=p.featureValues?.find(x=>x.featureId===featureId);
 return {enabled:row?row.enabled:p.featureIds.includes(featureId),value:row?.value||''};
}
function updateFeatureRow(source:string,feature:Feature,plans:PublicPlan[]){
 let row=source.replace(/(<strong>)[\s\S]*?(<\/strong>)/i,(_m,a,b)=>a+safe(feature.title)+b);
 row=row.replace(/(<p class="tc-feature-description"[^>]*>)[\s\S]*?(<\/p>)/i,
 (_m,a,b)=>a+safe(feature.description||'')+b);
 const cells=[...row.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/gi)];
 for(let i=cells.length-1;i>=0;i--){
  const cell=cells[i],p=plans[i];if(!p)continue;
  const choice=planSelection(p,feature.id);
  row=row.slice(0,cell.index!)+setCell(cell[0],choice.enabled,choice.value)+row.slice(cell.index!+cell[0].length);
 }
 return row;
}
function newFeatureRow(original:string,feature:Feature,plans:PublicPlan[]){
 let row=original.replace(/\sdata-tc-content-key="[^"]*"/g,'');
 row=updateFeatureRow(row,feature,plans);
 // A source row may have optional labels and disclosures that are not appropriate
 // for an unrelated provider. Keep core <tr>, <th>, <td>, icon and value classes.
 row=row.replace(/<span class="tc-feature-label"[^>]*>[\s\S]*?<\/span>/gi,'');
 row=row.replace(/<button class="tc-feature-info"[\s\S]*?<\/button>/gi,'');
 return row;
}
function updateComparison(html:string,feed:PricingFeed){
 const start=html.indexOf('<div aria-label="Paket karşılaştırması"');
 if(start<0)return html;
 const tableStart=html.indexOf('<table>',start);
 const tableEnd=html.indexOf('</table>',tableStart);
 if(tableStart<0||tableEnd<0)return html;
 let table=html.slice(tableStart,tableEnd+8);
 const headEnd=table.indexOf('</thead>');
 let head=table.slice(0,headEnd+8);
 const planHeaders=[...head.matchAll(/<th scope="col">[\s\S]*?<\/th>/gi)];
 for(let i=planHeaders.length-1;i>=1;i--){
  const p=feed.plans[i-1];if(!p)continue;
  let node=planHeaders[i][0];
  node=node.replace(/(<span class="tc-th-plan"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+safe(p.name)+b);
  node=node.replace(/(<span class="tc-th-price"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+amount(Number(p.price||0))+b);
  node=node.replace(/(<span class="tc-th-suffix"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+'/yıl'+b);
  node=node.replace(/(<span class="tc-th-old tc-old-price"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+(p.originalPrice===null?'':safe(money(p.originalPrice,p.currency)+'/yıl'))+b);
  node=node.replace(/(<a class="tc-sticky-cta" href=")[^"]*("[^>]*>)[\s\S]*?(<\/a>)/i,
    (_m,a,b,c)=>a+safe(planUrl(p))+b+safe(p.buttonText||'Ücretsiz dene')+c);
  // Keep the original table heading markup and price cells.
  head=head.slice(0,planHeaders[i].index!)+node+head.slice(planHeaders[i].index!+planHeaders[i][0].length);
 }
 const bodyStart=table.indexOf('<tbody>'),bodyEnd=table.indexOf('</tbody>');
 if(bodyStart<0||bodyEnd<0)return html;
 const originalBody=table.slice(bodyStart+7,bodyEnd);
 const rows=[...originalBody.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
 const byId=new Map(feed.features.map(f=>[f.id,f]));
 const seen=new Set<string>();
 let patched='';
 let firstSourceRow='';
 let firstGroupRow='';
 for(const match of rows){
  let row=match[0];
  if(row.includes('tc-table-group')){firstGroupRow ||= row;patched+=row;continue}
  firstSourceRow ||= row;
  const title=textContent(row.match(/<strong>([\s\S]*?)<\/strong>/i)?.[1]||'');
  const key='legacy-'+slug(title);
  const feature=byId.get(key);
  if(feature){row=updateFeatureRow(row,feature,feed.plans);seen.add(key);}
  patched+=row;
 }
 const extras=feed.features.filter(f=>!seen.has(f.id)&&feed.categories.some(c=>c.id===f.categoryId));
 if(firstSourceRow&&firstGroupRow){
  for(const cat of feed.categories){
   const features=extras.filter(f=>f.categoryId===cat.id);
   if(!features.length)continue;
   let group=firstGroupRow.replace(/(<th\b[^>]*>)[\s\S]*?(<\/th>)/i,(_m,a,b)=>a+safe(cat.title)+b)
     .replace(/\sdata-tc-content-key="[^"]*"/g,'');
   patched+=group+features.map(f=>newFeatureRow(firstSourceRow,f,feed.plans)).join('');
  }
 }
 table=head+table.slice(headEnd+8,bodyStart+7)+patched+table.slice(bodyEnd);
 return html.slice(0,tableStart)+table+html.slice(tableEnd+8);
}
function updateFaq(html:string,faq:PricingFeed['faq']){
 if(!faq?.enabled||!faq.items?.length)return html; // never destroy the source layout on unavailable data
 const faqStart=html.indexOf('<section class="tc-faq" id="tc-faq">');
 if(faqStart<0)return html;
 const listStart=html.indexOf('<div class="tc-faq__list">',faqStart);
 if(listStart<0)return html;
 const list=matchingElement(html,listStart,'div');
 if(!list)return html;
 const oldItems=[...list.html.matchAll(/<div class="tc-faq__item(?: is-open)?">/g)];
 if(!oldItems.length)return html;
 const first=matchingElement(list.html,oldItems[0].index!,'div');
 if(!first)return html;
 const replacement=faq.items.map((entry,i)=>{
  let item=first.html;
  item=item.replace('tc-faq__item is-open',i===0?'tc-faq__item is-open':'tc-faq__item');
  item=item.replace(/(aria-expanded=")[^"]*"/,'$1'+(i===0?'true':'false')+'"');
  item=item.replace(/tc-faq-head-\d+/g,'tc-faq-head-'+(i+1));
  item=item.replace(/tc-faq-panel-\d+/g,'tc-faq-panel-'+(i+1));
  item=item.replace(/(<span class="tc-faq__q-text"[^>]*>)[\s\S]*?(<\/span>)/i,(_m,a,b)=>a+safe(entry.question)+b);
  item=item.replace(/(<div class="tc-faq__answer"><p\b[^>]*>)[\s\S]*?(<\/p>)/i,(_m,a,b)=>a+safe(entry.answer)+b);
  return item;
 }).join('');
 const opening=list.html.slice(0,list.html.indexOf('>')+1);
 const updatedList=opening+replacement+'</div>';
 let result=html.slice(0,list.start)+updatedList+html.slice(list.end);
 result=result.replace(/(<h2 class="tc-faq__title"[^>]*>)[\s\S]*?(<\/h2>)/i,(_m,a,b)=>a+safe(faq.heading)+b);
 result=result.replace(/(<p class="tc-faq__subtitle"[^>]*>)[\s\S]*?(<\/p>)/i,(_m,a,b)=>a+safe(faq.description)+b);
 return result;
}
export function applyPricingFeed(html:string,feed:PricingFeed|null){
 if(!feed||!feed.plans?.length)return html; // preserve source theme until CMS becomes available
 let out=updateCards(html,feed.plans);
 out=updateComparison(out,feed);
 out=updateFaq(out,feed.faq);
 return out;
}
