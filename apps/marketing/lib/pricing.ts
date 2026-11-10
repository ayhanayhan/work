import {escapeHtml} from './blog';
type PublicPlan={code:string;name:string;description:string;badge:string;buttonText:string;cardFeatures:string;price:number;originalPrice:number|null;currency:string;vatIncluded:boolean;trialDays:number;featureIds:string[]};
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
const money=(num:number,currency:string)=>{
 try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:2}).format(num)}
 catch{return safe(num)+' '+safe(currency)}
};
function planCards(data:PricingFeed){
 return data.plans.map((p,index)=>{
  const included=data.features.filter(f=>p.featureIds.includes(f.id)).slice(0,6);
  const benefits=included.length?included.map(f=>'<li><span aria-hidden="true" class="tc-feature-check">✓</span><span><strong>'+safe(f.title)+'</strong><small>'+safe(f.description)+'</small></span></li>').join(''):
   '<li><span aria-hidden="true" class="tc-feature-check">✓</span><span><strong>'+safe(p.description)+'</strong></span></li>';
  const url='https://login.ticarti.com/register?plan='+encodeURIComponent(p.code);
  return '<article class="tc-plan-card'+(p.badge?' tc-plan-card--popular':'')+'">'+
   '<div class="tc-card-top">'+(p.badge?'<p class="tc-plan-badge">'+safe(p.badge)+'</p>':'')+
   '<h2>'+safe(p.name)+'</h2><p class="tc-plan-desc">'+safe(p.description)+'</p>'+
   '<div class="tc-price-line"><span class="tc-price">'+money(p.price,p.currency)+'</span><span class="tc-price-suffix">/yıl</span></div>'+
   '<p class="tc-price-discount">'+(p.originalPrice!==null?'<s class="tc-old-price">'+money(p.originalPrice,p.currency)+'/yıl</s>':'')+
    '<span class="tc-tax-note">'+(p.vatIncluded?'KDV dahil':'KDV hariç')+'</span></p>'+
   '<a class="tc-cta tc-site-hero__cta tc-site-hero__cta--1" href="'+url+'">'+safe(p.buttonText||'Ücretsiz dene')+'<span aria-hidden="true">↗</span></a>'+
   '</div><div class="tc-plan-benefits"><p class="tc-benefits-heading">Paket kapsamındaki özellikler</p><ul class="tc-rich-benefits">'+benefits+'</ul></div></article>';
 }).join('');
}
function compareTable(data:PricingFeed){
 const plans=data.plans;
 const head='<thead><tr><th scope="col"><label class="tc-compare-search"><span aria-hidden="true" class="tc-search-symbol">⌕</span>'+
  '<input aria-label="Özelliklerde ara" autocomplete="off" id="tc-feature-search" placeholder="Özellikler içinde ara" type="search"/></label>'+
  '<span aria-live="polite" class="tc-search-status" id="tc-search-status"></span>'+
  '<label class="tc-diff-filter"><input aria-label="Sadece farklı olan özellikleri listele" id="tc-only-differences" role="switch" type="checkbox"/>'+
  '<span aria-hidden="true" class="tc-diff-track"><span class="tc-diff-thumb"></span></span><span>Sadece farklı olanlar</span></label></th>'+
  plans.map(p=>'<th scope="col"><span class="tc-th-plan">'+safe(p.name)+'</span><span class="tc-th-price-line"><span class="tc-th-price">'+money(p.price,p.currency)+'</span><span class="tc-th-suffix">/yıl</span></span>'+
   (p.originalPrice!==null?'<span class="tc-th-old tc-old-price">'+money(p.originalPrice,p.currency)+'</span>':'')+
   '<a class="tc-sticky-cta" href="https://login.ticarti.com/register?plan='+encodeURIComponent(p.code)+'">Ücretsiz dene</a></th>').join('')+'</tr></thead>';
 const groups=data.categories.filter(c=>data.features.some(f=>f.categoryId===c.id));
 const body=groups.map(cat=>'<tr class="tc-table-group"><th colspan="'+(plans.length+1)+'" scope="colgroup">'+safe(cat.title)+'</th></tr>'+
  data.features.filter(f=>f.categoryId===cat.id).map(f=>'<tr><th scope="row"><div class="tc-feature-meta"><div class="tc-feature-title-row"><strong>'+safe(f.title)+'</strong></div>'+
   (f.description?'<p class="tc-feature-description">'+safe(f.description)+'</p>':'')+'</div></th>'+
    plans.map(p=>'<td>'+(p.featureIds.includes(f.id)?
     '<span class="tc-val" aria-label="Paket kapsamında">✓</span>':'<span class="tc-dash" aria-label="Pakete dahil değil">—</span>')+'</td>').join('')+'</tr>').join('')
 ).join('');
 return '<table>'+head+'<tbody>'+body+'</tbody></table>';
}
function faqSection(faq:PricingFeed['faq']){
 if(!faq.enabled||!faq.items.length)return '';
 const questions=faq.items.map((f,i)=>{
  const id='tc-pricing-faq-'+i;
  return '<div class="tc-faq__item'+(i===0?' is-open':'')+'"><button type="button" class="tc-faq__question" id="'+id+'-heading" aria-controls="'+id+'-panel" aria-expanded="'+(i===0?'true':'false')+'">'+
   '<span class="tc-faq__q-text">'+safe(f.question)+'</span><span aria-hidden="true" class="tc-faq__icon">⌄</span></button>'+
   '<div class="tc-faq__panel" id="'+id+'-panel" role="region" aria-labelledby="'+id+'-heading"><div class="tc-faq__answer"><p>'+safe(f.answer)+'</p></div></div></div>';
 }).join('');
 return '<section class="tc-faq" id="tc-faq"><div class="tc-faq__inner"><div class="tc-faq__intro"><h2 class="tc-faq__title">'+safe(faq.heading||'Sıkça sorulan sorular')+'</h2><p class="tc-faq__subtitle">'+safe(faq.description)+'</p>'+
 '<a class="tc-faq__button" href="/iletisim">Ekibimizle iletişime geç</a></div><div class="tc-faq__list">'+questions+'</div></div></section>';
}
/** Replace pricing content only, retaining the original theme, shell, CSS and scripts. */
export function applyPricingFeed(html:string,feed:PricingFeed|null){
 if(!feed||!feed.plans.length){
  return html.replace(/<div class="tc-plan-grid">[\s\S]*?(?=<section class="tc-comparison")/i,'<div class="tc-plan-grid"><p>Paket bilgileri şu anda görüntülenemiyor.</p></div></div></section>\n')
   .replace(/<section class="tc-comparison"[\s\S]*?(?=<section class="tc-faq")/i,'')
   .replace(/<section class="tc-faq"[\s\S]*?<\/section>/i,'');
 }
 let out=html;
 const start=out.indexOf('<div class="tc-plan-grid">');
 const compare=out.indexOf('<section class="tc-comparison"',start);
 if(start>=0&&compare>start)out=out.slice(0,start)+'<div class="tc-plan-grid">'+planCards(feed)+'</div></div></section>\n'+out.slice(compare);
 const tableRegion=out.indexOf('<div aria-label="Paket karşılaştırması"');
 const tableStart=out.indexOf('<table>',tableRegion);
 const tableEnd=out.indexOf('</table>',tableStart);
 if(tableRegion>=0&&tableStart>tableRegion&&tableEnd>tableStart){
  out=out.slice(0,tableStart)+compareTable(feed)+out.slice(tableEnd+'</table>'.length);
 }
 out=out.replace('Her özellik için dört paketin kapsamını tek tabloda incele. Kategoriler ilerledikçe özellik seviyeleri de genişler.','Özellikleri ve entegrasyon sağlayıcılarını paket bazında karşılaştır.');
 const faqStart=out.indexOf('<section class="tc-faq" id="tc-faq">');
 if(faqStart>=0){
  const faqEnd=out.indexOf('</section>',faqStart);
  if(faqEnd>faqStart)out=out.slice(0,faqStart)+faqSection(feed.faq)+out.slice(faqEnd+'</section>'.length);
 }
 return out;
}
