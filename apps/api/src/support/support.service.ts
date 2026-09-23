import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async listTenant(tenantId: string) {
    return this.prisma.supportTicket.findMany({ where: { tenantId }, include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
  }
  async create(tenantId: string, userId: string, body: any) {
    if (body.storeId && body.storeId !== tenantId) throw new ForbiddenException('Site does not belong to tenant');
    return this.prisma.supportTicket.create({ data: { tenantId, subject: body.subject, category: body.category, priority: body.priority || 'NORMAL', createdById: userId, messages: { create: { userId, authorType: 'merchant', body: body.message } } }, include: { messages: true } });
  }
  async addMerchantMessage(tenantId: string, ticketId: string, userId: string, body: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw new NotFoundException();
    await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'OPEN' } });
    return this.prisma.supportMessage.create({ data: { ticketId, userId, authorType: 'merchant', body } });
  }
  async listAll() { return this.prisma.supportTicket.findMany({ include: { tenant: true, messages: { orderBy: { createdAt: 'asc' } } }, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] }); }
  async updateAsSupport(ticketId: string, superAdminId: string, body: any) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException();
    if (body.message) await this.prisma.supportMessage.create({ data: { ticketId, superAdminId, authorType: 'support', body: body.message, isInternal: !!body.isInternal } });
    return this.prisma.supportTicket.update({ where: { id: ticketId }, data: { ...(body.status ? { status: body.status } : {}), ...(body.priority ? { priority: body.priority } : {}), assignedTo: body.assignedTo ?? ticket.assignedTo }, include: { messages: { orderBy: { createdAt: 'asc' } }, tenant: true } });
  }
}
