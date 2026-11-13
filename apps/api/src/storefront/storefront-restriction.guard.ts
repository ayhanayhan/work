import {CanActivate,ExecutionContext,ForbiddenException,Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {tenantRestriction} from '../common/subscription-restriction';
@Injectable()
export class StorefrontRestrictionGuard implements CanActivate {
  constructor(private readonly prisma:PrismaService){}
  async canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest();
    const slug=String(req.params?.storeSlug||'').trim();
    if(!slug)return true;
    const tenant=await this.prisma.control().tenant.findFirst({
      where:{OR:[{slug},{publicSlug:slug},{domain:slug}]},select:{id:true}
    });
    if(!tenant)return true;
    const restriction=await tenantRestriction(this.prisma,tenant.id);
    if(!restriction.restricted)return true;
    const route=String(req.route?.path||'');
    if(req.method==='GET'&&/(?:^|\/):storeSlug$/.test(route))return true;
    if(route.includes('/privacy-requests'))return true;
    throw new ForbiddenException('STORE_MAINTENANCE');
  }
}