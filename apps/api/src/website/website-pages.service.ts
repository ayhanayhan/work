import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import * as pageSchema from './website-page-fields.json';

type Localization=Record<string,string>;
type PageRecord={version:number;values:Record<string,Localization>};
const pages=(pageSchema as any).pages as Array<{id:string;title:string;source:string;fields:Array<{id:string;type:'text'|'image';label:string;default:string}>}>;
const languagePattern=/^[a-z]{2,3}(?:-[a-zA-Z]{2,4})?$/;
@Injectable()
export class WebsitePagesService {
  constructor(private readonly prisma:PrismaService){}
  list(){return pages.map(x=>({id:x.id,title:x.title,source:x.source,fieldCount:x.fields.length}));}
  private page(id:string){const page=pages.find(p=>p.id===id);if(!page)throw new NotFoundException('Kurumsal site sayfası bulunamadı.');return page;}
  private key(id:string){this.page(id);return 'marketing_page_'+id+'_v1';}
  async read(id:string){
    const page=this.page(id);
    const row=await this.prisma.platformSetting.findUnique({where:{key:this.key(id)}});
    const value=(row?.value&&typeof row.value==='object'&&!Array.isArray(row.value)?row.value:{}) as any;
    return {id,version:Number(value.version)||0,values:value.values||{},title:page.title};
  }
  async publicRead(id:string,locale='tr'){
    const page=this.page(id),raw=await this.read(id);
    const lang=languagePattern.test(locale)?locale:'tr';
    const values:Record<string,string>={};
    for(const field of page.fields){
      const item=raw.values[field.id];if(!item)continue;
      const text=item[lang]||item[lang.split('-')[0]]||item.tr||'';
      if(text)values[field.id]=text;
    }
    return {id:page.id,version:raw.version,locale:lang,values};
  }
  async update(id:string,body:any){
    const page=this.page(id),previous=await this.read(id);
    if(Number(body?.version)!==previous.version)throw new ConflictException('Sayfa başka bir oturumda güncellenmiş. Sayfayı yenileyin.');
    const input=body?.values;
    if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Alan değerleri geçersiz.');
    const allowed=new Map(page.fields.map(f=>[f.id,f]));
    const keys=Object.keys(input);
    if(keys.length>page.fields.length)throw new BadRequestException('Alan sayısı sınırı aşıldı.');
    const values:Record<string,Localization>={...previous.values};
    for(const id of keys){
      const field=allowed.get(id);
      if(!field)throw new BadRequestException('Bilinmeyen içerik alanı.');
      const loc=input[id];if(!loc||typeof loc!=='object'||Array.isArray(loc))throw new BadRequestException('Dil alanı geçersiz.');
      const cleaned:Localization={};
      if(Object.keys(loc).length>30)throw new BadRequestException('Dil sınırı aşıldı.');
      for(const [language,text] of Object.entries(loc)){
        if(!languagePattern.test(language)||typeof text!=='string')throw new BadRequestException('Geçersiz dil veya metin.');
        const max=field.type==='image'?2048:12000;
        if(text.length>max)throw new BadRequestException('İçerik uzunluk sınırı aşıldı.');
        if(field.type==='image'&&text.trim()&&!/^https:\/\/[^\s<>"']+$/.test(text)&&!/^\/?assets\/[\w./%-]+$/.test(text)&&!/^\.\.\/assets\/[\w./%-]+$/.test(text))throw new BadRequestException('Görsel URL geçersiz.');
        if(text.trim())cleaned[language]=text; // empty = fallback to original HTML
      }
      if(Object.keys(cleaned).length)values[id]=cleaned;else delete values[id];
    }
    const version=previous.version+1;
    const payload={version,values};
    if(Buffer.byteLength(JSON.stringify(payload),'utf8')>750_000)throw new BadRequestException('Sayfa içerik boyutu sınırı aşıldı.');
    await this.prisma.platformSetting.upsert({where:{key:this.key(id)},create:{key:this.key(id),value:payload},update:{value:payload}});
    return {id,version,values};
  }
}
