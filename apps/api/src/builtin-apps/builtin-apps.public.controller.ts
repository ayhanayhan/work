import {Body,Controller,Get,Headers,Param,Post} from '@nestjs/common';
import {BuiltinAppsService} from './builtin-apps.service';
@Controller('storefront/:store/apps')
export class BuiltinAppsPublicController{
 constructor(private s:BuiltinAppsService){}
 @Get('product-finder/quizzes/:slug') quiz(@Param('store') store:string,@Param('slug') slug:string,@Headers('accept-language') l?:string){return this.s.publicQuiz(store,slug,l)}
 @Post('product-finder/quizzes/:slug/result') result(@Param('store') store:string,@Param('slug') slug:string,@Body() b:any,@Headers('accept-language') l?:string){return this.s.publicQuizResult(store,slug,b,l)}
 @Get('product-bundles/:productId') productBundles(@Param('store') store:string,@Param('productId') productId:string,@Headers('accept-language') l?:string){return this.s.publicBundlesForProduct(store,productId,l)}
 @Get('bundles/:slug') bundle(@Param('store') store:string,@Param('slug') slug:string,@Headers('accept-language') l?:string){return this.s.publicBundle(store,slug,l)}
 @Get('glossary') glossary(@Param('store') store:string){return this.s.publicGlossary(store)}
 @Get('glossary/:slug') term(@Param('store') store:string,@Param('slug') slug:string){return this.s.publicGlossaryTerm(store,slug)}
 @Get('careers') jobs(@Param('store') store:string){return this.s.publicCareerJobs(store)}
 @Get('careers/:slug') job(@Param('store') store:string,@Param('slug') slug:string){return this.s.publicCareerJob(store,slug)}
 @Post('careers/:slug/apply') apply(@Param('store') store:string,@Param('slug') slug:string,@Body() b:any){return this.s.publicCareerApply(store,slug,b)}
}
