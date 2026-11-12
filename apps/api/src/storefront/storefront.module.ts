import { Module } from '@nestjs/common';
import { CustomerGuard } from '../common/customer.guard';
import { EmailModule } from '../email/email.module';
import { EDocumentModule } from '../edoc-core/edoc.module';
import { MediaModule } from '../media/media.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { ThemeLiquidRuntimeService } from './theme-liquid-runtime.service';

@Module({
  imports: [EmailModule, EDocumentModule, MediaModule],
  controllers: [StorefrontController],
  providers: [StorefrontService, ThemeLiquidRuntimeService, CustomerGuard],
})
export class StorefrontModule {}
