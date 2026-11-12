import { PaymentAdapterRuntimeModule } from '../../payment-adapters/payment-adapter-runtime.module';
import { EmailModule } from '../../email/email.module';
import { EDocumentModule } from '../../edoc-core/edoc.module';
import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { MerchantAuthGuard } from '../../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { PaymentProvidersController } from './stripe-payment.controller';
import { PaymentProvidersService } from './stripe-payment.service';

@Module({
  imports:[IntegrationsModule,PaymentAdapterRuntimeModule,EmailModule,EDocumentModule],
  controllers:[PaymentProvidersController],
  providers:[PaymentProvidersService,MerchantAuthGuard,TenantGuard,PermissionGuard],
  exports:[PaymentProvidersService],
})
export class StripePaymentModule {}
