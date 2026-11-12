import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DeveloperAuthGuard } from './developer-auth.guard';
import { DeveloperPlatformService } from './developer-platform.service';
@Controller('developer')
export class DeveloperPlatformController{
 constructor(private svc:DeveloperPlatformService){}
 @Post('auth/register') register(@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.register(b,locale)}
 @Post('auth/login') login(@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.login(b,locale)}
 @UseGuards(DeveloperAuthGuard) @Get('me') me(@Req() r:any){return this.svc.me(r.developer)}
 @UseGuards(DeveloperAuthGuard) @Get('dashboard') dashboard(@Req() r:any){return this.svc.dashboard(r.developer)}
 @UseGuards(DeveloperAuthGuard) @Get('apps') apps(@Req() r:any){return this.svc.apps(r.developer)}
 @UseGuards(DeveloperAuthGuard) @Get('apps/:appId') app(@Req() r:any,@Param('appId') a:string,@Headers('accept-language') locale?:string){return this.svc.app(r.developer,a,locale)}
 @UseGuards(DeveloperAuthGuard) @Patch('apps/:appId') updateApp(@Req() r:any,@Param('appId') a:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.updateApp(r.developer,a,b,locale)}
 @UseGuards(DeveloperAuthGuard) @Get('apps/:appId/clients') clients(@Req() r:any,@Param('appId') a:string,@Headers('accept-language') locale?:string){return this.svc.clients(r.developer,a,locale)}
 @UseGuards(DeveloperAuthGuard) @Post('apps/:appId/clients') createClient(@Req() r:any,@Param('appId') a:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.createClient(r.developer,a,b,locale)}
 @UseGuards(DeveloperAuthGuard) @Post('apps/:appId/clients/:clientId/rotate-secret') rotateClient(@Req() r:any,@Param('appId') a:string,@Param('clientId') c:string,@Headers('accept-language') locale?:string){return this.svc.rotateClient(r.developer,a,c,locale)}
 @UseGuards(DeveloperAuthGuard) @Patch('apps/:appId/clients/:clientId/state') clientState(@Req() r:any,@Param('appId') a:string,@Param('clientId') c:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.clientState(r.developer,a,c,b,locale)}
 @UseGuards(DeveloperAuthGuard) @Get('apps/:appId/test-stores') testStores(@Req() r:any,@Param('appId') a:string,@Headers('accept-language') locale?:string){return this.svc.testStores(r.developer,a,locale)}
 @UseGuards(DeveloperAuthGuard) @Post('apps/:appId/test-stores/:tenantId/install') installTest(@Req() r:any,@Param('appId') a:string,@Param('tenantId') t:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.installTest(r.developer,a,t,b,locale)}
 @UseGuards(DeveloperAuthGuard) @Post('apps') createApp(@Req() r:any,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.createApp(r.developer,b,locale)}
 @UseGuards(DeveloperAuthGuard) @Post('apps/:appId/versions') createVersion(@Req() r:any,@Param('appId') a:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.createVersion(r.developer,a,b,locale)}
 @UseGuards(DeveloperAuthGuard) @Patch('apps/:appId/versions/:versionId') updateVersion(@Req() r:any,@Param('appId') a:string,@Param('versionId') v:string,@Body() b:any,@Headers('accept-language') locale?:string){return this.svc.updateVersion(r.developer,a,v,b,locale)}
 @UseGuards(DeveloperAuthGuard) @Post('apps/:appId/versions/:versionId/submit') submit(@Req() r:any,@Param('appId') a:string,@Param('versionId') v:string,@Headers('accept-language') locale?:string){return this.svc.submit(r.developer,a,v,locale)}
}
