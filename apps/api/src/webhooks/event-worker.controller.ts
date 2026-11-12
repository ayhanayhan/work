import { Controller, Headers, Post, Query } from '@nestjs/common';
import { EventOutboxService } from './event-outbox.service';
@Controller('internal/events')
export class EventWorkerController{
  constructor(private events:EventOutboxService){}
  @Post('process') process(@Headers('authorization') auth:string,@Query('limit') limit?:string){this.events.assertWorkerToken(String(auth||''));return this.events.processBatch(Number(limit||50))}
}
