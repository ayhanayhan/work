import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { createHash,randomUUID } from 'crypto';
import {isValidPhoneNumber} from 'libphonenumber-js';
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

  private readonly contactEmailKey='marketing_contact_email_v1';
  private readonly defaultContactEmail={
    enabled:false,recipient:'',acknowledgeSender:false,
    subject:'Ticarti · Yeni iletişim mesajı: {{subject}}',
    acknowledgmentSubject:'Ticarti · Mesajınızı aldık',
    acknowledgmentBody:'Merhaba {{fullName}},\\n\\n{{subject}} konulu mesajınız bize ulaştı. Ekibimiz talebinizi inceleyecektir.\\n\\nTicarti'
  };
  async contactEmailSettings(){
    const saved=await this.prisma.platformSetting.findUnique({where:{key:this.contactEmailKey}});
    const configured=Boolean(process.env.RESEND_API_KEY&&(process.env.CONTACT_EMAIL_FROM||process.env.CALLBACK_EMAIL_FROM));
    return {...this.defaultContactEmail,...(saved?.value&&typeof saved.value==='object'?saved.value as any:{}),providerConfigured:configured};
  }
  async updateContactEmailSettings(body:any){
    const email=String(body?.recipient||'').trim().toLowerCase();
    if(email&&(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||email.length>254))throw new BadRequestException('Geçerli bir bildirim adresi girin.');
    const settings={
      enabled:body?.enabled===true,recipient:email,acknowledgeSender:body?.acknowledgeSender===true,
      subject:String(body?.subject||this.defaultContactEmail.subject).trim().slice(0,180),
      acknowledgmentSubject:String(body?.acknowledgmentSubject||this.defaultContactEmail.acknowledgmentSubject).trim().slice(0,180),
      acknowledgmentBody:String(body?.acknowledgmentBody||this.defaultContactEmail.acknowledgmentBody).trim().slice(0,4000)
    };
    if(settings.enabled&&!settings.recipient)throw new BadRequestException('Bildirimleri açmak için alıcı e-posta adresi girin.');
    await this.prisma.platformSetting.upsert({where:{key:this.contactEmailKey},
      create:{key:this.contactEmailKey,value:settings},update:{value:settings}});
    return {...settings,providerConfigured:Boolean(process.env.RESEND_API_KEY&&(process.env.CONTACT_EMAIL_FROM||process.env.CALLBACK_EMAIL_FROM))};
  }
  private async notifyContact(record:{fullName:string;email:string;subject:string;message:string;phone:string}){
    const config=await this.contactEmailSettings();
    const token=process.env.RESEND_API_KEY;
    const from=process.env.CONTACT_EMAIL_FROM||process.env.CALLBACK_EMAIL_FROM;
    if(!token||!from)return;
    const safe=(s:string)=>s.replace(/[<>]/g,'').slice(0,500);
    const vars:Record<string,string>={
      fullName:safe(record.fullName),email:safe(record.email),subject:safe(record.subject),
      phone:safe(record.phone),message:record.message
    };
    const render=(input:string)=>input.replace(/{{(fullName|email|subject|phone|message)}}/g,(_,key:string)=>vars[key]||'');
    const send=async(to:string,subject:string,body:string)=>{
      const response=await fetch('https://api.resend.com/emails',{
        method:'POST',signal:AbortSignal.timeout(8000),
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({from,to:[to],subject:render(subject),text:render(body)})
      });
      if(!response.ok)throw Error('Contact notification delivery failed: '+response.status);
    };
    const jobs:Promise<void>[]=[];
    if(config.enabled&&config.recipient){
      jobs.push(send(config.recipient,config.subject,
        'Yeni web sitesi iletişim mesajı\\n\\nAd soyad: {{fullName}}\\nE-posta: {{email}}\\nTelefon: {{phone}}\\nKonu: {{subject}}\\n\\n{{message}}'));
    }
    if(config.acknowledgeSender&&record.email){
      jobs.push(send(record.email,config.acknowledgmentSubject,config.acknowledgmentBody));
    }
    await Promise.allSettled(jobs);
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
    await this.notifyContact({fullName,email,phone,subject,message}).catch(()=>{});
    return {ok:true};
  }


  private readonly callbackPrefix='marketing_callback_v2_';
  private readonly emailTemplateKey='marketing_callback_email_template_v1';
  private defaultCallbackEmailTemplate(){
    return {enabled:false,recipient:'',subject:'Ticarti · Yeni telefon talebi ({{source}})',
      body:'Yeni iletişim talebi\nTelefon: {{phone}}\nKaynak: {{source}}\nSayfa: {{page}}\nDil: {{locale}}\nTarih: {{createdAt}}'};
  }
  async callbackEmailTemplate(){
    const saved=await this.prisma.platformSetting.findUnique({where:{key:this.emailTemplateKey}});
    return {...this.defaultCallbackEmailTemplate(),...(saved?.value&&typeof saved.value==='object'?saved.value as any:{}),
      providerConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.CALLBACK_EMAIL_FROM)};
  }
  async updateCallbackEmailTemplate(body:any){
    const recipient=String(body?.recipient||'').trim().toLowerCase();
    const enabled=body?.enabled===true;
    const subject=String(body?.subject||'').trim().slice(0,180);
    const template=String(body?.body||'').trim().slice(0,4000);
    if(recipient&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||recipient.length>254))
      throw new BadRequestException('Geçerli bir bildirim e-posta adresi girin.');
    if(enabled&&(!recipient||!subject||!template))
      throw new BadRequestException('Bildirimleri açmak için alıcı, konu ve şablon zorunludur.');
    const value={enabled,recipient,subject,body:template};
    await this.prisma.platformSetting.upsert({where:{key:this.emailTemplateKey},
      create:{key:this.emailTemplateKey,value},update:{value}});
    return {...value,providerConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.CALLBACK_EMAIL_FROM)};
  }
  private async sendCallbackNotification(record:any){
    const template=await this.callbackEmailTemplate();
    if(!template.enabled)return {status:'DISABLED'};
    const token=process.env.RESEND_API_KEY,from=process.env.CALLBACK_EMAIL_FROM;
    if(!token||!from)return {status:'NOT_CONFIGURED'};
    const values:Record<string,string>={
      phone:record.phone,source:record.source==='HOME'?'Anasayfa':'Blog',page:record.page||'/',
      locale:record.locale,createdAt:record.createdAt
    };
    const render=(templateText:string)=>templateText.replace(/{{(phone|source|page|locale|createdAt)}}/g,
      (_:string,key:string)=>values[key]||'');
    try{
      const response=await fetch('https://api.resend.com/emails',{
        method:'POST',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({from,to:[template.recipient],subject:render(template.subject),
          text:render(template.body)})
      });
      return {status:response.ok?'SENT':'FAILED'};
    }catch{return {status:'FAILED'};}
  }
  async submitCallback(body:any,ip:string){
    if(body?.website)return {ok:true};
    await this.throttle(ip);
    const source=String(body?.source||'').toUpperCase();
    if(source!=='HOME'&&source!=='BLOG')throw new BadRequestException('Geçersiz form kaynağı.');
    if(body?.consent!==true)throw new BadRequestException('KVKK aydınlatma onayı zorunludur.');
    const dial=String(body?.dial||'').trim(),national=String(body?.phone||'').replace(/[\s()-]/g,'').trim();
    let phone=dial+national;
    if(national.startsWith('+'))phone=national;
    if(!/^\+[1-9]\d{7,14}$/.test(phone)||!isValidPhoneNumber(phone))
      throw new BadRequestException('Geçerli bir telefon numarası girin.');
    const locale=String(body?.locale||'tr').slice(0,12);
    if(!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(locale))throw new BadRequestException('Dil geçersiz.');
    const page=source==='BLOG'?String(body?.slug||'').slice(0,150):'/';
    if(source==='BLOG'&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page))
      throw new BadRequestException('Blog sayfası geçersiz.');
    const id=randomUUID(),createdAt=new Date().toISOString();
    const record={id,phone,source,page,locale,consent:true,createdAt,updatedAt:createdAt,
      status:'NEW',internalNote:'',notificationStatus:'PENDING'};
    await this.prisma.platformSetting.create({data:{key:this.callbackPrefix+id,value:record}});
    const notification=await this.sendCallbackNotification(record).catch(()=>({status:'FAILED'}));
    await this.prisma.platformSetting.update({where:{key:this.callbackPrefix+id},
      data:{value:{...record,notificationStatus:notification.status}}}).catch(()=>{});
    return {ok:true,id};
  }
  async callbackInbox(){
    const [newRecords,legacy]=await Promise.all([
      this.prisma.platformSetting.findMany({where:{key:{startsWith:this.callbackPrefix}}}),
      this.prisma.platformSetting.findMany({where:{key:{startsWith:'marketing_blog_callback_v1_'}}})
    ]);
    return [...newRecords.map(row=>row.value as any),
      ...legacy.map(row=>{
        const r=row.value as any;
        return {...r,source:'BLOG',page:r.slug||'',locale:r.locale||'tr',
          updatedAt:r.updatedAt||r.createdAt,internalNote:r.internalNote||'',legacy:true,notificationStatus:'LEGACY'};
      })].sort((a:any,b:any)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,1000);
  }
  async updateCallback(id:string,body:any){
    if(!/^[0-9a-f-]{36}$/.test(id))throw new BadRequestException('Geçersiz talep.');
    const key=this.callbackPrefix+id;
    const old=await this.prisma.platformSetting.findUnique({where:{key}});
    const legacyKey='marketing_blog_callback_v1_'+id;
    const legacy=old?null:await this.prisma.platformSetting.findUnique({where:{key:legacyKey}});
    if(!old&&!legacy)throw new NotFoundException('Talep bulunamadı.');
    const record=(old||legacy)!.value as any;
    const status=String(body?.status||record.status);
    if(!['NEW','IN_PROGRESS','CONTACTED','CLOSED'].includes(status))
      throw new BadRequestException('Geçersiz durum.');
    const internalNote=String(body?.internalNote??record.internalNote??'').slice(0,3000);
    const value={...record,status,internalNote,updatedAt:new Date().toISOString()};
    await this.prisma.platformSetting.update({where:{key:old?key:legacyKey},data:{value}});
    return {...value,source:value.source||'BLOG',page:value.page||value.slug||'',legacy:!old};
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
