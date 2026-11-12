import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { DeveloperPlatformService } from './developer-platform.service';
import { OperationsWorkerService } from '../operations-worker/operations-worker.service';
@Controller('superadmin/app-review')
@UseGuards(SuperAdminAuthGuard)
export class AppReviewAdminController{
 constructor(private svc:DeveloperPlatformService,private workers:OperationsWorkerService){}
 @Get('queue') queue(){return this.svc.queue()}
 @Get('apps') apps(){return this.svc.adminApps()}
 @Get('workers/status') workerStatus(){return this.workers.status()}
 @Post('workers/run') workerRun(@Body() b:any){return this.workers.processAll(Number(b?.limit||50))}
 @Post('workers/retry-dead') retryDead(@Body() b:any){return this.workers.retryDeadWebhooks(Number(b?.limit||50))}
 @Post(':id/decision') decide(@Param('id') id:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.decide(id,b,locale)}
 @Post('versions/:versionId/distribution') distribution(@Param('versionId') id:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.setDistribution(id,b,locale)}
 @Post('versions/:versionId/publish') publish(@Param('versionId') id:string,@Headers('accept-language') locale?:string){return this.svc.publish(id,locale)}
 @Post('versions/:versionId/rollback') rollback(@Param('versionId') id:string,@Headers('accept-language') locale?:string){return this.svc.rollback(id,locale)}
 @Post('versions/:versionId/unpublish') unpublish(@Param('versionId') id:string,@Headers('accept-language') locale?:string){return this.svc.unpublish(id,locale)}
}
