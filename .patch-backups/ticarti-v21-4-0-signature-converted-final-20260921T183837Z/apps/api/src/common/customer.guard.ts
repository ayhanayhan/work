import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req=ctx.switchToHttp().getRequest(); const header=String(req.headers.authorization||''); const token=header.startsWith('Bearer ')?header.slice(7):''; if(!token)throw new UnauthorizedException('Customer bearer token required');
    try{
      const payload=await this.jwt.verifyAsync<any>(token);
      if(payload.kind!=='customer'||!payload.sid||!payload.sub||!payload.storeId)throw new Error('wrong token');
      const session=await this.prisma.customerSession.findFirst({
        where:{id:payload.sid,customerId:payload.sub,revokedAt:null,expiresAt:{gt:new Date()},customer:{storeId:payload.storeId,isActive:true}},
        select:{id:true,customer:{select:{id:true,storeId:true,isActive:true}}},
      });
      if(!session||session.customer.id!==payload.sub||session.customer.storeId!==payload.storeId||!session.customer.isActive)throw new Error('revoked');
      req.customer=payload;return true;
    }catch{throw new UnauthorizedException('Invalid, expired or revoked customer token');}
  }
}
