import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_SCOPES_KEY } from './app-scopes';
@Injectable()
export class AppScopeGuard implements CanActivate{
  constructor(private reflector:Reflector){}
  canActivate(ctx:ExecutionContext){const required=this.reflector.getAllAndOverride<string[]>(APP_SCOPES_KEY,[ctx.getHandler(),ctx.getClass()])||[];if(!required.length)return true;const req=ctx.switchToHttp().getRequest();const granted=new Set<string>(req.appAuth?.scopes||[]);const missing=required.filter(x=>!granted.has(x));if(missing.length)throw new ForbiddenException(`Missing app scope: ${missing.join(', ')}`);return true;}
}
