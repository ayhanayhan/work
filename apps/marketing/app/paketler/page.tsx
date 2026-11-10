import type {Metadata} from 'next';
import SiteShell from '@/components/site-shell';
import LegacyScripts from '@/components/legacy-scripts';
import {getPricingFeed} from '@/lib/pricing';
import {ORIGINAL_PRICING_CARDS,ORIGINAL_PRICING_CATEGORIES,ORIGINAL_PRICING_ROWS} from '@/lib/pricing-original-data';
import PricingFaq from './pricing-faq';
import {headers} from 'next/headers';
import {getWebsiteLocales} from '@/lib/blog';

const API_PLANS=['start','grow','scale'];
const SYMBOL:Record<string,string>={TRY:'₺',EUR:'€',USD:'$',GBP:'£'};
const tl=(number:number)=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(number);
type SourceRow=(typeof ORIGINAL_PRICING_ROWS)[number];
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{
 const req=await headers(),path=req.get('x-marketing-page')||'/paketler';
 const lang=path.match(/^\/(en|de|ru|ar|bg|uk|id|vi)\//)?.[1]||'tr';
 const prefix=lang==='tr'?'':'/'+lang;
 const langs=await getWebsiteLocales();
 const base='https://ticarti.com';
 return {title:'E-Ticaret Paketleri ve Fiyatları | Ticarti',description:'Start, Grow ve Scale paketlerini karşılaştır. E-ticaret özelliklerini, pazaryeri, muhasebe ve kargo entegrasyonlarını incele.',
  alternates:{canonical:base+prefix+'/paketler',languages:Object.fromEntries(langs.map(code=>[code,base+(code==='tr'?'':'/'+code)+'/paketler']))}};
}
export default async function PricingPage(){
 const req=await headers(),path=req.get('x-marketing-page')||'/paketler';
 const lang=path.match(/^\/(en|de|ru|ar|bg|uk|id|vi)\//)?.[1]||'tr';
 const feed=await getPricingFeed(lang);
 const plans=API_PLANS.map(code=>feed?.plans.find(p=>p.code.toLowerCase()===code));
 const categories=[...ORIGINAL_PRICING_CATEGORIES.map(c=>({id:c.id,title:feed?.categories.find(x=>x.id===c.id)?.title||c.title})),
 ...(feed?.categories||[]).filter(c=>!ORIGINAL_PRICING_CATEGORIES.some(x=>x.id===c.id))];
 const saved=feed?.features||[];
 const rows=[...ORIGINAL_PRICING_ROWS.map(r=>({...r,title:saved.find(x=>x.id===r.id)?.title||r.title,
 description:saved.find(x=>x.id===r.id)?.description||r.description})),
 ...saved.filter(x=>!ORIGINAL_PRICING_ROWS.some(r=>r.id===x.id)).map(x=>({...x,values:['—','—','—']}))];
 const selected=(p:NonNullable<(typeof plans)[number]>,featureId:string)=>{
   const entry=p.featureValues?.find(x=>x.featureId===featureId);
   return entry?{enabled:entry.enabled,value:entry.value}:{
     enabled:p.featureIds.includes(featureId),value:''};
 };
 const planRow=(row:SourceRow|typeof rows[number],index:number)=>{
  const p=plans[index];
  if(!p)return {value:row.values[index]||'—',enabled:row.values[index]!=='—'};
  const entry=p.featureValues?.find(x=>x.featureId===row.id);
  if(!entry && !p.featureIds.includes(row.id))return {value:row.values[index]||'—',enabled:row.values[index]!=='—'};
  const state=selected(p,row.id);
  return {value:state.value||(state.enabled?'✓':'—'),enabled:state.enabled};
 };
 const faq=feed?.faq;
 return <>
 <SiteShell><main className="tc-pricing-page" id="tc-pricing-top">
  <section className="tc-pricing-hero"><div className="tc-pricing-container">
   <div className="tc-site-hero__inner tc-pricing-hero-inner">
    <h1 className="tc-site-hero__title tc-site-hero__title--plain"><span>İhtiyacına göre başla.<br/>Büyüdükçe güçlen.</span></h1>
    <div className="tc-site-hero__subtitle" data-role="pricing-subtitle">Yeni açılan bir mağazadan yüksek hacimli operasyonlara kadar: ürünlerini, siparişlerini, ödemelerini ve pazarlamanı tek panelden yönet. Sana uygun paketi seç.</div>
   </div>
   <div className="tc-plan-grid">
    {ORIGINAL_PRICING_CARDS.map((source,index)=>{
     const p=plans.find(x=>x?.code.toLowerCase()===source.code);
     const plus=source.code==='plus';
     const price=p?.price??(Number(source.price.replace(/\./g,''))||0);
     const old=p?.originalPrice;
     return <article key={source.code} className={'tc-plan-card'+(source.code==='grow'?' tc-plan-featured':'')+(plus?' tc-plan-enterprise':'')}>
       <div className="tc-card-top">
        {source.code==='grow'?<span className="tc-popular">{p?.badge||'En çok tercih edilen'}</span>:null}
        <h2>{p?.name||source.name}</h2>
        <p className="tc-plan-desc">{p?.description||source.description}</p>
        {plus?<><div className="tc-price-line tc-price-special">Özel fiyat</div><p className="tc-tax-note">İhtiyacına özel teklif</p></>:
        <><div className="tc-price-line"><span className="tc-price-currency">{SYMBOL[p?.currency||'TRY']||'₺'}</span>
           <span className="tc-price">{p?tl(price):source.price}</span><span className="tc-price-suffix">/yıl</span></div>
         <p className="tc-price-discount"><s className="tc-old-price">{old!==null&&old!==undefined?(SYMBOL[p?.currency||'TRY']||'₺')+tl(old)+'/yıl':source.oldPrice.replaceAll('/ay','/yıl')}</s>
          <span className="tc-tax-note">{p?.vatIncluded===false?'KDV hariç':'KDV dahil'}</span></p></>}
        <a className="tc-cta tc-site-hero__cta tc-site-hero__cta--1" href={plus?'/iletisim':'https://login.ticarti.com/register?plan='+source.code}>
          {p?.buttonText||source.ctaText}<span aria-hidden="true">↗</span>
        </a>
       </div>
       <div className="tc-plan-benefits"><p className="tc-benefits-heading">{source.benefitsHeading}</p>
        <ul className="tc-rich-benefits">{source.benefits.map((benefit,i)=><li key={i}>
          <span aria-hidden="true" className="tc-feature-check">✓</span>
          <span><strong>{benefit.title}</strong>{benefit.label?<span className="tc-mini-label">{benefit.label}</span>:null}<small>{benefit.description}</small></span>
        </li>)}</ul>
       </div>
      </article>;
    })}
   </div>
  </div></section>
  <section className="tc-comparison" id="tc-compare"><div className="tc-pricing-container">
    <div className="tc-compare-heading tc-site-hero__inner">
     <p className="tc-comparison-eyebrow">PAKET KARŞILAŞTIRMASI</p>
     <h2 className="tc-site-hero__title tc-site-hero__title--plain"><span>Paketleri tüm ayrıntılarıyla<br/>karşılaştır.</span></h2>
     <div className="tc-site-hero__subtitle tc-comparison-lead">Özellikleri ve entegrasyon sağlayıcılarını paket bazında karşılaştır.</div>
    </div>
    <div aria-label="Paket karşılaştırması" className="tc-table-scroll" role="region" tabIndex={0}>
     <table><thead><tr>
      <th scope="col"><label className="tc-compare-search"><span className="tc-search-symbol" aria-hidden="true">⌕</span><input id="tc-feature-search" type="search" autoComplete="off" aria-label="Özelliklerde ara" placeholder="Özellikler içinde ara"/></label>
       <span className="tc-search-status" id="tc-search-status" aria-live="polite"/>
       <label className="tc-diff-filter"><input id="tc-only-differences" role="switch" type="checkbox" aria-label="Sadece farklı olan özellikleri listele"/><span aria-hidden="true" className="tc-diff-track"><span className="tc-diff-thumb"/></span><span>Sadece farklı olan özellikleri listele</span></label>
      </th>
      {API_PLANS.map((code,i)=>{const p=plans.find(x=>x?.code.toLowerCase()===code);
       const source=ORIGINAL_PRICING_CARDS[i];
       const symbol=SYMBOL[p?.currency||'TRY']||'₺';
       return <th scope="col" key={code}><span className="tc-th-plan">{p?.name||source.name}</span>
        <span className="tc-th-price-line"><span>{symbol}</span><span className="tc-th-price">{p?tl(p.price):source.price}</span><span className="tc-th-suffix">/yıl</span></span>
        <span className="tc-th-old tc-old-price">{p?.originalPrice!=null?symbol+tl(p.originalPrice)+'/yıl':source.oldPrice.replaceAll('/ay','/yıl')}</span>
        <a className="tc-sticky-cta" href={'https://login.ticarti.com/register?plan='+code}>Ücretsiz dene</a>
       </th>})}
     </tr></thead>
     <tbody>{categories.map(cat=>{
       const features=rows.filter(row=>row.categoryId===cat.id);if(!features.length)return null;
       return <ReactFragment key={cat.id} title={cat.title} rows={features} planRow={planRow}/>;
     })}</tbody>
     </table>
    </div>
  </div><p className="tc-no-results" id="tc-no-results" hidden>Aramanla eşleşen özellik bulunamadı.</p></section>
  {faq?.enabled!==false&&faq?.items?.length?<PricingFaq faq={faq}/>:null}
 </main></SiteShell>
 <LegacyScripts sources={['/assets/js/pages/pricing.js?v=20261111-native']} htmlClasses="tc-page-pricing tc-vendor-aos tc-vendor-theme tc-vendor-casos-hero tc-vendor-casos-highlight"/>
 </>;
}
function ReactFragment({title,rows,planRow}:{title:string;rows:any[];planRow:(row:any,index:number)=>{value:string;enabled:boolean}}){
 return <>
  <tr className="tc-table-group"><th colSpan={4} scope="colgroup">{title}</th></tr>
  {rows.map(row=><tr key={row.id}><th scope="row"><div className="tc-feature-meta"><div className="tc-feature-title-row"><strong>{row.title}</strong></div>
   <p className="tc-feature-description">{row.description}</p></div></th>
   {[0,1,2].map(i=>{const cell=planRow(row,i),isCheck=cell.enabled&&['✓','✔','Dahil'].includes(cell.value);
    return <td key={i}><span className={cell.enabled?(isCheck?'tc-check':'tc-val'):'tc-dash'}>{cell.value}</span></td>;
   })}
  </tr>)}
 </>;
}
