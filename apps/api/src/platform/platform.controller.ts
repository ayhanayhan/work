import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(private readonly svc: PlatformService) {}
  @Get('plans') plans(){ return this.svc.plans(); }
  @Get('package-features') packageFeatures(@Query('locale') locale?:string){ return this.svc.packageFeatures(locale); }
  @Get('package-features/:slug') packageFeature(@Param('slug') slug:string,@Query('locale') locale?:string){ return this.svc.packageFeature(slug,locale); }
  @Get('apps') apps(){ return this.svc.apps(); }
}
