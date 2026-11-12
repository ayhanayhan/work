import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class B2BQuoteService {
  constructor(private readonly prisma:PrismaService){}

  private async store(tenantId:string,storeId:string){
    const store=await this.prisma.tenant.findFirst({where:{id:storeId}});
    if(!store||store.id!==tenantId)throw new NotFoundException('Store not found');
    return store;
  }

  async list(tenantId:string,storeId:string,status?:string){
    await this.store(tenantId,storeId);
    return this.prisma.b2BQuoteRequest.findMany({
      where:{storeId,...(status&&status!=='ALL'?{status:String(status).toUpperCase()}: {})},
      orderBy:{createdAt:'desc'},
      take:250
    });
  }

  async update(tenantId:string,storeId:string,id:string,body:any){
    await this.store(tenantId,storeId);
    const row=await this.prisma.b2BQuoteRequest.findFirst({where:{id,storeId}});
    if(!row)throw new NotFoundException('Quote request not found');
    const allowedStatus=['NEW','IN_REVIEW','QUOTED','ACCEPTED','REJECTED','CLOSED'];
    const data:any={};
    if(body.status!==undefined){
      const status=String(body.status).toUpperCase();
      if(!allowedStatus.includes(status))throw new BadRequestException('Invalid quote status');
      data.status=status;
    }
    if(body.response!==undefined)data.response=String(body.response||'').slice(0,10000)||null;
    if(body.internalNote!==undefined)data.internalNote=String(body.internalNote||'').slice(0,10000)||null;
    return this.prisma.b2BQuoteRequest.update({where:{id},data});
  }
}
