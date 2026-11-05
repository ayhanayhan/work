import {BadRequestException, Injectable, NotFoundException, ServiceUnavailableException} from '@nestjs/common';
import {Storage} from '@google-cloud/storage';
import sharp from 'sharp';
import {randomUUID} from 'crypto';
import {PrismaService} from '../prisma/prisma.service';

type PlatformMediaItem={id:string;fileName:string;mimeType:string;publicUrl:string;storageKey:string;size:number;createdAt:string};

@Injectable()
export class PlatformMediaService {
  private readonly storage=new Storage();
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
    const allowed=new Set(['image/jpeg','image/png','image/webp','image/avif']);
    if(!allowed.has(file.mimetype))throw new BadRequestException('JPEG, PNG, WEBP veya AVIF yükleyin.');
    let result:Buffer;
    try{
      const img=sharp(file.buffer,{failOn:'error',limitInputPixels:25000000});
      const meta=await img.metadata();
      if(!['jpeg','png','webp','avif'].includes(meta.format||''))throw new Error('unsupported');
      result=await img.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();
    }catch{throw new BadRequestException('Görsel okunamadı veya bozuk.')}
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
