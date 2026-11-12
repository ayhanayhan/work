import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MerchantEmailController, SuperAdminEmailController, PublicEmailController } from './email.controller';
import { AppBillingModule } from '../app-billing/app-billing.module';

@Module({
  imports: [AppBillingModule],
  controllers: [MerchantEmailController, SuperAdminEmailController, PublicEmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
