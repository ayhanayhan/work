import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { OperationsWorkerService } from './operations-worker.service';
import { WorkerAuthGuard } from './worker-auth.guard';
import { EmailService } from '../email/email.service';

@Controller('internal/workers')
@UseGuards(WorkerAuthGuard)
export class OperationsWorkerController{
 constructor(private svc:OperationsWorkerService,private email:EmailService){}
 @Get('status') status(){return this.svc.runLocal(()=>this.svc.status())}
 @Post('retry-dead') retryDead(@Query('limit') limit?:string){return this.svc.runLocal(()=>this.svc.retryDeadWebhooks(Number(limit||50)))}
 @Post('process') process(@Query('limit') limit?:string){return this.svc.runLocal(()=>this.svc.processAll(Number(limit||50)))}
 @Post('shipping') shipping(@Query('limit') limit?:string){return this.svc.runLocal(()=>this.svc.processShipping(Number(limit||25)))}
 @Post('sms') sms(@Query('limit') limit?:string){return this.svc.runLocal(()=>this.svc.processScheduledSms(Number(limit||50)))}
 @Post('email-marketing') marketingEmail(@Query('limit') limit?:string){return this.svc.runLocal(()=>this.email.processMarketing(Number(limit||20)))}
}
