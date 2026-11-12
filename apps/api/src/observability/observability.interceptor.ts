import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { ObservabilityService } from './observability.service';
import { normalizeTraceId, runWithTrace } from '../common/trace-context';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(private readonly metrics:ObservabilityService){}
  intercept(ctx:ExecutionContext,next:CallHandler):Observable<any>{
    const req=ctx.switchToHttp().getRequest();
    const res=ctx.switchToHttp().getResponse();
    const start=process.hrtime.bigint();
    let status=200;
    const traceId=normalizeTraceId(req?.headers?.['x-trace-id']||req?.headers?.['x-request-id']);
    req.traceId=traceId;
    res?.setHeader?.('x-trace-id',traceId);
    res?.setHeader?.('x-request-id',traceId);
    this.metrics.begin();
    return runWithTrace(traceId,()=>next.handle().pipe(
      catchError(err=>{status=Number(err?.status||err?.statusCode||500);return throwError(()=>err)}),
      finalize(()=>{
        const elapsed=Number(process.hrtime.bigint()-start)/1e6;
        this.metrics.end(String(req?.method||'GET'),String(req?.route?.path||req?.originalUrl||req?.url||'unknown').split('?')[0],Number(res?.statusCode||status||200),elapsed);
      })
    ));
  }
}
