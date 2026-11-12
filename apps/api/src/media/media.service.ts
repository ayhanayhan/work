import {apiError} from '../i18n/api-error';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mkdir, readFile, readdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { Storage } from '@google-cloud/storage';
import sharp, { type Sharp } from 'sharp';

const MAX_SIZE = 12 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']);
const RASTER_ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/avif']);
const MAX_SVG_SIZE = 2 * 1024 * 1024;
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

function sanitizeSvg(buffer: Buffer) {
  if (buffer.length > MAX_SVG_SIZE) throw new BadRequestException(apiError('media.svg.tooLarge'));
  let svg = buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
  if (!svg || !/^<\?xml[\s\S]*?\?>\s*<svg\b|^<svg\b/i.test(svg)) throw new BadRequestException(apiError('media.svg.invalid'));
  if (!/<\/svg>\s*$/i.test(svg)) throw new BadRequestException(apiError('media.svg.invalid'));
  const forbidden = [
    /<!DOCTYPE/i,/<!ENTITY/i,/<script\b/i,/<foreignObject\b/i,/<iframe\b/i,/<object\b/i,/<embed\b/i,
    /<audio\b/i,/<video\b/i,/<canvas\b/i,/<link\b/i,/<meta\b/i,/<image\b/i,
    /\son[a-z0-9_-]+\s*=/i,/javascript\s*:/i,/vbscript\s*:/i,/data\s*:\s*text\/html/i,/@import\b/i,/expression\s*\(/i
  ];
  if (forbidden.some((r)=>r.test(svg))) throw new BadRequestException(apiError('media.svg.unsafe'));
  for (const match of svg.matchAll(/(?:xlink:)?href\s*=\s*(["'])(.*?)\1/gi)) {
    const value = String(match[2] || '').trim();
    if (value && !value.startsWith('#')) throw new BadRequestException(apiError('media.svg.externalRef'));
  }
  for (const match of svg.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    const value = String(match[2] || '').trim();
    if (value && !value.startsWith('#')) throw new BadRequestException(apiError('media.svg.externalRef'));
  }
  return Buffer.from(svg, 'utf8');
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

  async list(tenantId: string, storeId: string) {
    await this.assertStore(tenantId, storeId);
    const [assets, productImages] = await Promise.all([
      this.prisma.mediaAsset.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, take: 300 }),
      this.prisma.productImage.findMany({ where: { product: { storeId } }, select: { id:true,url:true,alt:true,mediaAssetId:true }, orderBy: { sortOrder:'asc' }, take:300 }),
    ]);
    const seen=new Set(assets.map((x:any)=>String(x.publicUrl||'')));
    const legacy=productImages.filter((x:any)=>x.url&&!seen.has(String(x.url))).map((x:any)=>({
      id:null,
      publicUrl:String(x.url),
      originalName:String(x.alt||'Ürün görseli'),
      fileName:String(x.alt||'Ürün görseli'),
      mimeType:'image/*',
      metadata:{folder:'',source:'product-image'},
    }));
    return [...assets,...legacy].slice(0,500);
  }

  private bucketName() { return String(process.env.GCS_BUCKET || '').trim(); }
  private localRoot() { return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'); }
  private publicBase(){return String(process.env.MEDIA_CDN_BASE_URL||process.env.PUBLIC_API_URL||'http://localhost:4000').replace(/\/$/, '')}

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
    let pipeline:Sharp;
    try{pipeline=sharp(source,{failOn:'none',limitInputPixels:268402689}).rotate()}catch{throw new BadRequestException(apiError('media.process.failed'))}
    const meta=await pipeline.metadata().catch(()=>null);if(!meta?.width||!meta?.height)throw new BadRequestException(apiError('media.dimensions.failed'));
    const settings:any=store.settings||{};const quality=clamp(settings?.imageProcessing?.webpQuality,50,95,82);const avifQuality=clamp(settings?.imageProcessing?.avifQuality,35,90,60);const maxMaster=clamp(settings?.imageProcessing?.masterMax,1200,4000,2400);
    const baseDir=`tenants/${store.id}/media/${id}`;const variants:any={};
    const master=await sharp(source,{failOn:'none',limitInputPixels:268402689}).rotate().resize({width:maxMaster,height:maxMaster,fit:'inside',withoutEnlargement:true}).webp({quality}).toBuffer({resolveWithObject:true});
    const masterKey=`${baseDir}/master.webp`;await this.writeObject(masterKey,master.data,'image/webp');
    variants.master={webp:{key:masterKey,width:master.info.width,height:master.info.height,mime:'image/webp',size:master.data.length}};
    const profiles=this.profiles(settings);
    for(const [name,p] of Object.entries(profiles)){
      const resize={width:p.width,height:p.height,fit:p.fit,withoutEnlargement:true,position:'centre' as const};
      const webp=await sharp(source,{failOn:'none',limitInputPixels:268402689}).rotate().resize(resize as any).webp({quality}).toBuffer({resolveWithObject:true});
      const webpKey=`${baseDir}/${name}.webp`;await this.writeObject(webpKey,webp.data,'image/webp');
      let avifEntry:any=null;try{const avif=await sharp(source,{failOn:'none',limitInputPixels:268402689}).rotate().resize(resize as any).avif({quality:avifQuality,effort:4}).toBuffer({resolveWithObject:true});const avifKey=`${baseDir}/${name}.avif`;await this.writeObject(avifKey,avif.data,'image/avif');avifEntry={key:avifKey,width:avif.info.width,height:avif.info.height,mime:'image/avif',size:avif.data.length};}catch{/* AVIF derivative is optional; master WEBP remains valid. */}
      variants[name]={webp:{key:webpKey,width:webp.info.width,height:webp.info.height,mime:'image/webp',size:webp.data.length},...(avifEntry?{avif:avifEntry}:{})};
    }
    return {meta,master,masterKey,variants,quality,avifQuality};
  }

  private async registerMediaRoute(storeId:string,id:string){await this.prisma.control().tenantRouteKey.upsert({where:{kind_routeKey:{kind:'MEDIA',routeKey:id}},create:{kind:'MEDIA',routeKey:id,tenantId:storeId},update:{tenantId:storeId,expiresAt:null}})}

  private async createOptimizedAsset(store:any,source:Buffer,originalName:string,alt:string|undefined,sourceKind='UPLOAD',extra:any={}){
    const id=randomUUID();const optimized=await this.optimize(store,id,source);const url=`${this.publicBase()}/v1/media/${id}/content`;
    const asset=await this.prisma.mediaAsset.create({data:{id,storeId:store.id,fileName:`${id}.webp`,originalName:String(originalName||`${id}.webp`).slice(0,240),mimeType:'image/webp',size:optimized.master.data.length,storageKey:optimized.masterKey,publicUrl:url,alt:alt?.slice(0,250),width:optimized.master.info.width,height:optimized.master.info.height,source:sourceKind,metadata:{...extra,optimized:true,sourceWidth:optimized.meta.width,sourceHeight:optimized.meta.height,variants:optimized.variants,webpQuality:optimized.quality,avifQuality:optimized.avifQuality}}});await this.registerMediaRoute(store.id,id);return asset;
  }


  private async createSvgAsset(store:any,source:Buffer,originalName:string,alt?:string,sourceKind='UPLOAD',extra:any={}){
    const safe=sanitizeSvg(source);const id=randomUUID();const key=`tenants/${store.id}/media/${id}/master.svg`;await this.writeObject(key,safe,'image/svg+xml');const url=`${this.publicBase()}/v1/media/${id}/content`;
    const asset=await this.prisma.mediaAsset.create({data:{id,storeId:store.id,fileName:`${id}.svg`,originalName:String(originalName||`${id}.svg`).slice(0,240),mimeType:'image/svg+xml',size:safe.length,storageKey:key,publicUrl:url,alt:alt?.slice(0,250),width:null,height:null,source:sourceKind,metadata:{...extra,vector:true,sanitized:true,originalMimeType:'image/svg+xml',originalSize:source.length}}});await this.registerMediaRoute(store.id,id);return asset;
  }

  async platformUpload(body:any) {
    const mime=String(body?.mimeType||'').toLowerCase();
    const originalName=String(body?.fileName||'platform-media').slice(0,240);
    const raw=String(body?.dataBase64||'').replace(/^data:[^;]+;base64,/, '');
    let source:Buffer;try{source=Buffer.from(raw,'base64')}catch{throw new BadRequestException(apiError('media.data.invalid'))}
    if(!source.length)throw new BadRequestException(apiError('media.required'));
    if(source.length>MAX_SIZE)throw new BadRequestException(apiError('media.tooLarge'));
    if(!ALLOWED.has(mime))throw new BadRequestException(apiError('media.type.invalid'));
    const id=randomUUID();
    if(mime==='image/svg+xml'){
      const safe=sanitizeSvg(source);const key=`platform/media/${id}/master.svg`;await this.writeObject(key,safe,'image/svg+xml');
      const meta={id,originalName,alt:String(body?.alt||'').slice(0,250),mimeType:'image/svg+xml',width:null,height:null,size:safe.length,storageKey:key,createdAt:new Date().toISOString()};
      await this.writeObject(`platform/media/${id}/meta.json`,Buffer.from(JSON.stringify(meta)),'application/json');
      return {...meta,publicUrl:`${this.publicBase()}/v1/platform-media/${id}/content`};
    }
    if(!RASTER_ALLOWED.has(mime)||!looksSafe(source,mime))throw new BadRequestException(apiError('media.file.unsafe'));
    const out=await sharp(source,{failOn:'none',limitInputPixels:268402689}).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer({resolveWithObject:true});
    const key=`platform/media/${id}/master.webp`;
    await this.writeObject(key,out.data,'image/webp');
    const meta={id,originalName,alt:String(body?.alt||'').slice(0,250),mimeType:'image/webp',width:out.info.width,height:out.info.height,size:out.data.length,storageKey:key,createdAt:new Date().toISOString()};
    await this.writeObject(`platform/media/${id}/meta.json`,Buffer.from(JSON.stringify(meta)),'application/json');
    return {...meta,publicUrl:`${this.publicBase()}/v1/platform-media/${id}/content`};
  }

  async platformList() {
    const bucket=this.bucketName();const rows:any[]=[];
    if(bucket){
      const [files]=await this.storage.bucket(bucket).getFiles({prefix:'platform/media/'});
      const metas=files.filter(f=>f.name.endsWith('/meta.json')).slice(-300).reverse();
      for(const f of metas){try{const [buf]=await f.download();const meta=JSON.parse(buf.toString('utf8'));rows.push({...meta,publicUrl:`${this.publicBase()}/v1/platform-media/${meta.id}/content`})}catch{}}
      return rows;
    }
    const root=join(this.localRoot(),'platform/media');const dirs=await readdir(root,{withFileTypes:true}).catch(()=>[] as any[]);
    for(const d of dirs){if(!d.isDirectory())continue;try{const buf=await readFile(join(root,d.name,'meta.json'));const meta=JSON.parse(buf.toString('utf8'));rows.push({...meta,publicUrl:`${this.publicBase()}/v1/platform-media/${meta.id}/content`})}catch{}}
    return rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,300);
  }

  async platformContent(id:string) {
    if(!/^[a-f0-9-]{30,40}$/i.test(id))throw new NotFoundException(apiError('media.notFound'));
    const metaData=await this.readObject(`platform/media/${id}/meta.json`);let meta:any={};try{if(metaData)meta=JSON.parse(metaData.toString('utf8'))}catch{}
    const mimeType=meta?.mimeType==='image/svg+xml'?'image/svg+xml':'image/webp';const key=String(meta?.storageKey||`platform/media/${id}/${mimeType==='image/svg+xml'?'master.svg':'master.webp'}`);
    const data=await this.readObject(key);if(!data)throw new NotFoundException(apiError('media.notFound'));
    return {mimeType,data};
  }

  async upload(tenantId: string, storeId: string, file: any, alt?: string, folder?: string) {
    const store=await this.assertStore(tenantId, storeId);
    if (!file?.buffer || !file?.size) throw new BadRequestException('Image file required');
    if (file.size > MAX_SIZE) throw new BadRequestException('Image may not exceed 12 MB');
    if (!ALLOWED.has(file.mimetype)) throw new BadRequestException('Only safe JPEG, PNG, WEBP, AVIF or SVG images are accepted');
    if(file.mimetype==='image/svg+xml')return this.createSvgAsset(store,file.buffer,String(file.originalname||'upload.svg'),alt,'UPLOAD',{originalMimeType:file.mimetype,originalSize:file.size,folder:String(folder||'')});
    if(!looksSafe(file.buffer,file.mimetype))throw new BadRequestException('Image file is not safe');
    return this.createOptimizedAsset(store,file.buffer,String(file.originalname||'upload'),alt,'UPLOAD',{originalMimeType:file.mimetype,originalSize:file.size,folder:String(folder||'')});
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

  async folders(tenantId:string,storeId:string){const store:any=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};return Array.isArray(settings?.mediaLibrary?.folders)?settings.mediaLibrary.folders:[];}
  async createFolder(tenantId:string,storeId:string,nameValue:string){const store:any=await this.assertStore(tenantId,storeId);const name=String(nameValue||'').trim().slice(0,80);if(!name)throw new BadRequestException('Folder name required');const settings:any=store.settings||{};const rows:any[]=Array.isArray(settings?.mediaLibrary?.folders)?settings.mediaLibrary.folders:[];const id=name.toLowerCase().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,60)||randomUUID();const row={id,name};if(!rows.some(x=>x.id===id))rows.push(row);await this.prisma.tenant.update({where:{id:storeId},data:{settings:{...settings,mediaLibrary:{...(settings.mediaLibrary||{}),folders:rows}}}});return row;}
  async deleteFolder(tenantId:string,storeId:string,id:string){const store:any=await this.assertStore(tenantId,storeId);const settings:any=store.settings||{};const rows:any[]=Array.isArray(settings?.mediaLibrary?.folders)?settings.mediaLibrary.folders:[];await this.prisma.$transaction(async tx=>{const assets:any[]=await tx.mediaAsset.findMany({where:{storeId}});for(const a of assets){const md:any=a.metadata||{};if(String(md.folder||'')===String(id))await tx.mediaAsset.update({where:{id:a.id},data:{metadata:{...md,folder:''}}});}await tx.tenant.update({where:{id:storeId},data:{settings:{...settings,mediaLibrary:{...(settings.mediaLibrary||{}),folders:rows.filter(x=>String(x.id)!==String(id))}}}})});return{deleted:true};}

  async remove(tenantId: string, storeId: string, id: string) {
    await this.assertStore(tenantId, storeId);
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id, storeId } });
    if (!asset) throw new NotFoundException();
    const [productUse,pageUse,blogUse,categoryUse,siteUse] = await Promise.all([
      this.prisma.productImage.count({ where: { mediaAssetId: id } }),this.prisma.page.count({ where: { storeId, imageUrl: asset.publicUrl } }),this.prisma.blogPost.count({ where: { storeId, featuredImageUrl: asset.publicUrl } }),this.prisma.blogCategory.count({ where: { storeId, imageUrl: asset.publicUrl } }),this.prisma.tenant.count({ where: { id: storeId, OR: [{ logoUrl: asset.publicUrl }, { faviconUrl: asset.publicUrl }] } }),
    ]);
    if (productUse || pageUse || blogUse || categoryUse || siteUse) throw new BadRequestException('Media is currently used by storefront content');
    await this.prisma.mediaAsset.delete({ where: { id } });await this.prisma.control().tenantRouteKey.deleteMany({where:{kind:'MEDIA',routeKey:id}});
    const md:any=asset.metadata||{};const keys=new Set<string>([asset.storageKey]);for(const formats of Object.values(md.variants||{}) as any[])for(const v of Object.values(formats||{}) as any[])if(v?.key)keys.add(v.key);await Promise.all([...keys].map(k=>this.removeObject(k)));
    return { deleted: true };
  }
}
