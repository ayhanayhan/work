import {Body,Controller,Delete,Get,Headers,Param,Patch,Post,UseGuards} from '@nestjs/common';
import {CurrentTenant} from '../common/request.decorator';
import {PermissionGuard} from '../common/permission.guard';
import {RequirePermission} from '../common/permissions';
import {TenantGuard} from '../common/tenant.guard';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {BuiltinAppsService} from './builtin-apps.service';
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
@RequirePermission('settings.manage')
@Controller('admin/builtin-apps')
export class BuiltinAppsAdminController{
 constructor(private s:BuiltinAppsService){}
 @Get('quizzes') ql(@CurrentTenant() t:string,@Headers('accept-language') l?:string){return this.s.quizList(t,l)}
 @Post('quizzes') qc(@CurrentTenant() t:string,@Body() b:any,@Headers('accept-language') l?:string){return this.s.quizCreate(t,b,l)}
 @Patch('quizzes/:id') qu(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any,@Headers('accept-language') l?:string){return this.s.quizUpdate(t,id,b,l)}
 @Delete('quizzes/:id') qd(@CurrentTenant() t:string,@Param('id') id:string,@Headers('accept-language') l?:string){return this.s.quizDelete(t,id,l)}
 @Post('quizzes/:id/questions') qq(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any,@Headers('accept-language') l?:string){return this.s.quizReplaceQuestions(t,id,b,l)}
 @Get('bundles') bl(@CurrentTenant() t:string,@Headers('accept-language') l?:string){return this.s.bundleList(t,l)}
 @Post('bundles') bc(@CurrentTenant() t:string,@Body() b:any,@Headers('accept-language') l?:string){return this.s.bundleCreate(t,b,l)}
 @Patch('bundles/:id') bu(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any,@Headers('accept-language') l?:string){return this.s.bundleUpdate(t,id,b,l)}
 @Delete('bundles/:id') bd(@CurrentTenant() t:string,@Param('id') id:string,@Headers('accept-language') l?:string){return this.s.bundleDelete(t,id,l)}
 @Get('glossary') gl(@CurrentTenant() t:string){return this.s.glossaryList(t)}
 @Post('glossary') gc(@CurrentTenant() t:string,@Body() b:any){return this.s.glossaryCreate(t,b)}
 @Patch('glossary/:id') gu(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.s.glossaryUpdate(t,id,b)}
 @Delete('glossary/:id') gd(@CurrentTenant() t:string,@Param('id') id:string){return this.s.glossaryDelete(t,id)}
 @Get('careers/jobs') cjl(@CurrentTenant() t:string){return this.s.careerJobs(t)}
 @Post('careers/jobs') cjc(@CurrentTenant() t:string,@Body() b:any){return this.s.careerCreate(t,b)}
 @Patch('careers/jobs/:id') cju(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.s.careerUpdate(t,id,b)}
 @Delete('careers/jobs/:id') cjd(@CurrentTenant() t:string,@Param('id') id:string){return this.s.careerDelete(t,id)}
 @Get('careers/applications') ca(@CurrentTenant() t:string){return this.s.careerApplications(t)}
 @Patch('careers/applications/:id/status') cas(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.s.careerApplicationStatus(t,id,b.status)}
}
