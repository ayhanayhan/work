/** Ticarti calculators. Amounts are TRY except where specified. Rates as of 2026-11-09.
 * References (verified 2026):
 * GIB VAT: https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv/yardim-kaynaklar/yararli-bilgiler/kdv-oranlari.pdf
 * GIB wage tariff: https://gib.gov.tr/mevzuat/kanun/433/madde/6937
 * SGK 2026: https://sgk.gov.tr/Content/Post/2e0c9e1a-2cfe-4456-af10-49d3de0c58ba/Prime-Esas-Kazanc-Miktarlari-2026-01-14-10-35-39
 * 2026 minimum wage: https://csgb.gov.tr/poco-pages/asgari-ucret/
 * Amazon official seller fees: https://satis.amazon.com.tr/ucretlendirme
 * Other marketplaces: use the user's contracted commission rate; not a guessed category preset.
 */
export const money=(value:number,locale='tr')=>
 new Intl.NumberFormat(locale==='tr'?'tr-TR':locale,{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(value);
export const format=(value:number,locale='tr',digits=2)=>
 new Intl.NumberFormat(locale==='tr'?'tr-TR':locale,{maximumFractionDigits:digits}).format(value);
export const finite=(n:number,min=0,max=100000000000)=>Number.isFinite(n)&&n>=min&&n<=max;
export const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function vat(amount:number,rate:number,included:boolean){
 if(!finite(amount)||!finite(rate,0,100))throw Error('invalid');
 const net=amount/(included?1+rate/100:1);
 const tax=net*rate/100;
 return {net:round(net),tax:round(tax),gross:round(net+tax)};
}
export function desi(width:number,length:number,height:number,weight:number,divisor:number){
 if(![width,length,height].every(v=>finite(v,0.01,100000))||
  !finite(weight,0,100000)||!finite(divisor,100,100000))throw Error('invalid');
 const volumetric=width*length*height/divisor;
 return {desi:round(volumetric),chargeable:round(Math.max(weight,volumetric)),weight:round(weight)};
}
export function commission(input:{
 price:number;rate:number;rateIncludesVat:boolean;commissionVat:number;
 shipping:number;productCost:number;other:number;units:number;shippingCollected?:number;
}){
 const {price,rate,rateIncludesVat,commissionVat,shipping,productCost,other,units}=input;
 if(![price,rate,commissionVat,shipping,productCost,other,units,input.shippingCollected??0].every(x=>Number.isFinite(x))||
  price<=0||!Number.isInteger(units)||units<1||units>100000||rate<0||rate>100||commissionVat<0||commissionVat>100||
  Math.min(shipping,productCost,other,input.shippingCollected??0)<0)throw Error('invalid');
 // Amazon referral fees include customer-paid shipping in the charged selling total.
 const sale=(price+(input.shippingCollected??0))*units;
 const raw=sale*rate/100;
 const fee=rateIncludesVat?raw/(1+commissionVat/100):raw;
 const tax=rateIncludesVat?raw-fee:fee*commissionVat/100;
 const total=fee+tax;
 const expenses=(shipping+productCost+other)*units;
 return {sale:round(sale),fee:round(fee),tax:round(tax),total:round(total),
  expenses:round(expenses),remainder:round(sale-total-expenses),
  margin:round((sale-total-expenses)/sale*100)};
}
const BRACKETS:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[
 [190000,.15],[400000,.2],[1500000,.27],[5300000,.35],[Infinity,.4]];
export const SALARY_2026={minimum:33030,sgkCap:297270,sgkWorker:.14,unemployment:.01,
 stamp:.00759,year:2026} as const;
export function progressiveTax(base:number){
 let tax=0,from=0;
 for(const [to,rate] of BRACKETS){
  const part=Math.max(0,Math.min(base,to)-from);
  tax+=part*rate;
  if(base<=to)break;
  from=to;
 }
 return tax;
}
/** Simulated fixed monthly gross from January to chosen month.
 * Standard 4/a insured private-sector payroll, no disability/family/SGK incentive/extras.
 * Minimum-wage tax exemption follows monthly progressive cumulative threshold.
 */
export function salary2026(gross:number,month:number){
 if(!finite(gross,SALARY_2026.minimum,10000000)||!Number.isInteger(month)||month<1||month>12)
  throw Error('invalid');
 const sgkBase=Math.min(gross,SALARY_2026.sgkCap);
 const sgk=sgkBase*.14,unemployment=sgkBase*.01;
 const taxable=gross-sgk-unemployment;
 const minTaxable=SALARY_2026.minimum*(1-.15);
 const incomeTaxGross=progressiveTax(taxable*month)-progressiveTax(taxable*(month-1));
 const exempt=progressiveTax(minTaxable*month)-progressiveTax(minTaxable*(month-1));
 const incomeTax=Math.max(0,incomeTaxGross-exempt);
 const stamp=Math.max(0,(gross-SALARY_2026.minimum)*SALARY_2026.stamp);
 const net=gross-sgk-unemployment-incomeTax-stamp;
 return {gross:round(gross),net:round(net),sgk:round(sgk),unemployment:round(unemployment),
  taxable:round(taxable),incomeTax:round(incomeTax),stamp:round(stamp),
  employerBase:round(gross),month,year:2026};
}
export function salaryNetToGross(target:number,month:number){
 if(!finite(target,28075.5,6000000))throw Error('invalid');
 let low=SALARY_2026.minimum,high=Math.max(low*2,target*3);
 while(salary2026(high,month).net<target&&high<10000000)high*=1.4;
 for(let i=0;i<65;i++){
  const mid=(low+high)/2;
  if(salary2026(mid,month).net<target)low=mid;else high=mid;
 }
 return salary2026(high,month);
}
export function customs(input:{price:number;freight:number;insurance:number;
 exchange:number;dutyRate:number;extraDutyRate:number;exciseRate:number;
 vatRate:number;other:number}){
 const v=Object.values(input);
 if(!v.every(x=>Number.isFinite(x)&&x>=0)||input.exchange<=0||
  [input.dutyRate,input.extraDutyRate,input.exciseRate,input.vatRate].some(x=>x>100))
  throw Error('invalid');
 const cif=(input.price+input.freight+input.insurance)*input.exchange;
 const duty=cif*input.dutyRate/100;
 const extra=cif*input.extraDutyRate/100;
 const excise=(cif+duty+extra)*input.exciseRate/100;
 const vatBase=cif+duty+extra+excise+input.other;
 const vat=vatBase*input.vatRate/100;
 return {cif:round(cif),duty:round(duty),extra:round(extra),excise:round(excise),
  vat:round(vat),other:round(input.other),
  taxes:round(duty+extra+excise+vat),landed:round(cif+duty+extra+excise+vat+input.other)};
}
export const amazonCategories=[
 {label:'Fotoğraf makinesi',rate:9},{label:'Ev eğlence sistemleri',rate:11.5},
 {label:'Cep telefonu',rate:8},{label:'Giyim',rate:15.5},
 {label:'Bilgisayar',rate:7},{label:'Elektronik',rate:9.5},
 {label:'Elektronik aksesuarlar',rate:11},{label:'Kişisel bakım cihazları',rate:13.6},
 {label:'Yapı market',rate:12.7},{label:'Mutfak eşyaları ve dekorasyon',rate:15},
 {label:'Bahçe',rate:14},{label:'Mobilya',rate:14.5},
 {label:'Küçük ev aletleri',rate:11},{label:'Beyaz eşya',rate:7},
 {label:'Oyuncak ve oyunlar',rate:13},{label:'Kitap',rate:10.2},
 {label:'Bebek ürünleri',rate:11.5},{label:'Ofis ürünleri',rate:13},
 {label:'Spor',rate:10},{label:'Ayakkabı, çanta ve aksesuar',rate:17},
 {label:'Kol saati',rate:15.5},{label:'Bavul ve seyahat',rate:16},
 {label:'Sağlık ve kişisel bakım',rate:13.5},
 {label:'Video oyunu konsolları',rate:8.5},{label:'Video oyunları',rate:10},
 {label:'Otomotiv ve motosiklet',rate:12.5},{label:'Evcil hayvan',rate:13.5},
 {label:'Diğer',rate:10}
] as const;
