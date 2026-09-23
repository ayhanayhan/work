import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';

const MAX_SIZE = 12 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/avif']);
const DEFAULT_PROFILES:Record<string,{width:number;height:number,fit:'cover'|'inside'}>={
  thumb:{width:320,height:320,fit:'cover'},
  card:{width:640,height:800,fit:'inside'},
  category:{width:1200,height:900,fit:'inside'},
  detail:{width:1800,height:1800,fit:'inside'},
  hero:{width:1920,height:1080,fit:'inside'},
};
function looksSafe(buffer: Buffer, mime: string) {
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png') return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/webp') return buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP';
  if (mime === 'image/avif') return buffer.subarray(4,12).toString().includes('ftyp');
  return false;
}
function clamp(n:any,min:number,max:number,fallback:number){const x=Number(n);return Number.isFinite(x)?Math.max(min,Math.min(max,Math.round(x))):fallback}

@Injectable()
export class MediaService {
  private storage = new Storage();
  constructor(private prisma: PrismaService) {}

  async assertStore(tenantId: string, storeId: string) {
    if (storeId !== tenantId) throw new ForbiddenException('Site does not belong to tenant');
    const site = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!site) throw new ForbiddenException('Tenant not found');
    return site;
  }

  list(tenantId: string, storeId: string) {
    return this.assertStore(tenantId, storeId).then(() => this.prisma.mediaAsset.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, take: 300 }));
  }

  private bucketName() { return String(process.env.GCS_BUCKET || '').trim(); }
  private localRoot() { return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'); }
  private publicBase(){return String(process.env.PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '')}

  private profiles(settings:any){
    const raw=settings?.imageProcessing?.profiles||{};const out:any={};
    for(const [key,def] of Object.entries(DEFAULT_PROFILES)){
      const src:any=raw[key]||{};const d:any=def;
      out[key]={width:clamp(src.width,120,3200,d.width),height:clamp(src.height,120,3200,d.height),fit:src.fit==='cover'?'cover':'inside'};
    }
    return out as Record<string,{width:number;height:number,fit:'cover'|'inside'}>;
  }
  private async writeObject(key:string,data:Buffer,mime:string){
    const bucket=this.bucketName();
    if(bucket) await this.storage.bucket(bucket).file(key).save(data,{resumable:false,contentType:mime,metadata:{cacheControl:'public,max-age=31536000,immutable'}});
    else {const target=join(this.localRoot(),key);await mkdir(dirname(target),{recursive:true});await writeFile(target,data,{flag:'wx'});}
  }
  private async readObject(key:string){
    const bucket=this.bucketName();
    if(bucket)return this.storage.bucket(bucket).file(key).download().then(([b])=>b).catch(()=>null);
    return readFile(join(this.localRoot(),key)).catch(()=>null);
  }
  private async removeObject(key:string){const bucket=this.bucketName();if(bucket)return this.storage.bucket(bucket).file(key).delete({ignoreNotFound:true}).catch(()=>undefined);return unlink(join(this.localRoot(),key)).catch(()=>undefined)}

  private async optimize(store:any, id:string, source:Buffer){
    let pipeline:sharp.Sharp;
    try{pipeline=sharp(source,{failOn:'error'}).rotate()}catch{throw new BadRequestException('Görsel işlenemedi')}
    const meta=await pipeline.metadata().catch(()=>null);if(!meta?.width||!meta?.height)throw new BadRequestException('Görsel boyutları okunamadı');
    const settings:any=store.settings||{};const quality=clamp(settings?.imageProcessing?.webpQuality,50,95,82);const avifQuality=clamp(settings?.imageProcessing?.avifQuality,35,90,60);const maxMaster=clamp(settings?.imageProcessing?.masterMax,1200,4000,2400);
    const baseDir=`tenants/${store.id}/media/${id}`;const variants:any={};
    const master=await sharp(source).rotate().resize({width:maxMaster,height:maxMaster,fit:'inside',withoutEnlargement:true}).webp({quality}).toBuffer({resolveWithObject:true});
    const masterKey=`${baseDir}/master.webp`;await this.writeObject(masterKey,master.data,'image/webp');
    variants.master={webp:{key:masterKey,width:master.info.width,height:master.info.height,mime:'image/webp',size:master.data.length}};
    const profiles=this.profiles(settings);
    for(const [name,p] of Object.entries(profiles)){
      const resize={width:p.width,height:p.height,fit:p.fit,withoutEnlargement:true,position:'centre' as const};
      const webp=await sharp(source).rotate().resize(resize as any).webp({quality}).toBuffer({resolveWithObject:true});
      const webpKey=`${baseDir}/${name}.webp`;await this.writeObject(webpKey,webp.data,'image/webp');
      const avif=await sharp(source).rotate().resize(resize as any).avif({quality:avifQuality,effort:4}).toBuffer({resolveWithObject:true});
      const avifKey=`${baseDir}/${name}.avif`;await this.writeObject(avifKey,avif.data,'image/avif');
      variants[name]={webp:{key:webpKey,width:webp.info.width,height:webp.info.height,mime:'image/webp',size:webp.data.length},avif:{key:avifKey,width:avif.info.width,height:avif.info.height,mime:'image/avif',size:avif.data.length}};
    }
    return {meta,master,masterKey,variants,quality,avifQuality};
  }

  private async createOptimizedAsset(store:any,source:Buffer,originalName:string,alt:string|undefined,sourceKind='UPLOAD',extra:any={}){
    const id=randomUUID();const optimized=await this.optimize(store,id,source);const url=`${this.publicBase()}/v1/media/${id}/content`;
    return this.prisma.mediaAsset.create({data:{id,storeId:store.id,fileName:`${id}.webp`,originalName:String(originalName||`${id}.webp`).slice(0,240),mimeType:'image/webp',size:optimized.master.data.length,storageKey:optimized.masterKey,publicUrl:url,alt:alt?.slice(0,250),width:optimized.master.info.width,height:optimized.master.info.height,source:sourceKind,metadata:{...extra,optimized:true,sourceWidth:optimized.meta.width,sourceHeight:optimized.meta.height,variants:optimized.variants,webpQuality:optimized.quality,avifQuality:optimized.avifQuality}}});
  }

  async upload(tenantId: string, storeId: string, file: any, alt?: string) {
    const store=await this.assertStore(tenantId, storeId);
    if (!file?.buffer || !file?.size) throw new BadRequestException('Image file required');
    if (file.size > MAX_SIZE) throw new BadRequestException('Image may not exceed 12 MB');
    if (!ALLOWED.has(file.mimetype) || !looksSafe(file.buffer, file.mimetype)) throw new BadRequestException('Only safe JPEG, PNG, WEBP or AVIF images are accepted');
    return this.createOptimizedAsset(store,file.buffer,String(file.originalname||'upload'),alt,'UPLOAD',{originalMimeType:file.mimetype,originalSize:file.size});
  }

  async saveGenerated(tenantId: string, storeId: string, buffer: Buffer, mimeType = 'image/png', originalName = 'ai-generated.png', alt?: string, metadata?: Record<string, unknown>) {
    const store=await this.assertStore(tenantId, storeId);
    if (!buffer?.length) throw new BadRequestException('Generated image is empty');
    if (buffer.length > MAX_SIZE) throw new BadRequestException('Generated image may not exceed 12 MB');
    if (!ALLOWED.has(mimeType) || !looksSafe(buffer, mimeType)) throw new BadRequestException('AI provider returned an unsupported image');
    return this.createOptimizedAsset(store,buffer,originalName,alt,'AI',{...(metadata||{}),originalMimeType:mimeType,originalSize:buffer.length});
  }

  async content(id: string, size='master', format='webp') {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException();
    const md:any=asset.metadata||{};const variants:any=md.variants||{};const fmt=format==='avif'?'avif':'webp';const chosen=variants?.[size]?.[fmt]||variants?.[size]?.webp||variants?.master?.webp;
    const key=chosen?.key||asset.storageKey;const data=await this.readObject(key);if(!data)throw new NotFoundException();
    return {asset:{...asset,mimeType:chosen?.mime||asset.mimeType,width:chosen?.width||asset.width,height:chosen?.height||asset.height},data};
  }

  async remove(tenantId: string, storeId: string, id: string) {
    await this.assertStore(tenantId, storeId);
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id, storeId } });
    if (!asset) throw new NotFoundException();
    const [productUse,pageUse,blogUse,categoryUse,siteUse] = await Promise.all([
      this.prisma.productImage.count({ where: { mediaAssetId: id } }),this.prisma.page.count({ where: { storeId, imageUrl: asset.publicUrl } }),this.prisma.blogPost.count({ where: { storeId, featuredImageUrl: asset.publicUrl } }),this.prisma.blogCategory.count({ where: { storeId, imageUrl: asset.publicUrl } }),this.prisma.tenant.count({ where: { id: storeId, OR: [{ logoUrl: asset.publicUrl }, { faviconUrl: asset.publicUrl }] } }),
    ]);
    if (productUse || pageUse || blogUse || categoryUse || siteUse) throw new BadRequestException('Media is currently used by storefront content');
    await this.prisma.mediaAsset.delete({ where: { id } });
    const md:any=asset.metadata||{};const keys=new Set<string>([asset.storageKey]);for(const formats of Object.values(md.variants||{}) as any[])for(const v of Object.values(formats||{}) as any[])if(v?.key)keys.add(v.key);await Promise.all([...keys].map(k=>this.removeObject(k)));
    return { deleted: true };
  }
}
