import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { requestIp, securityHash } from './security';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const method = String(req.method || 'GET').toUpperCase();
    const url = String(req.url || '');
    if (url.includes('/merchant-auth') || url.includes('/superadmin-auth')) return next.handle();
    if (!['POST','PUT','PATCH','DELETE'].includes(method) || (!url.includes('/admin') && !url.includes('/superadmin'))) return next.handle();
    const save = (statusCode: number) => {
      void this.prisma.auditLog.create({ data: {
        tenantId: req.tenantId || null,
        userId: req.merchantUser?.sub || null,
        superAdminId: req.superAdmin?.sub || null,
        action: `${method} ${req.route?.path || req.url}`,
        resource: String(req.route?.path || req.url || '').split('/').filter(Boolean).slice(-2)[0] || 'unknown',
        resourceId: req.params?.id || null,
        method,
        path: String(req.originalUrl || req.url || ''),
        statusCode,
        ipHash: securityHash(requestIp(req)),
        userAgentHash: securityHash(req.headers?.['user-agent']),
      }}).catch(() => undefined);
    };
    return next.handle().pipe(
      tap(() => save(res.statusCode || 200)),
      catchError(err => { save(err?.status || 500); return throwError(() => err); }),
    );
  }
}
