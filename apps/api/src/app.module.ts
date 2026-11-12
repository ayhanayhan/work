import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { MerchantAuthModule } from './merchant-auth/merchant-auth.module';
import { SuperAdminAuthModule } from './superadmin-auth/superadmin-auth.module';
import { MerchantModule } from './merchant/merchant.module';
import { StorefrontModule } from './storefront/storefront.module';
import { CheckoutSessionModule } from './checkout-session/checkout-session.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { SupportModule } from './support/support.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RateLimitGuard } from './common/rate-limit.guard';
import { AuditInterceptor } from './common/audit.interceptor';
import { MediaModule } from './media/media.module';
import { CacheModule } from './cache/cache.module';
import { AiModule } from './ai/ai.module';
import { AppsModule } from './apps/apps.module';
import { PlatformModule } from './platform/platform.module';
import { BillingModule } from './billing/billing.module';
import { SystemModule } from './system/system.module';
import { CustomerSocialAuthModule } from './customer-social-auth/customer-social-auth.module';
import { ShippingModule } from './shipping/shipping.module';
import { AppAuthModule } from './app-auth/app-auth.module';
import { ExtensionsModule } from './extensions/extensions.module';
import { AppBillingModule } from './app-billing/app-billing.module';
import { DeveloperPlatformModule } from './developer-platform/developer-platform.module';
import { OperationsWorkerModule } from './operations-worker/operations-worker.module';
import {BackgroundJobsModule} from './background-jobs/background-jobs.module';
import { EmailModule } from './email/email.module';
import { TenantPlacementModule } from './tenant-placement/tenant-placement.module';
import { CellRoutingModule } from './cell-routing/cell-routing.module';
import { CellRoutingMiddleware } from './cell-routing/cell-routing.middleware';
import { ObservabilityModule } from './observability/observability.module';
import { ObservabilityInterceptor } from './observability/observability.interceptor';
import { PaymentProvidersModule } from './payment-providers/payment-providers.module';
import { HelpModule } from './help/help.module';
import { BuiltinAppsModule } from './builtin-apps/builtin-apps.module';

const jwtSecret = process.env.JWT_SECRET || 'dev-only-secret-change-in-production';

@Module({
  imports: [
    PrismaModule,
    ObservabilityModule,
    TenantPlacementModule,
    CellRoutingModule,
    JwtModule.register({ global: true, secret: jwtSecret, signOptions: { expiresIn: '15m' } }),
    MerchantAuthModule,
    SuperAdminAuthModule,
    MerchantModule,
    StorefrontModule,
    CheckoutSessionModule,
    SuperAdminModule,
    SupportModule,
    IntegrationsModule,
    WebhooksModule,
    MediaModule,
    CacheModule,
    AiModule,
    AppsModule,
    BuiltinAppsModule,
    PlatformModule,
    BillingModule,
    SystemModule,
    CustomerSocialAuthModule,
    ShippingModule,
    AppAuthModule,
    ExtensionsModule,
    AppBillingModule,
    DeveloperPlatformModule,
    BackgroundJobsModule,
    OperationsWorkerModule,
    EmailModule,
    PaymentProvidersModule,
    HelpModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: ObservabilityInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer:MiddlewareConsumer){consumer.apply(CellRoutingMiddleware).forRoutes('*')}
}
