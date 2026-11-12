import { Controller, Get } from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';

@Controller('platform')
export class PlatformPublicController {
  constructor(private svc: SuperAdminService) {}
  @Get('content')
  async content(){
    const content:any=await this.svc.platformContent();
    return {marketing:content.marketing||{},blog:content.blog||[],pages:content.pages||[],locales:content.locales||[]};
  }

  @Get('branding')
  async branding(){
    const settings:any=await this.svc.platformSettings();
    return {companyName:settings?.company?.name||'Ticarti',branding:settings?.branding||{}};
  }
}
