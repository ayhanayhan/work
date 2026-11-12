import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] as const;
const VALID_STATUS = new Set(['OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED']);
const VALID_PRIORITY = new Set(['LOW','NORMAL','HIGH','URGENT']);

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  private cleanText(v: any, max = 5000) { return String(v ?? '').trim().slice(0, max); }
  private slaHours(priority: string) { return priority === 'URGENT' ? 2 : priority === 'HIGH' ? 8 : priority === 'LOW' ? 48 : 24; }
  private slaDue(priority: string) { return new Date(Date.now() + this.slaHours(priority) * 60 * 60 * 1000); }
  private ticketNumber() { return `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
  private attachments(input: any) {
    const rows = Array.isArray(input) ? input : [];
    return rows.slice(0, 10).map((x: any) => {
      const url = this.cleanText(typeof x === 'string' ? x : x?.url, 2000);
      if (!/^https?:\/\//i.test(url)) return null;
      return { url, name: this.cleanText(x?.name, 255) || null, mimeType: this.cleanText(x?.mimeType, 120) || null, sizeBytes: Number.isFinite(Number(x?.sizeBytes)) ? Math.max(0, Math.floor(Number(x.sizeBytes))) : null };
    }).filter(Boolean) as {url:string;name:string|null;mimeType:string|null;sizeBytes:number|null}[];
  }
  private statusData(status: string) {
    const now = new Date();
    if (status === 'RESOLVED') return { status: status as any, resolvedAt: now, closedAt: null };
    if (status === 'CLOSED') return { status: status as any, closedAt: now };
    return { status: status as any, resolvedAt: null, closedAt: null };
  }

  async listTenant(tenantId: string, q: any = {}) {
    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit || 25)));
    const where: any = { tenantId };
    if (q.status && VALID_STATUS.has(String(q.status))) where.status = String(q.status);
    if (q.priority && VALID_PRIORITY.has(String(q.priority))) where.priority = String(q.priority);
    if (q.category) where.category = String(q.category);
    if (q.q) {
      const s = String(q.q).slice(0, 120);
      where.OR = [{ subject: { contains: s, mode: 'insensitive' } }, { ticketNumber: { contains: s, mode: 'insensitive' } }, { category: { contains: s, mode: 'insensitive' } }];
    }
    const now = new Date();
    const [items,total,open,inProgress,waiting,resolvedThisMonth,overdue] = await Promise.all([
      this.prisma.supportTicket.findMany({where,include:{messages:{where:{isInternal:false},orderBy:{createdAt:'desc'},take:1},attachments:{take:3,orderBy:{createdAt:'desc'}}},orderBy:[{updatedAt:'desc'}],skip:(page-1)*limit,take:limit}),
      this.prisma.supportTicket.count({where}),
      this.prisma.supportTicket.count({where:{tenantId,status:'OPEN'}}),
      this.prisma.supportTicket.count({where:{tenantId,status:'IN_PROGRESS'}}),
      this.prisma.supportTicket.count({where:{tenantId,status:'WAITING_CUSTOMER'}}),
      this.prisma.supportTicket.count({where:{tenantId,status:{in:['RESOLVED','CLOSED']},resolvedAt:{gte:new Date(now.getFullYear(),now.getMonth(),1)}}}),
      this.prisma.supportTicket.count({where:{tenantId,status:{in:[...ACTIVE_STATUSES]},slaDueAt:{lt:now}}}),
    ]);
    return {items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),summary:{open,inProgress,waiting,resolvedThisMonth,overdue}};
  }

  async tenantDetail(tenantId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({where:{id:ticketId,tenantId},include:{messages:{where:{isInternal:false},include:{attachments:true,user:{select:{id:true,name:true,email:true}},superAdmin:{select:{id:true,name:true}}},orderBy:{createdAt:'asc'}},attachments:{where:{messageId:null},orderBy:{createdAt:'asc'}}}});
    if (!ticket) throw new NotFoundException('Destek talebi bulunamadı.');
    return ticket;
  }

  async create(tenantId: string, userId: string, body: any) {
    if (body.storeId && body.storeId !== tenantId) throw new ForbiddenException('Site does not belong to tenant');
    const subject = this.cleanText(body.subject, 240);
    const message = this.cleanText(body.message, 10000);
    if (!subject) throw new BadRequestException('Konu zorunlu.');
    if (!message) throw new BadRequestException('Talep açıklaması zorunlu.');
    const priority = VALID_PRIORITY.has(String(body.priority)) ? String(body.priority) : 'NORMAL';
    const files = this.attachments(body.attachments);
    const now = new Date();
    return this.prisma.$transaction(async tx => {
      const ticket = await tx.supportTicket.create({data:{tenantId,ticketNumber:this.ticketNumber(),subject,category:this.cleanText(body.category,120)||null,priority:priority as any,channel:'ADMIN',createdById:userId,relatedOrderId:this.cleanText(body.relatedOrderId,120)||null,relatedIntegrationId:this.cleanText(body.relatedIntegrationId,120)||null,tags:Array.isArray(body.tags)?body.tags.map((x:any)=>this.cleanText(x,50)).filter(Boolean).slice(0,20):[],slaDueAt:this.slaDue(priority),lastMerchantReplyAt:now}});
      const msg = await tx.supportMessage.create({data:{ticketId:ticket.id,userId,authorType:'merchant',body:message}});
      if (files.length) await tx.supportAttachment.createMany({data:files.map(x=>({...x,ticketId:ticket.id,messageId:msg.id,uploadedBy:userId}))});
      return tx.supportTicket.findUnique({where:{id:ticket.id},include:{messages:{include:{attachments:true},orderBy:{createdAt:'asc'}},attachments:true}});
    });
  }

  async addMerchantMessage(tenantId: string, ticketId: string, userId: string, payload: any) {
    const body = typeof payload === 'string' ? payload : payload?.message;
    const text = this.cleanText(body, 10000);
    if (!text) throw new BadRequestException('Mesaj boş olamaz.');
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw new NotFoundException('Destek talebi bulunamadı.');
    if (ticket.status === 'CLOSED') throw new BadRequestException('Kapalı destek talebini yeniden açın.');
    const files = this.attachments(typeof payload === 'object' ? payload?.attachments : []);
    return this.prisma.$transaction(async tx => {
      await tx.supportTicket.update({where:{id:ticketId},data:{status:'OPEN',resolvedAt:null,closedAt:null,lastMerchantReplyAt:new Date()}});
      const msg = await tx.supportMessage.create({data:{ticketId,userId,authorType:'merchant',body:text}});
      if(files.length) await tx.supportAttachment.createMany({data:files.map(x=>({...x,ticketId,messageId:msg.id,uploadedBy:userId}))});
      return tx.supportMessage.findUnique({where:{id:msg.id},include:{attachments:true}});
    });
  }

  async merchantUpdate(tenantId:string,ticketId:string,body:any){
    const ticket=await this.prisma.supportTicket.findFirst({where:{id:ticketId,tenantId}});if(!ticket)throw new NotFoundException();
    const action=String(body.action||'');
    if(action==='close')return this.prisma.supportTicket.update({where:{id:ticketId},data:this.statusData('CLOSED')});
    if(action==='reopen')return this.prisma.supportTicket.update({where:{id:ticketId},data:{status:'OPEN',resolvedAt:null,closedAt:null,slaDueAt:this.slaDue(ticket.priority)}});
    throw new BadRequestException('Desteklenen işlem değil.');
  }

  async listAll(q:any={}) {
    const page=Math.max(1,Number(q.page||1)),limit=Math.min(100,Math.max(1,Number(q.limit||30)));const where:any={};
    if(q.status&&VALID_STATUS.has(String(q.status)))where.status=String(q.status);
    if(q.priority&&VALID_PRIORITY.has(String(q.priority)))where.priority=String(q.priority);
    if(q.assignedTo==='UNASSIGNED')where.assignedTo=null;else if(q.assignedTo)where.assignedTo=String(q.assignedTo);
    if(q.q){const s=String(q.q).slice(0,120);where.OR=[{subject:{contains:s,mode:'insensitive'}},{ticketNumber:{contains:s,mode:'insensitive'}},{tenant:{name:{contains:s,mode:'insensitive'}}}]}
    const now=new Date();
    const [items,total,open,waiting,urgent,overdue,agents]=await Promise.all([
      this.prisma.supportTicket.findMany({where,include:{tenant:{select:{id:true,name:true,slug:true}},messages:{orderBy:{createdAt:'desc'},take:1}},orderBy:[{priority:'desc'},{updatedAt:'desc'}],skip:(page-1)*limit,take:limit}),
      this.prisma.supportTicket.count({where}),
      this.prisma.supportTicket.count({where:{status:{in:['OPEN','IN_PROGRESS']}}}),
      this.prisma.supportTicket.count({where:{status:'WAITING_CUSTOMER'}}),
      this.prisma.supportTicket.count({where:{priority:'URGENT',status:{in:[...ACTIVE_STATUSES]}}}),
      this.prisma.supportTicket.count({where:{status:{in:[...ACTIVE_STATUSES]},slaDueAt:{lt:now}}}),
      this.prisma.superAdmin.findMany({where:{isActive:true},select:{id:true,name:true,email:true},orderBy:{name:'asc'}}),
    ]);
    const map=new Map(agents.map(a=>[a.id,a]));
    return {items:items.map(x=>({...x,assignedAgent:x.assignedTo?map.get(x.assignedTo)||null:null})),total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),summary:{open,waiting,urgent,overdue},agents};
  }

  async supportDetail(ticketId:string){
    const ticket=await this.prisma.supportTicket.findUnique({where:{id:ticketId},include:{tenant:{select:{id:true,name:true,slug:true}},messages:{include:{attachments:true,user:{select:{id:true,name:true,email:true}},superAdmin:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'asc'}},attachments:{where:{messageId:null}},}});if(!ticket)throw new NotFoundException();
    const [creator,agent]=await Promise.all([this.prisma.user.findUnique({where:{id:ticket.createdById},select:{id:true,name:true,email:true}}),ticket.assignedTo?this.prisma.superAdmin.findUnique({where:{id:ticket.assignedTo},select:{id:true,name:true,email:true}}):Promise.resolve(null)]);
    return {...ticket,creator,assignedAgent:agent};
  }

  async agents(){return this.prisma.superAdmin.findMany({where:{isActive:true},select:{id:true,name:true,email:true},orderBy:{name:'asc'}})}

  async updateAsSupport(ticketId: string, superAdminId: string, body: any) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException();
    const status=body.status&&VALID_STATUS.has(String(body.status))?String(body.status):null;
    const priority=body.priority&&VALID_PRIORITY.has(String(body.priority))?String(body.priority):null;
    const update:any={};
    if(status)Object.assign(update,this.statusData(status));
    if(priority){update.priority=priority; if(ACTIVE_STATUSES.includes((status||ticket.status) as any))update.slaDueAt=this.slaDue(priority)}
    if(Object.prototype.hasOwnProperty.call(body,'assignedTo'))update.assignedTo=body.assignedTo||null;
    if(Array.isArray(body.tags))update.tags=body.tags.map((x:any)=>this.cleanText(x,50)).filter(Boolean).slice(0,20);
    if(body.slaDueAt!==undefined)update.slaDueAt=body.slaDueAt?new Date(body.slaDueAt):null;
    if(body.category!==undefined)update.category=this.cleanText(body.category,120)||null;
    if(body.relatedOrderId!==undefined)update.relatedOrderId=this.cleanText(body.relatedOrderId,120)||null;
    if(body.relatedIntegrationId!==undefined)update.relatedIntegrationId=this.cleanText(body.relatedIntegrationId,120)||null;
    if(body.message) await this.addSupportMessage(ticketId,superAdminId,body);
    return this.prisma.supportTicket.update({ where: { id: ticketId }, data:update, include:{tenant:true,messages:{include:{attachments:true},orderBy:{createdAt:'asc'}}} });
  }

  async addSupportMessage(ticketId:string,superAdminId:string,body:any){
    const ticket=await this.prisma.supportTicket.findUnique({where:{id:ticketId}});if(!ticket)throw new NotFoundException();
    const text=this.cleanText(body.message,10000);if(!text)throw new BadRequestException('Mesaj boş olamaz.');const internal=!!body.isInternal;const files=this.attachments(body.attachments);const now=new Date();
    return this.prisma.$transaction(async tx=>{
      const msg=await tx.supportMessage.create({data:{ticketId,superAdminId,authorType:'support',body:text,isInternal:internal}});
      if(files.length)await tx.supportAttachment.createMany({data:files.map(x=>({...x,ticketId,messageId:msg.id,uploadedBy:superAdminId}))});
      if(!internal)await tx.supportTicket.update({where:{id:ticketId},data:{status:'WAITING_CUSTOMER',lastSupportReplyAt:now,firstResponseAt:ticket.firstResponseAt||now}});
      return tx.supportMessage.findUnique({where:{id:msg.id},include:{attachments:true}});
    });
  }
}
