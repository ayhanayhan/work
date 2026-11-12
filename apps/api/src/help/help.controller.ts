import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { HelpService } from './help.service';
@Controller('help')
export class HelpController{constructor(private svc:HelpService){}@Get('categories')categories(@Query('locale')l='tr'){return this.svc.publicCategories(l)}@Get('articles')articles(@Query('locale')l='tr',@Query('q')q='',@Query('category')c=''){return this.svc.publicArticles(l,q,c)}@Get('articles/:slug')article(@Param('slug')s:string,@Query('locale')l='tr'){return this.svc.publicArticle(s,l)}@Post('articles/:id/feedback')feedback(@Param('id')id:string,@Body()b:any){return this.svc.feedback(id,b?.helpful===true)}}
