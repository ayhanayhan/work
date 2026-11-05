import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const STATUSES = new Set(['NEW','IN_PROGRESS','ANSWERED','CLOSED']);

@Injectable()
export class ContactService {
  private readonly localLimits = new Map<string,{count:number;reset:number}>();
  constructor(private readonly prisma: PrismaService, private readonly cache: CacheService) {}

  private async throttle(ip: string) {
    const hash = createHash('sha256').update(ip).digest('hex').slice(0,24);
    const key = 'contact:submit:'+hash;
    const count = await this.cache.incrementWindow(key,600);
    if (count !== null) {
      if (count > 3) throw new HttpException('Çok fazla talep gönderdiniz. Bir süre sonra tekrar deneyin.', HttpStatus.TOO_MANY_REQUESTS);
      return;
    }
    const now=Date.now();const row=this.localLimits.get(key);
    const next=row&&row.reset>now?{count:row.count+1,reset:row.reset}:{count:1,reset:now+600000};
    this.localLimits.set(key,next);
    if (next.count>3) throw new HttpException('Çok fazla talep gönderdiniz. Bir süre sonra tekrar deneyin.',HttpStatus.TOO_MANY_REQUESTS);
    if (this.localLimits.size>10000) for(const [k,v] of this.localLimits)if(v.reset<=now)this.localLimits.delete(k);
  }

  async create(body:any, ip:string){
    const fullName=String(body?.fullName||body?.name||'').trim();
    const email=String(body?.email||'').trim().toLowerCase();
    const phone=String(body?.phone||'').trim();
    const subject=String(body?.subject||'Genel iletişim').trim();
    const message=String(body?.message||'').trim();
    if (body?.website) return {ok:true};
    await this.throttle(ip);
    if (body?.consent!==true)throw new BadRequestException('Aydınlatma metni onayı gereklidir.');
    if(fullName.length<2||fullName.length>150)throw new BadRequestException('Ad soyad 2–150 karakter olmalıdır.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new BadRequestException('Geçerli bir e-posta adresi girin.');
    if(phone && (!/^\+?[0-9\s()-]{7,22}$/.test(phone)||phone.replace(/\D/g,'').length>15))throw new BadRequestException('Telefon numarası geçersiz.');
    if(subject.length<3||subject.length>180)throw new BadRequestException('Konu 3–180 karakter olmalıdır.');
    if(message.length<10||message.length>10000)throw new BadRequestException('Mesaj 10–10.000 karakter olmalıdır.');
    await this.prisma.contactInquiry.create({data:{fullName,email,phone:phone||null,subject,message,status:'NEW'}});
    return {ok:true};
  }

  async inbox(){
    return this.prisma.contactInquiry.findMany({orderBy:{createdAt:'desc'},take:500});
  }

  async update(id:string,body:any){
    const previous=await this.prisma.contactInquiry.findUnique({where:{id}});
    if(!previous)throw new NotFoundException('İletişim kaydı bulunamadı.');
    const data:{status?:string;replyDraft?:string|null;internalNote?:string|null}={};
    if(body?.status!==undefined){
      if(!STATUSES.has(body.status))throw new BadRequestException('Geçersiz durum.');
      data.status=body.status;
    }
    if(body?.replyDraft!==undefined){
      const draft=String(body.replyDraft||'').trim();
      if(draft.length>10000)throw new BadRequestException('Yanıt taslağı en fazla 10.000 karakter olabilir.');
      data.replyDraft=draft||null;
    }
    if(body?.internalNote!==undefined){
      const note=String(body.internalNote||'').trim();
      if(note.length>4000)throw new BadRequestException('İç not en fazla 4.000 karakter olabilir.');
      data.internalNote=note||null;
    }
    return this.prisma.contactInquiry.update({where:{id},data});
  }

  async remove(id:string){
    await this.prisma.contactInquiry.delete({where:{id}}).catch(()=>{throw new NotFoundException('İletişim kaydı bulunamadı.')});
    return {deleted:true};
  }
}
