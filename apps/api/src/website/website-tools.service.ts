import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

const KEY='marketing_tools_pages_v1';
export const TOOL_IDS=['qr-kod-olusturucu','kdv-hesaplama',
  'trendyol-komisyon-hesaplama','amazon-komisyon-hesaplama',
  'hepsiburada-komisyon-hesaplama','n11-komisyon-hesaplama',
  'ciceksepeti-komisyon-hesaplama','pazarama-komisyon-hesaplama',
  'maas-hesaplama','gumruk-vergisi-hesaplama','desi-hesaplama'] as const;
const INITIAL_TITLES=['QR Kod Oluşturucu','KDV Hesaplama',
  'Trendyol Komisyon Hesaplama','Amazon Komisyon Hesaplama',
  'Hepsiburada Komisyon Hesaplama','n11 Komisyon Hesaplama',
  'ÇiçekSepeti Komisyon Hesaplama','Pazarama Komisyon Hesaplama',
  'Net-Brüt Maaş Hesaplama','Gümrük Vergisi Hesaplama','Desi Hesaplama'];
const SCALAR_FIELDS=['title','subtitle','intro','calculatorTitle','calculatorDescription',
  'description','howItWorksTitle','howItWorks','exampleTitle','example',
  'faqTitle','ctaTitle','ctaText','ctaButton','ctaUrl','disclaimer',
  'seoTitle','seoDescription','imageAlt'] as const;
const ALLOWED_STATUS=['DRAFT','PUBLISHED'];
type Dict=Record<string,string>;
function clean(v:unknown,max=12000){return String(v===undefined||v===null?'':v).slice(0,max).trim()}
function cleanLocalized(value:any,max=12000):Dict{
 const result:Dict={};
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  for(const [locale,text] of Object.entries(value)){
   if(/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(locale))result[locale]=clean(text,max);
  }
 }
 return result;
}
const initial=()=>TOOL_IDS.map((id,index)=>({
 id,sortOrder:index,status:'DRAFT',image:'',
 fields:Object.fromEntries(SCALAR_FIELDS.map(field=>[field,field==='title'?{tr:INITIAL_TITLES[index]}:{}])),
 sections:[] as Array<{id:string;kind:string;title:Dict;body:Dict;image:string}>,
 faqs:[] as Array<{id:string;question:Dict;answer:Dict}>
}));
function normalize(raw:any,prev:any){
 const valid=TOOL_IDS.find(id=>id===raw?.id);
 if(!valid)throw new BadRequestException('Tanımsız araç kimliği.');
 const status=clean(raw.status,20);
 if(!ALLOWED_STATUS.includes(status))throw new BadRequestException('Geçersiz yayın durumu.');
 const image=clean(raw.image,2000);
 if(image&&!image.startsWith('/assets/')&&!/^https:\/\//.test(image))throw new BadRequestException('Görsel bağlantısı geçersiz.');
 const fields:any={};
 for(const key of SCALAR_FIELDS)fields[key]=cleanLocalized(raw.fields?.[key],key==='seoTitle'?160:key==='seoDescription'?320:12000);
 const sections=raw.sections;
 const faqs=raw.faqs;
 if(!Array.isArray(sections)||sections.length>30||!Array.isArray(faqs)||faqs.length>60)
  throw new BadRequestException('Bölüm veya SSS sayısı geçersiz.');
 const ids=new Set<string>();
 const sectionRows=sections.map((section:any)=>{
  const id=clean(section.id,90);
  if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id)||ids.has(id))throw new BadRequestException('Tekrarlı bölüm kimliği.');
  ids.add(id);
  const image=clean(section.image,2000);
  if(image&&!image.startsWith('/assets/')&&!/^https:\/\//.test(image))throw new BadRequestException('Bölüm görseli geçersiz.');
  const kind=['text','list','steps','notice'].includes(section.kind)?section.kind:'text';
  return {id,kind,title:cleanLocalized(section.title,220),body:cleanLocalized(section.body),image};
 });
 ids.clear();
 const faqRows=faqs.map((faq:any)=>{
  const id=clean(faq.id,90);
  if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id)||ids.has(id))throw new BadRequestException('Tekrarlı SSS kimliği.');
  ids.add(id);
  return {id,question:cleanLocalized(faq.question,800),answer:cleanLocalized(faq.answer)};
 });
 if(status==='PUBLISHED'&&!fields.title.tr?.trim())
  throw new BadRequestException('Yayınlamak için Türkçe başlık girin.');
 return {id:valid,sortOrder:prev.sortOrder,status,image,fields,sections:sectionRows,faqs:faqRows};
}

@Injectable()
export class WebsiteToolsService {
 constructor(private readonly prisma:PrismaService){}
 async snapshot(){
  const row=await this.prisma.platformSetting.findUnique({where:{key:KEY}});
  const raw=row?.value as any;
  const defaults=initial();
  const existing=Array.isArray(raw?.tools)?raw.tools:[];
  return {version:Number(raw?.version)||0,tools:defaults.map(item=>existing.find((x:any)=>x.id===item.id)||item)};
 }
 async save(body:any){
  const before=await this.snapshot();
  if(Number(body?.version)!==before.version)throw new ConflictException('Araç içeriği değişmiş. Yenileyin.');
  if(!Array.isArray(body?.tools)||body.tools.length!==TOOL_IDS.length||
    new Set(body.tools.map((x:any)=>x?.id)).size!==TOOL_IDS.length)
    throw new BadRequestException('Araç kataloğundaki tüm kayıtlar birlikte gönderilmelidir.');
  const tools=before.tools.map(prev=>{
   const incoming=body.tools.find((x:any)=>x.id===prev.id);
   return normalize(incoming,prev);
  });
  const next={version:before.version+1,tools};
  await this.prisma.platformSetting.upsert({where:{key:KEY},
   create:{key:KEY,value:next},update:{value:next}});
  return next;
 }
 async publicList(locale:string){
  if(!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(locale))throw new BadRequestException('Geçersiz dil.');
  const data=await this.snapshot();
  return data.tools.filter(item=>item.status==='PUBLISHED'&&item.fields.title?.[locale])
    .map(item=>({id:item.id,title:item.fields.title[locale],subtitle:item.fields.subtitle?.[locale]||'',
      description:item.fields.description?.[locale]||'',image:item.image}));
 }
 async publicDetail(slug:string,locale:string){
  if(!TOOL_IDS.some(x=>x===slug)||!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(locale))
   throw new NotFoundException('Araç sayfası bulunamadı.');
  const data=await this.snapshot();
  const record=data.tools.find(item=>item.id===slug);
  if(!record||record.status!=='PUBLISHED'||!record.fields.title?.[locale])
   throw new NotFoundException('Bu dilde yayımlanmış araç sayfası bulunamadı.');
  return {id:record.id,title:record.fields.title[locale],image:record.image,
   fields:Object.fromEntries(SCALAR_FIELDS.map(key=>[key,record.fields[key]?.[locale]||''])),
   sections:record.sections.map((x:{id:string;kind?:string;title:Dict;body:Dict;image:string})=>({
    id:x.id,kind:x.kind||'text',title:x.title?.[locale]||'',body:x.body?.[locale]||'',image:x.image
   })).filter((x:{title:string;body:string})=>Boolean(x.title||x.body)),
   faqs:record.faqs.map((x:{id:string;question:Dict;answer:Dict})=>({
    id:x.id,question:x.question?.[locale]||'',answer:x.answer?.[locale]||''
   })).filter((x:{question:string;answer:string})=>Boolean(x.question&&x.answer))};
 }
}
