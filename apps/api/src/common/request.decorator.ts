import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUser = createParamDecorator((_d, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
export const CurrentTenant = createParamDecorator((_d, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().tenantId);
