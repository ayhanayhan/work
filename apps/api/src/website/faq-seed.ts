import tr from './data/ticarti-faq-tr.json';
import en from './data/ticarti-faq-en.json';
import de from './data/ticarti-faq-de.json';
import ru from './data/ticarti-faq-ru.json';
import ar from './data/ticarti-faq-ar.json';

export const FAQ_SEED_MARKER='marketing_faq_five_locales_seed_20261108_v1';
export const FAQ_SEED_LOCALES=['tr','en','de','ru','ar'] as const;
type Entry={id:string;question:string;answer:string};
const source:Record<string,Entry[]>={tr:tr.items,en,de,ru,ar};
const labels:Record<string,{heading:string;description:string;button:string;buttonUrl:string}>={
 tr:{heading:'Sıkça sorulan sorular',description:'Paketler, mağaza kurulumu ve Ticarti hakkında başka soruların varsa bizimle iletişime geçebilirsin.',button:'Ekibimizle iletişime geç',buttonUrl:'/contacto.html'},
 en:{heading:'Frequently asked questions',description:'Have more questions about packages, store setup or Ticarti? Get in touch with our team.',button:'Contact our team',buttonUrl:'/en/contacto.html'},
 de:{heading:'Häufig gestellte Fragen',description:'Weitere Fragen zu Paketen, Shopeinrichtung oder Ticarti? Kontaktieren Sie unser Team.',button:'Unser Team kontaktieren',buttonUrl:'/de/contacto.html'},
 ru:{heading:'Часто задаваемые вопросы',description:'Есть вопросы о пакетах, настройке магазина или Ticarti? Свяжитесь с нашей командой.',button:'Связаться с командой',buttonUrl:'/ru/contacto.html'},
 ar:{heading:'الأسئلة الشائعة',description:'هل لديك أسئلة عن الباقات أو إعداد المتجر أو Ticarti؟ تواصل مع فريقنا.',button:'تواصل مع فريقنا',buttonUrl:'/ar/contacto.html'}
};
export function assertFaqSeeds(){
 for(const locale of FAQ_SEED_LOCALES){
  const entries=source[locale];
  if(entries.length!==30||new Set(entries.map(x=>x.id)).size!==30)throw Error('Invalid FAQ count: '+locale);
  for(let i=0;i<30;i++){
   if(entries[i]?.id!==source.tr[i]?.id||!entries[i].question?.trim()||!entries[i].answer?.trim())
    throw Error('Incomplete FAQ locale '+locale+' at '+(i+1));
  }
 }
}
export function mergeFaqSeed(module:any){
 assertFaqSeeds();
 const original=Array.isArray(module?.items)?module.items:[];
 const result=original.map((item:any)=>structuredClone(item));
 let inserted=0,filled=0;
 for(let i=0;i<30;i++){
  const id=source.tr[i].id,question=source.tr[i].question.trim();
  let existing=result.find((item:any)=>item.id===id||String(item.fields?.question?.tr||'').trim()===question);
  if(!existing){
   existing={id,enabled:true,sortOrder:result.length,fields:{question:{},answer:{}},
      assets:{image:'',logo:''},links:{href:''},storeId:''};
   result.push(existing);inserted++;
  }
  existing.fields=existing.fields||{};
  for(const key of ['question','answer'] as const){
   existing.fields[key]=existing.fields[key]||{};
   for(const locale of FAQ_SEED_LOCALES){
    const current=existing.fields[key][locale];
    if(typeof current!=='string'||!current.trim()){
     existing.fields[key][locale]=source[locale][i][key];
     filled++;
    }
   }
  }
 }
 const fields=structuredClone(module?.fields||{});
 for(const key of ['heading','description','button','buttonUrl'] as const){
  fields[key]=fields[key]||{};
  for(const locale of FAQ_SEED_LOCALES){
   if(!String(fields[key][locale]||'').trim())fields[key][locale]=labels[locale][key];
  }
 }
 return {module:{...module,configured:true,fields,items:result},inserted,filled};
}
