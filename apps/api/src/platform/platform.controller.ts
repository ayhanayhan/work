import { Controller, Get } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(private readonly svc: PlatformService) {}
  @Get('plans') plans(){ return this.svc.plans(); }
  @Get('apps') apps(){ return this.svc.apps(); }
}
