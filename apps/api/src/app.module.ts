import { Module } from '@nestjs/common';
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

const jwtSecret = process.env.JWT_SECRET || 'dev-only-secret-change-in-production';

@Module({
  imports: [
    PrismaModule,
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
    PlatformModule,
    BillingModule,
    SystemModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
