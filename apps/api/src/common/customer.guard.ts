import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req=ctx.switchToHttp().getRequest(); const header=String(req.headers.authorization||''); const token=header.startsWith('Bearer ')?header.slice(7):''; if(!token)throw new UnauthorizedException('Customer bearer token required');
    try{const payload=await this.jwt.verifyAsync<any>(token);if(payload.kind!=='customer'||!payload.sid)throw new Error('wrong token');const session=await this.prisma.customerSession.findFirst({where:{id:payload.sid,customerId:payload.sub,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true}});if(!session)throw new Error('revoked');req.customer=payload;return true;}catch{throw new UnauthorizedException('Invalid, expired or revoked customer token');}
  }
}
