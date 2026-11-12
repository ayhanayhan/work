import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EDocumentModule } from '../edoc-core/edoc.module';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';
import {MerchantLiveService} from './merchant-live.service';
import {MerchantRegionalService} from './merchant-regional.service';
import { EmailModule } from '../email/email.module';
import {MerchantGrowthController} from './merchant-growth.controller';
import {MerchantGrowthService} from './merchant-growth.service';
import {MerchantBlogController} from './merchant-blog.controller';
import {MerchantBlogService} from './merchant-blog.service';
import {MerchantSeoController} from './merchant-seo.controller';
import {MerchantSeoService} from './merchant-seo.service';
import {AdvancedCommerceController} from './advanced-commerce.controller';
import {AdvancedCommerceService} from './advanced-commerce.service';
import {B2BQuoteController} from './b2b-quote.controller';
import {B2BQuoteService} from './b2b-quote.service';
@Module({ imports:[IntegrationsModule,EDocumentModule,EmailModule], controllers: [MerchantController,MerchantGrowthController,MerchantBlogController,MerchantSeoController,AdvancedCommerceController,B2BQuoteController], providers: [MerchantService, MerchantLiveService, MerchantRegionalService, MerchantGrowthService, MerchantBlogService, MerchantSeoService, AdvancedCommerceService, B2BQuoteService, MerchantAuthGuard, TenantGuard, PermissionGuard], exports: [MerchantService,MerchantGrowthService,MerchantBlogService,MerchantSeoService] })
export class MerchantModule {}
