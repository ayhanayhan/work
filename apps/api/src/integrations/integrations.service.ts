import { BadRequestException, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string) {
    // Credential alanı hiçbir listeleme cevabına dahil edilmez.
    return this.prisma.integrationConnection.findMany({
      where: { tenantId },
      select: { id: true, type: true, provider: true, name: true, enabled: true, config: true, createdAt: true },
    });
  }

  private encryptionKey() {
    const supplied = process.env.INTEGRATION_ENCRYPTION_KEY || '';
    if (process.env.NODE_ENV === 'production' && supplied.length < 32) {
      throw new BadRequestException('Integration credential encryption key is not configured');
    }
    return createHash('sha256').update(supplied || process.env.JWT_SECRET || 'development-only-key').digest();
  }

  private encrypt(value: Record<string, unknown>) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { version: 1, algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64'), data: data.toString('base64') };
  }

  private decrypt(value: any) {
    if (!value || Number(value.version) !== 1 || value.algorithm !== 'aes-256-gcm') return {};
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(String(value.iv), 'base64'));
    decipher.setAuthTag(Buffer.from(String(value.tag), 'base64'));
    const data = Buffer.concat([decipher.update(Buffer.from(String(value.data), 'base64')), decipher.final()]).toString('utf8');
    return JSON.parse(data || '{}');
  }

  async internalConnection(tenantId: string, id?: string) {
    const row = await this.prisma.integrationConnection.findFirst({ where: { tenantId, type: 'AI', enabled: true, ...(id ? { id } : {}) } });
    if (!row) return null;
    return { ...row, credentials: this.decrypt(row.credentials) };
  }

  async internalProviderConnection(tenantId: string, provider: string) {
    const row = await this.prisma.integrationConnection.findFirst({ where: { tenantId, provider, enabled: true } });
    if (!row) return null;
    return { ...row, credentials: this.decrypt(row.credentials) };
  }

  create(tenantId: string, body: { type: 'MARKETPLACE'|'PAYMENT'|'SHIPPING'|'INVOICE'|'MARKETING'|'AI'|'SOCIAL'|'ANALYTICS'|'MESSAGING'|'CRM'; provider: string; name: string; credentials: Record<string, unknown>; config?: Record<string, unknown> }) {
    if (!body.provider?.trim() || !body.name?.trim()) throw new BadRequestException('Provider ve isim zorunludur');
    return this.prisma.integrationConnection.create({
      data: {
        tenantId,
        type: body.type,
        provider: body.provider.trim(),
        name: body.name.trim(),
        credentials: this.encrypt(body.credentials || {}) as any,
        config: (body.config || {}) as any,
      },
      select: { id: true, type: true, provider: true, name: true, enabled: true, config: true, createdAt: true },
    });
  }

  async update(tenantId:string,id:string,body:any) {
    const row=await this.prisma.integrationConnection.findFirst({where:{id,tenantId}});
    if(!row) throw new BadRequestException('Integration not found');
    const data:any={};
    if(body.enabled!==undefined)data.enabled=!!body.enabled;
    if(body.name!==undefined)data.name=String(body.name).trim();
    if(body.config!==undefined)data.config=body.config;
    if(body.credentials!==undefined)data.credentials=this.encrypt(body.credentials||{}) as any;
    return this.prisma.integrationConnection.update({where:{id},data,select:{id:true,type:true,provider:true,name:true,enabled:true,config:true,createdAt:true}});
  }
  async connectionByProvider(tenantId:string,provider:string) {
    return this.prisma.integrationConnection.findFirst({
      where:{tenantId,provider},
      select:{id:true,type:true,provider:true,name:true,enabled:true,config:true,createdAt:true,updatedAt:true},
    });
  }

  async upsertProviderConnection(tenantId:string, body:{type:any;provider:string;name:string;credentials?:Record<string,unknown>;config?:Record<string,unknown>;enabled?:boolean}) {
    const row=await this.prisma.integrationConnection.findFirst({where:{tenantId,provider:body.provider}});
    if(row){
      const data:any={name:body.name,enabled:body.enabled!==false,config:(body.config||{}) as any};
      if(body.credentials&&Object.keys(body.credentials).some(k=>String((body.credentials as any)[k]||'').trim())) data.credentials=this.encrypt(body.credentials) as any;
      return this.prisma.integrationConnection.update({where:{id:row.id},data,select:{id:true,type:true,provider:true,name:true,enabled:true,config:true,createdAt:true,updatedAt:true}});
    }
    return this.prisma.integrationConnection.create({data:{tenantId,type:body.type,provider:body.provider,name:body.name,credentials:this.encrypt(body.credentials||{}) as any,config:(body.config||{}) as any,enabled:body.enabled!==false},select:{id:true,type:true,provider:true,name:true,enabled:true,config:true,createdAt:true,updatedAt:true}});
  }

  async disableProviderConnection(tenantId:string,provider:string){
    await this.prisma.integrationConnection.updateMany({where:{tenantId,provider},data:{enabled:false}});
  }

}
