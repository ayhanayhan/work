import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { apiText } from '../i18n/api-i18n';

export type DeveloperAuthUser={sub:string;email:string;sid:string;orgId:string;role:string;kind:'developer'};
function secret(){const v=String(process.env.DEVELOPER_JWT_SECRET||'');if(process.env.NODE_ENV==='production'&&v.length<48)throw new Error('DEVELOPER_JWT_SECRET must be at least 48 characters');return v||'dev-developer-jwt-secret-change-me-please-48-characters-minimum'}
@Injectable()
export class DeveloperAuthGuard implements CanActivate{
  private jwt=new JwtService({secret:secret()});
  constructor(private prisma:PrismaService){}
  async canActivate(ctx:ExecutionContext){const req=ctx.switchToHttp().getRequest();const h=String(req.headers.authorization||'');const token=h.startsWith('Bearer ')?h.slice(7):'';if(!token)throw new UnauthorizedException(apiText('dev.bearerRequired',req.headers?.['accept-language']));try{const p=await this.jwt.verifyAsync<DeveloperAuthUser>(token,{issuer:'commerce-api',audience:'commerce-developer'});if(p.kind!=='developer'||!p.sid||!p.orgId)throw new Error();const sess=await this.prisma.developerSession.findFirst({where:{id:p.sid,userId:p.sub,revokedAt:null,expiresAt:{gt:new Date()},user:{isActive:true,memberships:{some:{organizationId:p.orgId}}}},select:{id:true}});if(!sess)throw new Error();req.developer=p;return true}catch{throw new UnauthorizedException(apiText('dev.invalidToken',req.headers?.['accept-language']))}}
}
