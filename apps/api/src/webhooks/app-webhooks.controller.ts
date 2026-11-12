import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AppApiGuard } from '../app-auth/app-api.guard';
import { AppRateLimitGuard } from '../app-auth/app-rate-limit.guard';
import { AppScopeGuard } from '../app-auth/app-scope.guard';
import { RequireAppScopes } from '../app-auth/app-scopes';
import { EventOutboxService } from './event-outbox.service';

@Controller('app-api/webhooks')
@UseGuards(AppApiGuard,AppRateLimitGuard,AppScopeGuard)
export class AppWebhooksController{
  constructor(private events:EventOutboxService){}
  @Get() @RequireAppScopes('webhooks:read') list(@Req() req:any){return this.events.listAppSubscriptions(req.appAuth)}
  @Post() @RequireAppScopes('webhooks:write') create(@Req() req:any,@Body() body:any){return this.events.createAppSubscription(req.appAuth,body)}
  @Patch(':id') @RequireAppScopes('webhooks:write') update(@Req() req:any,@Param('id') id:string,@Body() body:any){return this.events.updateAppSubscription(req.appAuth,id,body)}
  @Post(':id/rotate-secret') @RequireAppScopes('webhooks:write') rotate(@Req() req:any,@Param('id') id:string){return this.events.rotateAppSubscriptionSecret(req.appAuth,id)}
  @Delete(':id') @RequireAppScopes('webhooks:write') remove(@Req() req:any,@Param('id') id:string){return this.events.deleteAppSubscription(req.appAuth,id)}
}
