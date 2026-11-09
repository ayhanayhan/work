import {BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException} from '@nestjs/common';
import {Storage} from '@google-cloud/storage';
import type sharp from 'sharp';
// Sharp 0.35 exports a callable CommonJS function at runtime; use its default type.
const sharpRuntime: typeof sharp = require('sharp');
import {randomUUID} from 'crypto';
import {PrismaService} from '../prisma/prisma.service';
import {validateSvgForRasterization} from '../media/svg-upload';

type PlatformMediaItem={id:string;fileName:string;mimeType:string;publicUrl:string;storageKey:string;size:number;createdAt:string};
/** Shared production conversion used by the upload route and build smoke test. */
export async function convertPlatformMediaBuffer(buffer:Buffer,mimeType?:string):Promise<Buffer>{
  const input=mimeType==='image/svg+xml'?validateSvgForRasterization(buffer):buffer;
  const img=sharpRuntime(input,{failOn:'error',limitInputPixels:25000000,density:144});
  const meta=await img.metadata();
  if(!['jpeg','png','webp','avif','svg'].includes(meta.format||'')||((meta.format==='svg')!==(mimeType==='image/svg+xml')))throw new BadRequestException('Bu görsel formatı desteklenmiyor. PNG/JPG/WebP/AVIF/SVG yükleyin.');
  return img.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();
}


@Injectable()
export class PlatformMediaService {
  private readonly storage=new Storage();
  private readonly logger=new Logger(PlatformMediaService.name);
  constructor(private readonly prisma:PrismaService){}
  private bucket(){const name=String(process.env.GCS_BUCKET||'').trim();if(!name)throw new ServiceUnavailableException('Platform medya yükleme için GCS_BUCKET yapılandırılmalı.');return this.storage.bucket(name);}
  private fileId(id:string){if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))throw new NotFoundException('Görsel bulunamadı.');return id}
  private url(id:string,host?:string){
    const explicit=String(process.env.PUBLIC_API_URL||'').trim().replace(/\/$/,'');
    if(explicit&&/^https:\/\//i.test(explicit))return explicit+'/v1/platform-media/'+id;
    const hostName=String(host||'').toLowerCase();
    if(/(^|\.)run\.app$/.test(hostName)||/(^|\.)ticarti\.com$/.test(hostName))return 'https://'+hostName+'/v1/platform-media/'+id;
    return 'https://commerce-api-612520357246.europe-west1.run.app/v1/platform-media/'+id;
  }
  async list(){
    const records=await this.prisma.platformSetting.findMany({where:{key:{startsWith:'platform_media_'}},orderBy:{createdAt:'desc'},take:300});
    return records.map(x=>x.value as unknown as PlatformMediaItem);
  }
  async upload(file:any,host?:string){
    if(!file?.buffer||!Buffer.isBuffer(file.buffer))throw new BadRequestException('Görsel dosyası gerekli.');
    if(file.size>8*1024*1024)throw new BadRequestException('En fazla 8 MB görsel yüklenebilir.');
    const allowed=new Set(['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']);
    if(!allowed.has(file.mimetype))throw new BadRequestException('JPEG, PNG, WEBP, AVIF veya SVG yükleyin.');
    let result:Buffer;
    try{
      result=await convertPlatformMediaBuffer(file.buffer,file.mimetype);
    }catch(error:any){
      this.logger.error('Platform WebP conversion failed: '+String(error?.message||error)+'; type='+String(file.mimetype)+'; bytes='+String(file.size));
      if(error instanceof BadRequestException)throw error;
      throw new BadRequestException('Görsel dönüştürülemedi. Dosyanın gerçekten PNG/JPG/WebP/AVIF/SVG olduğundan emin olun.');
    }
    const id=randomUUID();const key='platform/media/'+id+'.webp';
    await this.bucket().file(key).save(result,{resumable:false,contentType:'image/webp',metadata:{cacheControl:'public,max-age=31536000,immutable'}});
    const item:PlatformMediaItem={id,fileName:String(file.originalname||'image.webp').slice(0,180),mimeType:'image/webp',publicUrl:this.url(id,host),storageKey:key,size:result.length,createdAt:new Date().toISOString()};
    await this.prisma.platformSetting.create({data:{key:'platform_media_'+id,value:item as any}});
    return item;
  }
  async content(idValue:string){
    const id=this.fileId(idValue);const row=await this.prisma.platformSetting.findUnique({where:{key:'platform_media_'+id}});
    if(!row)throw new NotFoundException('Görsel bulunamadı.');
    const item=row.value as unknown as PlatformMediaItem;
    try{const [bytes]=await this.bucket().file(item.storageKey).download();return bytes}catch{throw new NotFoundException('Görsel dosyası bulunamadı.')}
  }
}
